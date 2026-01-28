# Migração e Estado Atual — Resumo Operacional

Resumo conciso das mudanças, onde procurar e como operar / manter o código migrado.

## 1) Objetivo
- Tornar `src/` a fonte canônica (migrar código das versões geradas `.js` para TypeScript). 
- Preservar a lógica de negócio; criar salvaguardas (archives) e fallbacks antes de remover `.js` gerados.

## 2) O que foi alterado (principais pontos)
- Unificação do handler do seletor de ato: `setupActSelect` agora em [src/ui/setup-ui.ts](src/ui/setup-ui.ts). Aceita `defaultValue?: string`, anexa listeners `change` + `input`, aplica atrasinho e delegação no documento para resistir a substituições de DOM.
- Removidas duplicatas locais de `setupActSelect` em `src/acts/casamento/casamento.ts` e `src/acts/obito/obito.ts`; agora importam a função compartilhada e chamam `setupActSelect('<ato>')`.
- `src/acts/nascimento/nascimento.ts` importou e chama `setupActSelect('nascimento')`.
- Adicionados fallbacks inline simples nas páginas HTML (`ui/pages/*2Via.html`) para forçar navegação se o bundle não estiver ligado.
- Drawer / Painel: delegação global para `drawer-toggle` / `drawer-close` adicionada em [src/ui/setup-ui.ts](src/ui/setup-ui.ts) para garantir abertura/fecho em qualquer aba.
- Configurações: handlers globais de persistência foram adicionados para `settings-save` e `settings-apply` (fallbacks) e inicialização dos checkboxes a partir de `localStorage`.
- Corrigidos pequenos problemas de import/typing em `src/acts/casamento/casamento.ts` (paths e casts) para compilar.
- Templates de impressão: `src/prints/nascimento/printNascimentoTj.ts` contém a função `buildNascimentoPdfHtmlTJ(data, opts?)` que gera o HTML de impressão do TJ; mantido contrato atual (usa o JSON do mapper).

## 3) Arquivos relevantes (mapa rápido)
- UI shared utilities: [src/ui/setup-ui.ts](src/ui/setup-ui.ts)
- Atos: [src/acts/nascimento/nascimento.ts](src/acts/nascimento/nascimento.ts), [src/acts/casamento/casamento.ts](src/acts/casamento/casamento.ts), [src/acts/obito/obito.ts](src/acts/obito/obito.ts)
- Prints: [src/prints/nascimento/printNascimentoTj.ts](src/prints/nascimento/printNascimentoTj.ts)
- Bundles gerados para o app: `ui/js/*.bundle.js` (produzidos por esbuild)
- Páginas estáticas (carregam bundles): `ui/pages/*2Via.html` (Nasc/Cas/Obito)

## 4) Validators e utils — o que fazem e onde estão
- CPF: implementado em [src/shared/validators/cpf.ts](src/shared/validators/cpf.ts)
  - `normalizeCpf(value)` — retorna apenas dígitos normalizados
  - `isValidCpf(digits)` — valida dígitos (algoritmo de CPF)
  - Uso: formatação visual, validação ao blur/input quando `ui.enableCpfValidation` é true
- Nome: `src/shared/validators/name.ts` e `src/shared/nameValidator` (factory)
  - `validateName(value, opts)` — retorna { invalid, warn } / heurísticas
  - `createNameValidator()` — cria repositório / async-ready validator usado para sugestões e checks sofisticados
  - Modos de operação (planejado / implementado parcialmente):
    - `input` = validar durante digitação
    - `blur` = validar ao sair do campo
    - `corrector` / `automations` = (proposta) aplicar correções automáticas ou sugerir; requer mapear regras de substituição
- Date / Time: `src/shared/validators/date.ts`, `src/shared/validators/time.ts` — normalização e validação detalhada
- UI helpers: `src/shared/ui/*` — `fieldState`, `mask`, `admin`, `debug` — controlam estado visual de campos, máscaras e painel admin

## 5) Configurações persistidas (localStorage)
- `ui.enableCpfValidation` = 'true'|'false' (controla aplicação de validação CPF)
- `ui.enableNameValidation` = 'true'|'false' (controla aplicação de validação de nomes)
- `ui.drawerPosition` = 'bottom-right'|'top'|'side'
- `ui.panelInline` = 'true'|'false' (se painel deve estar inline em vez de drawer)
- `ui.nameValidationMode` = 'input'|'blur' (expansível: 'corrector','automations') — controla quando executar validação de nomes

