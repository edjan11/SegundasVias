Refactor wrapper and build

O objetivo imediato deste scaffold é permitir a refatoração incremental preservando o comportamento atual.

Como funciona

- `src/infra/vendor/casamento.bundle.js` é um loader que injeta o script original `ui/js/casamento.bundle.js` no runtime para manter comportamento idêntico durante a migração.
- `src/main.js` importa o loader e expõe algumas funções globais no `window.App` para compatibilidade.
- `build.js` usa `esbuild` para empacotar `src/main.js` em `dist/app.bundle.js` com sourcemap.

Passos para gerar o bundle

1. Instalar dependências (no diretório `segundas-vias`):

```powershell
npm install
```

2. Gerar bundle:

```powershell
npm run build
```

3. Build em modo watch:

```powershell
npm run build:watch
```

Testes manuais de equivalência (guia rápido)

- Abra a página que usa `ui/js/casamento.bundle.js` antes do refactor e salve 1 snapshot JSON (exportar). Depois rode a versão empacotada (`dist/app.bundle.js`) e compare os JSONs.
- Campos-chave: CPF, datas, dropdown CNS, matrícula, anotacoes. Critério: JSON idêntico (diferença permitida apenas em espaços ou ordem de chaves).

Próximos passos

- Substituir código embutido de `papaparse` e `cpf-cnpj-validator` pelo import npm, movendo implementações "nosso código" para `src/app`, `src/ui`, `src/domain` etc.
- Extrair funções públicas e garantir `window.App = { ... }` com a API pública.
- Implementar testes automatizados de snapshot.
