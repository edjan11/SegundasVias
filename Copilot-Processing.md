# Solicitação do usuário

## Status: APLICAÇÃO WEB PURA (NÃO USA ELECTRON)

**Descoberta crítica**: Usuário confirmou que não usa mais Electron. Tudo é aplicação web TypeScript.

### Arquivos Electron removidos
- ✅ `src/main.ts` - REMOVIDO
- ✅ `src/preload.ts` - REMOVIDO

### Problema raiz identificado

Toda a aplicação está tentando usar `window.api.*` (IPC do Electron) que **não existe mais**:

```typescript
// CÓDIGO PROBLEMÁTICO em src/ui.ts linha 1278
if (window.api && window.api.dbSaveDraft) {
  const res = await window.api.dbSaveDraft({ ... });
} else {
  localStorage.setItem('draft_certidao', JSON.stringify(data)); // ← Fallback
}
```

**Resultado**: Botão "Salvar" sempre cai no `else` e só salva no localStorage, não persiste no servidor/banco.

### Arquivos com referências `window.api` (precisam ser corrigidos)

1. **src/ui.ts** - linhas 1278, 1309, 1349, 1352, 1377
   - `saveDraft()` - tenta `window.api.dbSaveDraft`
   - `includeDraft()` - tenta `window.api.dbSaveDraft`
   - `generateFile()` - tenta `window.api.saveXml/saveJson`

2. **src/acts/nascimento/nascimento.ts** - linhas 446, 447, 515, 516, 925, 930, 931
   - Salvar JSON: `window.api.saveJson`
   - Salvar XML: `window.api.saveXml`
   - Seletor de pastas: `window.api.pickJsonDir/pickXmlDir`

3. **src/acts/casamento/casamento.ts** - várias linhas
4. **src/acts/obito/obito.ts** - várias linhas
5. **src/ui/setupListeners.ts** - linhas 185, 186, 207, 208
6. **src/ui/panels/search-panel.ts** - linhas 164, 166, 167

### Solução necessária

Substituir todas as chamadas `window.api.*` por:

1. **Para persistência (dbSaveDraft)**: 
   - Usar `fetch()` para chamar API do servidor Express
   - Endpoint: `POST /api/registro/save`

2. **Para seleção de pastas (pickJsonDir/pickXmlDir)**:
   - **NA WEB NÃO É POSSÍVEL** escolher pastas do sistema
   - Manter localStorage com config de pastas
   - Usar download do browser (`Blob` + `<a>` download)

3. **Para salvar JSON/XML (saveJson/saveXml)**:
   - Usar download do browser com data de hoje na pasta
   - Manter localStorage para rastrear pastas configuradas

### Tarefas

- [ ] Remover todas as referências `window.api`
- [ ] Implementar API HTTP para persistência no servidor Express
- [ ] Substituir seleção de pastas por localStorage + download
- [ ] Adicionar data automática no nome do arquivo (YYYY-MM-DD)
- [ ] Implementar auto-export JSON/XML usando download do browser
- [ ] Garantir que botão "Salvar" persiste via API HTTP
- [ ] Implementar lógica de visibilidade "Salvar" vs "Incluir" baseado em matrícula

## Nova solicitação (2026-02-03)

- Investigar duplicações relacionadas ao painel de pastas.
- Garantir opção para fixar a pasta de destino de JSON/XML.
- Confirmar/usar a estrutura do painel de pastas com:
   - #json-dir (readonly)
   - #pick-json (Selecionar)
   - #xml-dir (readonly)
   - #pick-xml (Selecionar)
   - #outputDirBadge

## Nova solicitação (2026-02-03) - casamento tipo/regime

- JSON: regime_bens vem como texto (ex.: "COMUNHÃO PARCIAL DE BENS") e deve cair no select corretamente.
- JSON: tipo de casamento (civil/religioso) deve ser inferido pelo dígito 15 da matrícula: 2=civil, 3=religioso.
- XML casamento:
   - pc_301=termo, pc_302=livro, pc_303=folha.
   - pc_320=regime de bens (texto).
   - pc_326=B (civil) e "B AUX" (religioso) como indicador de tipo.
- Verificar se a mesma regra está valendo para o export XML; se não, ajustar.

## Nova solicitação (2026-02-03) - mapeamento completo casamento (UI ⇄ JSON ⇄ XML ⇄ matrícula)

- JSON:
  - Salvar regime como string canônica em certidao.regime_bens (com acento e caixa alta), p.ex. "COMUNHÃO PARCIAL DE BENS".
  - Salvar tipo como certidao.tipo_casamento (padronizar CIVIL/RELIGIOSO ou 2/3 e documentar).
- Mapeamentos (regime):
  - UI P/U/C/L/B/A/I -> JSON canônico -> XML pc_320 (Title Case conforme exemplos).
  - Parsing do XML deve ser case-insensitive e tolerar variações sem acento.
- Mapeamentos (tipo casamento):
  - Matrícula dígito 15: 2=CIVIL, 3=RELIGIOSO.
  - XML pc_326: B=CIVIL, B AUX=RELIGIOSO (normalizar espaços).
  - UI ui.casamento_tipo: 2=CIVIL, 3=RELIGIOSO.
- Precedência:
  - pc_326 manda.
  - Se pc_326 vazio, usar matrícula (se válida).
  - Senão usar UI ou vazio.
  - Conflito pc_326 x matrícula: logar warning com matrícula, pc_326, valor final e regra.
- Import:
  - preencher livro/folha/termo via pc_302/303/301.
  - preencher JSON canônico e UI (regime e tipo) a partir de pc_320/pc_326/matrícula.
  - avisar se matrícula incompleta.