## 6) Estado atual do painel e comportamento esperado
- Estado atual implementado:
  - Painel (`drawer`) está oculto por padrão e pode ser aberto pelo botão `drawer-toggle`.
  - Delegação document-level garante que `drawer-toggle`/`drawer-close` funcionem mesmo se o elemento for recriado.
  - As preferências no modal (`settings-*`) são lidas por default do `localStorage` e salvas/aplicadas por handlers globais.
  - `panel-inline` move o conteúdo para a área `#panel-inline` quando setado.
- Comportamento desejado e recomendações:
  - Manter painel oculto por padrão, mas garantir teste de abertura em todas as `*2Via.html`.
  - Se preferir visível por padrão em todas as páginas, alterar `panelInlineStored` default para `'true'` ou alterar `ui/pages/Base2ViaLayout.html` para renderizar `panel-inline` com conteúdo estático.

## 7) Como o ato-select deve funcionar e como depurar
- `#ato-select` é o dropdown de ato nas páginas. `setupActSelect(default)` prepara o select e adiciona handlers.
- Fallbacks:
  - inserimos um pequeno script inline nas páginas para chamar `window.location.assign(...)` se o bundle não estiver ativo
  - adicionamos delegação no documento para capturar `change`/`input` mesmo se o `select` for recriado
- Debug rápido no navegador:
  - `document.getElementById('ato-select')` — verifica o elemento
  - `(document.getElementById('ato-select')).value` — valor atual
  - Forçar: `document.getElementById('ato-select').value='casamento'; document.getElementById('ato-select').dispatchEvent(new Event('change',{bubbles:true}));`

## 8) Prints / PDF (o que você precisa saber)
- `buildNascimentoPdfHtmlTJ(data, opts?)` (em [src/prints/nascimento/printNascimentoTj.ts](src/prints/nascimento/printNascimentoTj.ts)) gera um HTML autônomo pronto para conversão em PDF.
  - Entrada: o JSON retornado por `mapperHtmlToJson(document)` (não muda contrato).
  - `opts.cssHref` permite apontar para o CSS do Tribunal para visual idêntica.
  - Para gerar/baixar um PDF o fluxo atual carrega `html2pdf` dinamicamente e chama `html2pdf().from(...).save()`; fallback para `window.print()` existe.

## 9) Build / run / bundle
- Recompilar TypeScript:
  - `npm run build` (tsc -p tsconfig.json)
- Bundler (gera `ui/js/*.bundle.js`):
  - `npm run ui:bundle` (usa `esbuild` com entradas dos actos)
- Modo dev com watch: `npm run dev` (executa watch + bundle:watch + serve)

## 10) Tarefas recomendadas / próximos passos
1. Consolidar `nameValidationMode`: definir e implementar 'automations' e 'corrector' (regras e API do `createNameValidator`).
2. Escrever testes unitários para `normalizeCpf` / `isValidCpf` e `validateName`.
3. Consolidar `setupDrawer` em um util único (separar criação/arranjo e apenas chamar no bootstrap do app).
4. Revisar e remover scripts inline antigos após validação completa dos bundles em produção.

### 10.1 Ações realizadas pelo time (lista curta)
- Movi logs de ferramentas para `archive/logs-2026-01-20/` e atualizei `.gitignore`.
- Adicionei `README-DEV.md` com guia de desenvolvimento e comandos úteis.
- Adicionei notas técnicas ao `MIGRATION-REPORT.md` com riscos e recomendações.

### 10.2 Dívida técnica e próximos passos de refactor (priorizados)
- **Trocar `any` por tipos explícitos**: há muitas ocorrências (`@typescript-eslint/no-explicit-any`), começar por `src/shared/nameValidator`, `src/utils.ts`, `src/types/*` e `src/ui/*` (responsável: revisar e criar PRs por área).  
- **Adicionar testes unitários** para `src/shared/validators/*` (CPF, nome, date/time) e `src/prints/*` (verificar geração de HTML sem conteúdo inseguro).  
- **Sanitização de HTML**: revisar `buildNascimentoPdfHtmlTJ` e remover `innerHTML` onde aplicável; adicionar DOMPurify ou gerar apenas texto seguro.  
- **Revisar `tools/`**: auditar scripts de transformação; reduzir geração excessiva de logs; colocar em workflow controlado.

