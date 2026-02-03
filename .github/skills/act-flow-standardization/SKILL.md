---
name: act-flow-standardization
description: Padronização do fluxo de atos (nascimento, casamento, óbito). Use quando revisar navegação, responsabilidades de páginas, importação de payloads, roteamento SPA/Base2ViaLayout, ou quando o usuário pedir ciclo comum e escalável entre atos. Aplica regras de arquitetura limpa, responsabilidade única e reutilização de módulos compartilhados.
license: Complete terms in LICENSE.txt
---

# Padronização do Fluxo de Atos (2ª via)

## Quando usar esta skill
- Quando existir inconsistência entre páginas (nascimento/casamento/óbito).
- Quando a navegação estiver alternando entre Base2ViaLayout e páginas legadas.
- Quando a importação não respeitar o ato correto.
- Quando o usuário solicitar padronização, escalabilidade ou limpeza de regras.

## Regras de ciclo comum
1. **SPA primeiro**: o fluxo principal deve ocorrer em Base2ViaLayout + rotas `/2via/{ato}`.
2. **Sem navegação legada**: evitar `*2Via.html` como destino em navegação interna.
3. **Um fluxo por ato**:
   - `layout-router` carrega HTML do ato via `routes/*`.
   - O bundle do ato apenas inicializa UI e listeners específicos.
4. **Detecção de ato unificada**: usar inferência consistente (payload/matrícula) em módulos compartilhados.
5. **Navegação controlada**: mudanças de ato só podem ocorrer por ação do usuário ou por `app:navigate`.

## Pontos de revisão obrigatórios
- URLs de navegação (`window.location`, `app:navigate`, seletores de ato).
- Inferência de tipo (`tipo_registro`, matrícula, estrutura do payload).
- Responsabilidades entre `layout-router`, `routes/*`, `acts/*`.

## Checklist de padronização
- [ ] Links internos apontam para `/2via/{ato}`.
- [ ] Importação deriva ato do payload/matrícula (não “chuta” nascimento).
- [ ] `layout-router` impede troca de ato sem intenção explícita.
- [ ] Páginas legadas só existem para bootstrap/retrocompatibilidade.
- [ ] Cada ato mantém apenas lógica específica; regras comuns ficam em `src/shared/*`.

## Referências
- [src/ui/layout-router.ts](../../src/ui/layout-router.ts)
- [src/ui/payload/apply-payload.ts](../../src/ui/payload/apply-payload.ts)
- [src/shared/act-inference.ts](../../src/shared/act-inference.ts)
