# Solicitação do usuário

- Remover a duplicação: aparecem 6 botões no topo (N/C/O duplicados). Deve ficar apenas um conjunto.
- Ainda aparecem 6 botões (duplicação com `#ato-switch`). Remover o bloco duplicado e diminuir o tamanho dos botões N/C/O.
- Implementar navegação automática baseada no tipo de ato:
  - nascimento → abrir http://localhost:5000/ui/pages/Base2ViaLayout.html?act=nascimento
  - casamento → abrir http://localhost:5000/ui/pages/Base2ViaLayout.html?act=casamento
  - (manter fluxo estável e sem quebrar os fluxos existentes; importante para importação JSON/XML)
- Implementar botão “Incluir Assento” que salva o registro no banco, considerando dados importados e dados manuais do formulário (estado atual do formulário deve ser persistido corretamente).
- Em ações de importação, inclusão ou salvamento:
  - Verificar se já existe registro com a mesma matrícula no banco.
  - Se existir, abrir modal de comparação campo a campo entre registro atual e importado.
  - Se o importado estiver mais completo, perguntar se deseja complementar automaticamente o registro existente com dados faltantes.
  - Se o existente estiver mais completo, apenas informar que já existe e não atualizar.

# Plano de ação

## 1. Localizar origem do `#ato-switch` duplicado
- Buscar `ato-switch` e `toolbar-left` em HTML/JS para remover a injeção duplicada.

## 2. Remover duplicação
- Remover markup duplicado no HTML ou lógica JS que injeta o segundo conjunto.

## 3. Reduzir tamanho dos botões N/C/O
- Ajustar estilos de `.ato-btn` (padding, tamanho, fonte, altura/largura) no CSS compartilhado.
- Validar que o tamanho reduzido não afeta outros controles.

## 4. Validar
- Conferir se há apenas um conjunto de botões e se o tamanho está menor.

## 5. Restabelecer navegação automática por tipo de ato
- Reativar navegação automática quando o payload for de ato diferente do atual.
- Garantir que a navegação re-enfileire o payload e aplique após o mount.
- Evitar reaproveitamento indevido de estado entre atos.

# Atualizações
- Removida a injeção duplicada de `#ato-switch` em `src/ui/setup-ui.ts`.
- Botões N/C/O reduzidos em `ui/styles/components.css`.
- Build executado com sucesso.
- Restabelecida navegação automática por tipo de ato em `src/ui/payload/apply-payload.ts` e `src/ui/layout-router.ts`.
- Build executado com sucesso após ajustes de navegação.
