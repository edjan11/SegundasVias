# Documentação do projeto

Esta pasta reúne cópias e um índice dos arquivos de documentação espalhados pelo repositório.

Estrutura inicial:

- `docs/index.md` — índice gerado automaticamente com links para `docs/raw/...` contendo todos os `*.md` copiados.
- `docs/raw/` — cópias automáticas de todos os arquivos `.md` encontrados (preserva estrutura relativa).
- `docs/project/` — relatórios gerais do projeto (MIGRATION-REPORT, QUALITY-REPORT etc.).
- `docs/developer/` — guias para desenvolvedores e instruções úteis.
- `docs/ai/` — rascunhos e resultados do pipeline AI (PDF→MD etc.).
- `docs/tests/` — manuais e documentos relacionados aos testes.
- `docs/agents/` — prompts e agentes (.github/prompts, .github/agents).

Como regenerar (atualizar as cópias):

```bash
# Na raiz do projeto
npm run collect-docs
```

O script `tools/collect-docs.js` copia todos os `*.md` (exceto `node_modules`, `.git`, `docs/`, `dist`, `build`) para `docs/raw/` e reescreve `docs/index.md`.

---

Se quiser que eu mova certos documentos do `docs/raw` para subpastas específicas (`project`, `developer`, `ai`, etc.), diga quais categorias prefere e eu faço a organização final (sem deletar os originais).