- Export:
  - pc_320 com texto bonito derivado do JSON canônico ou select.
  - pc_326: CIVIL=>B, RELIGIOSO=>B AUX.
  - ui.casamento_tipo="3" força B AUX.
  - confirmar se export já seta pc_326; se não, implementar.
- Testes mínimos:
  - parseTipoCasamentoFromMatricula("11006401551987200002174000047418") => CIVIL.
  - parseTipoCasamentoFromMatricula(inválida) => null/unknown.
  - parseTipoCasamentoFromPc326("B") => CIVIL; ("B AUX") => RELIGIOSO.
  - mapRegimeUiToJson("P") => "COMUNHÃO PARCIAL DE BENS".
  - mapRegimeXmlToUi("Comunhão parcial de bens") => "P".
  - export: ui.casamento_tipo=2 => pc_326=B; ui.casamento_tipo=3 => pc_326=B AUX.

## Plano de ação

1) Mapear duplicações de lógica de pastas (ui.ts, setupListeners.ts, acts/*). ✅
2) Centralizar a lógica de pastas em um módulo compartilhado. ✅
3) Ajustar os acts para usar o módulo compartilhado (remover duplicações locais). ✅
4) Garantir persistência em localStorage com chaves únicas e UI sincronizada. ✅
5) Validar o painel de pastas e a fixação do destino. ☐

## Nova solicitação (2026-02-03) - Módulo Selo Digital (prompt revisado)

- Implementar módulo **independente** em `segundas-vias/selo/` (fora de `src/`), sem acoplar lógica da app.
- Integração: interceptar botão **Imprimir/Gerar PDF** da 2ª via; abrir modal do selo com opções:
  - Imprimir sem selo
  - Gerar selo via guia (ordinária)
  - Gerar selo por isenção (direta)
- Regra central: **não persistir Base64/PNG** do selo; imagem é obtida **stateless** só no print ou no painel.
- Persistir apenas trilha auditável: `numSelo`, `numChavePublica`, `nrControleSelo`, metadados.
- Guia: chamar `guiaPaga` e bloquear se `flgPago=N`; se `S`, chamar `dadosGuia`, listar taxas/selos, permitir usar próximo selo disponível ou consultar selo anterior (somente leitura).
- Isenção: listar isenções via `listarTaxas`; se exigir anexo, coletar arquivo, converter PDF Base64, validar 2MB, enviar `adicionaAnexo` antes de `gerarSelo`.
- Sempre consultar `listarTaxas` e `exibeModelo` (sem mapeamento hardcoded). Campos obrigatórios vêm do modelo; autopreencher apenas como sugestão.
- `nrControleSelo` idempotente e único por taxa.
- Persistência: histórico leve (JSON/local ou storage existente) com campos:
  - `id`, `createdAt`, `certType`, `matricula`, `codCartorio`, `codTaxa`, `codIsencao?`, `numGuia?`,
    `nrControleSelo`, `numSelo`, `numChavePublica`, `nomeRegistrado`, `nomeConjuge?`,
    `nomeSolicitante/assinante?`, `status` (GENERATED/STAMPED/ABORTED), metadados mínimos.
- Painel flutuante estilo GPT ao lado da tela de 2ª via, com busca e filtros (nome, data range, certType, matrícula, numSelo, numChavePublica), lista paginada/virtualizada.
- Itens do histórico: ver detalhes, consultar `seloDigitalAplicado?nrSelo=...` (somente leitura), obter imagem via `exibeImagem` sob demanda.
- Integração no PDF: `exibeImagem` só no momento de montar PDF; passar `sealImageBase64` ao `pdfStampAdapter.ts` (ou `pdfRendererBridge.ts`); após concluir/cancelar, limpar Base64 da memória e atualizar status.
- Modo “stateless” no painel: gerar selo sem imprimir, persistir histórico e permitir “Baixar PNG do selo” via `exibeImagem` on-demand (sem persistir imagem).
- Centralizar HTTP/XML/headers/erros em `seloApiClient.ts` e manter módulos: `taxasService.ts`, `modeloService.ts`, `anexosService.ts`, `geracaoService.ts`, `imagemService.ts`, `recuperacaoService.ts`, `catalogoCertidoes.ts`, `seloModal.ts`, `seloController.ts`, `seloHistoryStore.ts`.
- Garantir compatibilidade com UI atual; módulo só acopla pelo gancho do botão de imprimir e pelo painel flutuante.

## Nova solicitação (2026-02-03) - Módulo Administração > Escreventes

**Objetivo:** Ajustar a área de Administração para um módulo “Escreventes” consistente e auditável.

**Requisitos principais:**
- Cadastro completo de escreventes (dados pessoais mínimos, vínculo com cartório, permissões/roles, identificadores internos).
- Validações fortes e consistência referencial com cartórios (se existir).
- Persistência em JSON local (coleção) com CRUD, busca e paginação.
- Modelagem pronta para migração futura para PostgreSQL (ids estáveis, campos normalizados, timestamps).
- Separar do módulo de selo (admin é separado; selo só consome “quem emitiu”).

**Schema requerido do escrevente:**
- id
- nome
- cpf (opcional)
- matriculaInterna (opcional)
- cartorioId
- cargo/funcao
- ativo
- permissoes
- createdAt
- updatedAt
- audit mínimo

**Entregáveis solicitados:**
- Schema
- Serviços
- UI Admin
- Armazenamento JSON
- Plano de migração para PostgreSQL (tabelas sugeridas e chaves)

## Regra operacional (2026-02-04)

- Fluxo **JSON de nascimento est� congelado**: n�o alterar l�gica JSON sem pedido expl�cito do usu�rio.
- Ajustes atuais devem focar **somente** em XML de nascimento (importa��o/parsing/aplica��o).
