# Segundas Vias — Developer Guide

Este documento resume como trabalhar neste repositório, onde procurar coisas importantes (migração para `src/`), comandos úteis, e notas operacionais (logs, build e pontos de atenção de segurança).

## Sumário rápido

- Projeto: Painel web + utils para gerar/printar 2ª vias (Nasc/Cas/Obito) e um pequeno app Electron separado para exports.
- Código canônico: `src/` (TypeScript). Gerados/bundles em `ui/js/*.bundle.js`.
- Migration notes: veja `MIGRATION-REPORT.md` para contexto completo das mudanças recentes.

## Estrutura principal

- `src/` — código TypeScript fonte (inclusive `src/ui` `src/acts/*` `src/shared/*` `src/prints/*`).
- `ui/` — páginas estáticas, bundles e assets consumidos pelo UI (conteúdo servível em `live-server`).
- `tools/` — scripts de transformação, fixers e utilitários de migração (usar com cautela).
- `archive/` — arquivos de logs e artefatos arquivados (ignorado por git por padrão).

## Comandos úteis

Instalação e desenvolvimento:

```bash
npm install
npm run dev            # compila em watch + bundle watch + serve em http://127.0.0.1:4180
npm run build          # compila TypeScript
npm run ui:bundle      # gera os bundles em ui/js
npm run ui:bundle:watch# bundle em modo watch
```

Qualidade e análise:

```bash
npm run format         # formata com prettier
npm run lint           # roda eslint
npm run lint:fix       # tenta corrigir lint automaticamente
npm run ci:quality     # pipeline local: format + lint:fix + prune + depcheck + bundle:analyze
```

Testes:

- Atualmente não há testes automatizados (`npm test` retorna "no tests"). Prioridade recomendada: adicionar testes para `src/shared/validators/*` e para funções críticas (ex: `buildNascimentoPdfHtmlTJ`).

## Notas de migração (resumo)

- `setupActSelect` consolidado em `src/ui/setup-ui.ts` e removidas duplicatas.
- Templates de impressão em `src/prints/` geram HTML pronto para conversão em PDF; revisar sanitização antes de usar em produção.
- Preferir `src/` como fonte canônica e evitar editar arquivos em `ui/js` gerados por bundler.

## Regras padrão — importação, inclusão e alteração (todas as 2ª vias)

A importação de dados funciona exclusivamente como um mecanismo de entrada de um payload já estruturado, seja em JSON ou XML. Embora esse payload venha pronto, ele ainda deve passar por verificações básicas antes de ser aplicado, como a validação de formato e uma compatibilidade mínima com o modelo esperado pela aplicação. Essas verificações devem ser leves, servindo apenas para evitar erros de parse ou incompatibilidades grosseiras. Após essa etapa, a importação deve apenas entregar o payload normalizado ao fluxo em que foi acionada, sem assumir qualquer decisão de criação, alteração ou sobrescrita de registros.

A decisão de **incluir uma nova 2ª via** ocorre exclusivamente quando o fluxo é iniciado pelo botão “Incluir 2ª via”. Nesse contexto, o payload importado ou os dados preenchidos manualmente devem seguir o processo de criação, passando pelas regras de verificação de existência de matrícula em todas as camadas do banco de dados. Caso já exista um registro com a mesma matrícula, o sistema deve aplicar a política definida, como bloquear a criação, exibir um aviso ou permitir complementação automática de dados. Se não existir, uma nova 2ª via pode ser criada normalmente.

Já a **alteração de uma 2ª via existente** ocorre quando o usuário abre um registro previamente cadastrado. Nesse cenário, qualquer importação realizada serve apenas como apoio ao preenchimento ou complemento de campos da interface. Ao salvar, o sistema deve executar exclusivamente a atualização do registro atualmente aberto, sobrescrevendo apenas os dados dessa 2ª via específica, sem disparar verificações de duplicidade por matrícula nem acionar lógica de criação. A alteração deve sempre estar vinculada ao identificador interno do registro, garantindo que apenas a 2ª via em edição seja modificada.

Essa separação clara entre importação, inclusão e alteração garante que a importação não se torne uma fonte implícita de criação ou sobrescrita indevida de registros, preservando a integridade dos dados e evitando conflitos entre 2ªs vias distintas que compartilhem a mesma matrícula.

## Logs e arquivos gerados

- Logs de ferramentas e scripts foram movidos para `archive/logs-2026-01-20/` e essa pasta está ignorada pelo git.
- Caso queira limpar o histórico local: apagar a pasta `archive/logs-2026-01-20/` ou movê-la para backups externos.

## Segurança e recomendações rápidas

- Sanitizar qualquer conteúdo que seja inserido em `innerHTML` (usar DOMPurify ou construir nodes via textContent).
- Evitar armazenar informações sensíveis em `localStorage`.
- Revisar os scripts em `tools/` antes de execução automatizada em CI/CD (sempre executar em branch isolada primeiro).
- Use CSP e SRI quando servir recursos externos (se aplicável).

## Fluxo Git sugerido

- Branches por tarefa (`feature/`, `fix/`, `chore/`) e PRs direcionadas para `main`.
- Para trabalhar em outra máquina:

```bash
git clone https://github.com/edjan11/SegundasVias.git
git fetch origin
git checkout -b <branch> origin/<branch>
```

## Como contribuir

- Abra issues com descrições claras e passos para reproduzir.
- Prefira PRs pequenos e documente as mudanças no `MIGRATION-REPORT.md` quando afetarem a arquitetura.

---

Se quiser, eu adiciono este `README-DEV.md` ao repositório (commit + push) e abro um PR com uma sugestão de mudança no `README.md` principal para linkar este guia. Quer que eu faça isso agora?