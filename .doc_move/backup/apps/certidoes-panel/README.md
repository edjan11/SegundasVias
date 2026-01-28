# Certidoes Panel (2a via)

App isolado para ingestao JSON, geracao de XML, busca e painel de consulta.
Nao altera nenhum codigo existente do projeto principal.

## Estrutura principal
- JSON de entrada: `samples/input/`
- XML referencia: `samples/reference/`
- XML gerado: `out/generated/`
- DB JSON: `storage/db/db.json`
- Mapping: `docs/mapping/`

Atalhos com nomes claros (opcionais):
- `inputsNascimento/inputJsonNascimento.json`
- `inputsNascimento/xmlReferenciaNascimento.xml`
- `inputsCasamento/inputJsonCasamento.json`
- `inputsCasamento/xmlReferenciaCasamento.xml`

## Comandos (backend)
```bash
cd apps/certidoes-panel
npm install
npm run dev
```

## UI (painel lateral)
```bash
cd apps/certidoes-panel/ui
npm install
npm run dev
```

## Testes (inclui golden XML)
```bash
cd apps/certidoes-panel
npm run test:golden
```

## Geracao e comparacao em 1 comando
```bash
cd apps/certidoes-panel
npm run test:golden
```

## API (resumo)
- POST /certidoes
- GET /certidoes
- GET /certidoes/{id}
- GET /certidoes/{id}/xml
- GET /health

Ver detalhes em `docs/api/openapi.yaml`.
