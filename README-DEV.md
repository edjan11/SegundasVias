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
npm run ui:bundle      # gera os bundles em ui/js (agora também compila Tailwind via `tailwind:build`)
npm run ui:bundle:watch# bundle em modo watch
npm run tailwind:build  # gera ui/css/tailwind.css a partir de src/tailwind.css
```

Qualidade e análise:

```bash
npm run format         # formata com prettier
npm run lint           # roda eslint
npm run lint:fix       # tenta corrigir lint automaticamente
npm run ci:quality     # pipeline local: format + lint:fix + prune + depcheck + bundle:analyze
```

Testes:

- Existe um teste inicial para o parser `parseIrmaos` e `npm test` foi atualizado para executar `npm run test:parse-irmaos` (compila e executa o teste).
- Recomendo adicionar testes para `src/shared/validators/*` e outras funções puras (ex: `buildNascimentoPdfHtmlTJ`) em seguida. Execute `npm test` depois dos builds (ou `npm run test:parse-irmaos`).

## Notas de migração (resumo)

- `setupActSelect` consolidado em `src/ui/setup-ui.ts` e removidas duplicatas.
- Templates de impressão em `src/prints/` geram HTML pronto para conversão em PDF; revisar sanitização antes de usar em produção.
- Preferir `src/` como fonte canônica e evitar editar arquivos em `ui/js` gerados por bundler.

## Auto salvar JSON/XML (por dia)

- O toolbar base possui os botões Incluir Assento, Salvar e Auto OFF/ON.
- Quando Auto OFF/ON estiver ativo, ao incluir/salvar um registro o app grava JSON e XML na pasta configurada, dentro de uma subpasta com a data (YYYY-MM-DD).
- No Electron, as pastas configuradas em “Pastas” são usadas; no navegador sem API de arquivos, o fallback é download.

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

### Pré-visualização local da UI (rápido)

Se quiser rodar a UI localmente para validar visuais e interações (ex: `pages/Nascimento2Via.html`):

- Gerar bundles e Tailwind:

```bash
npm run ui:bundle
```

- Rodar servidor local (Node simples):

```bash
npm run serve
# ou para abrir automaticamente no Windows PowerShell
npm run serve:open
```

> Nota: o projeto também inclui um script leve em `scripts/simple-static-server.js` que serve `ui/` em `http://127.0.0.1:4180` sem depender do `live-server`.

---

Se quiser, eu adiciono este `README-DEV.md` ao repositório (commit + push) e abro um PR com uma sugestão de mudança no `README.md` principal para linkar este guia. Quer que eu faça isso agora?