> Observação: comecei com ajustes de tipagem e pequenas correções (commits na branch atual). Recomendo criar issues separadas e priorizá-las para sprints menores.

## 11) Manutenção rápida (como editar)
- Para alterar o comportamento do ato-select: editar [src/ui/setup-ui.ts](src/ui/setup-ui.ts).
- Para mudar validações: editar `src/shared/validators/*` e reincluir no ato correspondente.
- Para mudar texto/labels do painel: editar `ui/pages/*2Via.html` (se forem estáticos) ou o builder dinâmico em `ensureDrawer()` no ato `obito.ts` (que constrói painel dinamicamente se não existir).

## 12) Notas técnicas detalhadas e riscos 🚨

Abaixo há uma explicação ampliada sobre a lógica presente no código, pontos que merecem atenção (riscos, cenários não cobertos) e recomendações práticas para mitigar problemas.

### Resumo da lógica crítica 🔧

- **Seletor de ato (`setupActSelect`)**: inicializa `#ato-select`, aplica `defaultValue?`, anexa handlers `change` + `input` e usa delegação de eventos para tolerar remoções/recriações do DOM.
- **Drawer / Painel**: criação delegada (fallback builder) e handlers globais para `drawer-toggle`/`drawer-close`. `panel-inline` move conteúdo para `#panel-inline` quando ativado.
- **Persistência de preferências**: uso de `localStorage` para flags UI (`ui.enableCpfValidation`, `ui.panelInline`, etc.).
- **Validators**: CPF, nome, data e horário são validados em `src/shared/validators/*`. `createNameValidator` contém heurísticas e modo de operação diferenciados (input/blur).
- **Prints / PDF**: `buildNascimentoPdfHtmlTJ` gera HTML como string (contrato: JSON do `mapperHtmlToJson(document)`), carrega `html2pdf` dinamicamente e chama `html2pdf().from(...).save()`.
- **Build/deploy**: `esbuild` gera `ui/js/*.bundle.js`; páginas estáticas `ui/pages/*2Via.html` incluem fallbacks inline simples para carregamento.

### Pontos de risco / coisas perigosas a revisar ⚠️

- **Geração de HTML por concatenação (prints)**
  - `buildNascimentoPdfHtmlTJ` constrói HTML dinamicamente a partir de dados. Se algum campo do JSON pode conter conteúdo não confiável (por exemplo, inserido por usuário), isso abre risco de XSS ao imprimir ou ao abrir o HTML em contexto com permissões.
  - Mitigação: *sanitizar* conteúdo (usar DOMPurify ou similar) ou construir DOM via text nodes/templates em vez de `innerHTML` indiscriminado.

- **Uso de `innerHTML` / inserção de strings no DOM**
  - Buscar e revisar todas as ocorrências de `innerHTML` e de concatenação de HTML — sempre preferir `textContent`, plantillas seguras, ou sanitização de inputs.

- **LocalStorage para dados possivelmente sensíveis**
  - `localStorage` é acessível a qualquer script no mesmo domínio e persiste entre sessões. Evitar armazenar CPF, RG, números sensíveis, ou minimamente criptografar/evitar armazenamento.

- **Delegação document-level e handlers globais**
  - Delegar eventos ao `document` facilita resistência a DOM recriado, porém pode capturar eventos indesejados ou expor comportamento em páginas onde o elemento não deveria estar ativo. Limitar seletores e validar alvos nos handlers.

- **Type-safety / `any` / scripts**
  - Observação: o uso de `any` e scripts de transformação nos arquivos `tools/` pode esconder erros; revisar e adicionar testes/typing.

## 13) Limpeza de arquivos e localização dos logs 🧹

- **Local:** `archive/logs-2026-01-20/` (os arquivos foram movidos para essa pasta e `archive/` está ignorada pelo `.gitignore`, portanto permanecem locais e não foram commitados).
- **Arquivos movidos:** `.cleaned_files.log`, `autofix_catch.log`, `autofix_empty.log`, `autofix_regex.log`, `convert_any.log`, `convert_src_any.log`, `format.log`, `lintfix*.log`, `replace.log`, `replace_requires.log`.
- **Próxima ação opcional:** apagar estes arquivos do sistema (se não quiser manter o archive), ou copiá-los para um local centralizado fora do repositório (ex: servidor de artefatos).

--
Arquivo gerado automaticamente para consulta rápida. Se quiser, eu gero versão com exemplos de edição (patches) para cada mudança listada.
