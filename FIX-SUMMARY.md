# Correção: Infinite Navigation Loop e Botões N/C/O Não Aparecem

## Problema Reportado

1. **Navegação infinita**: Console mostra centenas de `[layout-router] navigate() called with act: casamento` repetindo
2. **Botões desaparecidos**: Os botões N C O (Nascimento/Casamento/Óbito) não aparecem na primeira carga
3. **Página instável**: Somente após F5 (refresh) a página fica estável

## Root Cause Identificado

**Problema 1: Loop Infinito**

Na aplicação de certificado (apply-payload.ts), quando a navegação automática era disparada:

```typescript
// ANTES (Problemático)
if (shouldAutoNavigate) {
  hideApplyLoading(false);  // ← Desbloqueia navegação PREMATURAMENTE
  window.dispatchEvent(new CustomEvent('app:navigate', { ... }));  // ← Agora pode propagar infinitamente
}
```

O fluxo era:
1. `hideApplyLoading(false)` → `state.navigationBlocked = false`
2. `app:navigate` dispatch → **NÃO é bloqueado** pelo listener capture phase
3. layout-router recebe evento → tenta navegar NOVAMENTE
4. Isso re-dispara mais `app:navigate` eventos
5. **INFINITE LOOP**

**Problema 2: Botões Desaparecidos**

O loading overlay bloqueava indefinidamente após navegação automática porque:
1. Loading era disparado quando certificado começava a ser aplicado
2. Navegação automática ocorria, mas loading persistia
3. Loading nunca era removido até novo mount de rota
4. A rota montava, mas loading ainda bloqueava a renderização dos botões

## Solução Implementada

### 1️⃣ Remove Premature Cleanup (apply-payload.ts)

```typescript
// DEPOIS (Corrigido)
if (shouldAutoNavigate) {
  // NÃO esconder o loading aqui - deixar que persista enquanto navega
  // O loading será automaticamente removido quando a página carregar
  console.debug('[applyCertificatePayloadToSecondCopy] navegação automática em progresso - loading persiste');
  
  window.dispatchEvent(new CustomEvent('app:navigate', { detail: { href: targetUrl } }));
}
```

**O que mudou**:
- ✅ Removido `hideApplyLoading(false)` ANTES da navegação
- ✅ Loading persiste durante navegação (não desbloqueia)
- ✅ Navegação permanece BLOQUEADA durante transição
- ✅ Impede o loop infinito

### 2️⃣ Auto-Cleanup After Route Mount (layout-router.ts)

```typescript
requestAnimationFrame(() => {
  container.classList.remove('loading');
  container.classList.add('loaded');
  
  // ← NOVA: Remover loading da aplicação após navegação automática
  try {
    const hideLoading = (window as any).hideApplyLoading;
    if (typeof hideLoading === 'function') {
      hideLoading(true);
      console.log('[layout-router] hideApplyLoading(true) chamado após navegação completa');
    }
  } catch (err) {
    // Se hideApplyLoading não está disponível, não há loading ativo
  }
});
```

**O que mudou**:
- ✅ Layout-router agora chama `hideApplyLoading(true)` após rota montar
- ✅ Isso remove o overlay quando a página está pronta
- ✅ Loading é removido automaticamente, sem precisar de delay manual

### 3️⃣ Expose Functions Globally (apply-loading.ts)

```typescript
// Expor globalmente para que layout-router possa acessar
(window as any).hideApplyLoading = hideApplyLoading;
(window as any).showApplyLoading = showApplyLoading;
(window as any).updateApplyLoading = updateApplyLoading;
(window as any).isApplyLoadingVisible = isApplyLoadingVisible;
(window as any).forceCleanupApplyLoading = forceCleanupApplyLoading;
```

**O que mudou**:
- ✅ Funções de loading agora acessíveis globalmente
- ✅ layout-router pode chamar hideApplyLoading sem imports
- ✅ TypeScript types atualizadas no Window interface

## Fluxo Corrigido

### Antes (Com Bug)
```
1. Certificado importado
2. showApplyLoading() - bloqueia navegação
3. Dados aplicados ao formulário ✓
4. hideApplyLoading(false) - DESBLOQUEIA navegação
5. app:navigate despachado - NÃO está bloqueado ❌
6. layout-router.navigate() chamado
7. app:navigate gerado NOVAMENTE - NÃO está bloqueado ❌
8. LOOP INFINITO: 5-8 repetindo infinitamente
```

### Depois (Corrigido)
```
1. Certificado importado
2. showApplyLoading() - bloqueia navegação ✓
3. Dados aplicados ao formulário ✓
4. app:navigate despachado - ESTÁ bloqueado ✓
5. layout-router.navigate() chamado - processa normalmente
6. Rota monta com sucesso
7. requestAnimationFrame() executa
8. hideApplyLoading(true) chamado - remove overlay ✓
9. Navegação desbloqueada após nova rota pronta ✓
10. Página renderiza com botões N C O visíveis ✓
```

## Testes Realizados

✅ **Compilação TypeScript**
- 0 erros
- Todas as mudanças sintaxicamente corretas

✅ **Estrutura Code**
- apply-payload.ts: Modificado linha ~738 (removido hideApplyLoading call)
- layout-router.ts: Modificado linha ~145 (adicionado cleanup)
- apply-loading.ts: Modificado final (expor funções globalmente)

## Próximos Passos para Teste

1. **Abrir DevTools (F12)** no navegador onde a página está aberta
2. **Ir para Console**
3. **Importar arquivo CSV** - Usar o arquivo `test-casamento.csv` fornecido
4. **Observar console** para:
   - ✅ NÃO deve haver "navigate() called" repetindo infinitamente
   - ✅ Deve ver: `[layout-router] hideApplyLoading(true) chamado após navegação completa`
   - ✅ Loading deve desaparecer com animação de sucesso
5. **Verificar formulário**:
   - ✅ Botões N C O devem estar visíveis
   - ✅ Dados do casamento devem estar preenchidos
   - ✅ Página deve estar interativa

## Arquivo de Teste

Criado: `test-casamento.csv`

```csv
registro_numero,registro_acervo,registro_folha,registro_termo,registro_livro_numero,registro_tipo,cartorio_codigo,data_registro,nomeCartorio,nomeSolteiroC1,nomeAtualdoC1,nomeSolteiroC2,nomeAtualdoC2,cpfC1,cpfC2,data_nascimento_c1,data_nascimento_c2,uf_naturalidade_c1,uf_naturalidade_c2,cidade_naturalidade_c1,cidade_naturalidade_c2,nome_completo,cpf,data_registro_format
123456,1,1,1,2023,01,123456,2023-06-15,Cartório Teste,SILVA,SILVA,SANTOS,SANTOS,12345678901,98765432101,1990-01-15,1992-03-20,SP,RJ,São Paulo,Rio de Janeiro,TESTE COMPLETO,12345678901,15/06/2023
```

Use este arquivo no formulário para testar o fluxo completo.

## Resumo das Mudanças

| Arquivo | Linhas | Mudança | Impacto |
|---------|--------|---------|---------|
| apply-payload.ts | ~738 | Removeu `hideApplyLoading(false)` | Evita desbloquear navegação prematuramente |
| layout-router.ts | ~145 | Adicionou cleanup de loading | Remove overlay quando rota monta |
| apply-loading.ts | Final | Expôs funções globalmente | Permite layout-router chamar hideApplyLoading |

## Build Status

```bash
> segundas-vias@0.1.0 build
> tsc -p tsconfig.json

✅ SUCCESS - 0 errors, 0 warnings
```

Tudo compilado com sucesso! 🎉
