Manual equivalence test checklist

1) Antes - versão atual
- Abra a página (local) que carrega `ui/js/casamento.bundle.js`.
- Preencha o formulário com os três cenários: nascimento, casamento, obito (salvar 3 estados JSON usando botão JSON).
- Salve os três JSONs em `tests/baseline/`

2) Depois - versão modular/empacotada
- Execute `npm run build` para gerar `dist/app.bundle.js`.
- Substitua (temporariamente) o script na página para apontar para `dist/app.bundle.js` (ou atualize servidor para servir `dist/app.bundle.js`).
- Abra a mesma página, repita os mesmos preenchimentos e exporte os 3 JSONs.
- Compare `diff -u` (ou deepEqual via Node script) entre `tests/baseline` e `tests/after`.

Critérios de aceite:
- JSONs estritamente idênticos (ou apenas diferenças de espaçamento/ordem de chaves).
- Matrícula (matricula, matricula_dv) idênticos.
- Máscaras/validadores: comportamento idêntico.
- Importação CSV via papaparse: ainda funciona.

Notas:
- Este é um teste manual guiado. Posteriormente podemos automatizar com Playwright ou Puppeteer.
