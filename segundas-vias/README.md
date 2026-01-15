# Segundas Vias (painel local)

App Electron separado para gerar e exportar 2ª vias em JSON/XML, com atalho na bandeja do sistema.

## Rodar

```bash
npm install
npm start         # compila TS e abre o Electron
```

## O que vem pronto
- Bandeja com opções de abrir painel, sempre no topo e sair.
- Painel flutuante com campos para colar dados brutos, pré-visualizar JSON/XML e salvar arquivos na pasta local (configurável).
- Persistência simples da pasta de saída (em `userData`).

## Próximos passos sugeridos
- Ajustar o parser de entrada conforme o formato gerado pelos scripts Tampermonkey.
- Personalizar o layout/cores/ícones.
- Adicionar atalhos globais se quiser abrir/ocultar via teclado.
