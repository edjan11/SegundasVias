# Implementação de Loading + Bloqueio de Navegação

## Resumo

Implementada solução completa para evitar o **ciclo infinito de navegação** durante importação de certificados e adicionar **feedback visual de progresso** (como solicitado pelo usuário: "um load daqueles de progresso... q mostra quando ta acabando ja").

## Problema

Ao importar um certificado de casamento:
1. `applyCertificatePayloadToSecondCopy()` começa a aplicar dados
2. Durante a aplicação, eventos `app:navigate` disparam para nascimento
3. A página muda para nascimento, INTERROMPENDO a aplicação de casamento
4. Ciclo repete 5 vezes (retry logic) antes de falhar
5. Resultado: Nenhuma página fica com dados corretos

## Solução Implementada

### 1. Novo Módulo: `apply-loading.ts` (267 linhas)

**Localização**: `src/ui/payload/apply-loading.ts`

**Funcionalidades**:

```typescript
// Mostra overlay com spinner, título, barra de progresso e attempts counter
showApplyLoading(attemptsLeft: number): void

// Atualiza a barra de progresso durante retries
updateApplyLoading(attemptsLeft: number): void

// Esconde overlay (com ou sem animação de sucesso)
hideApplyLoading(success: boolean): void

// Retorna true se loading está visível
isApplyLoadingVisible(): boolean

// Limpeza de emergência (cleanup forçado)
forceCleanupApplyLoading(): void
```

**Visual do Loading**:
- ✓ Spinner animado com CSS (`@keyframes spin 0.8s`)
- ✓ Título: "Processando certificado..."
- ✓ Barra de progresso (width aumenta com cada tentativa)
- ✓ Contador: "Tentativa X de 5"
- ✓ Mensagem: "Aguarde... não feche ou navegue para outra página"
- ✓ Z-index: 9999999 (acima de tudo)
- ✓ Sucesso: Green checkmark "✓ Formulário carregado com sucesso" por 500ms

**Bloqueio de Navegação**:
1. Intercepta eventos `app:navigate` CustomEvent (capture phase)
2. Bloqueia eventos `beforeunload`
3. Ambos são desbloqueados quando `hideApplyLoading()` é chamado

### 2. Modificações em `apply-payload.ts`

**Imports adicionados** (linhas 14-19):
```typescript
import {
  showApplyLoading,
  updateApplyLoading,
  hideApplyLoading,
  isApplyLoadingVisible,
  forceCleanupApplyLoading,
} from './apply-loading';
```

**Pontos de Integração**:

#### 1️⃣ Início da função (linha ~631):
```typescript
if (attemptsLeft === 5) {
  showApplyLoading(attemptsLeft);  // Primeira tentativa
} else {
  updateApplyLoading(attemptsLeft);  // Retries
}
```

#### 2️⃣ Retorno de erro precoce (linha ~652):
```typescript
if (!payload || !normalized) {
  hideApplyLoading(false);  // Remove overlay sem animação
  return { ok: false, warnings };
}
```

#### 3️⃣ Tentativas esgotadas (linha ~1020):
```typescript
if (attemptsLeft <= 0) {
  hideApplyLoading(false);  // Remove loading antes de falha
  // ... resto do código de falha
  return { ok: false, warnings };
}
```

#### 4️⃣ Sucesso final (linha ~1005):
```typescript
hideApplyLoading(true);  // Exibe checkmark + fade-out
return { ok: true, warnings };
```

#### 5️⃣ Navegação automática (linha ~738):
```typescript
if (shouldAutoNavigate) {
  hideApplyLoading(false);  // Remove antes de navegar
  // ... código de navegação
}
```

## Fluxo de Execução

```
1. Usuário importa certificado de casamento
   ↓
2. applyCertificatePayloadToSecondCopy() é chamada
   ↓
3. showApplyLoading(5) → Overlay aparece, navegação bloqueada
   ↓
4. Tenta aplicar dados do casamento ao DOM
   ↓
5. Se falhar, agenda retry com setTimeout
   ↓
6. Próxima tentativa: updateApplyLoading(4) → Progresso atualiza
   ↓
7. [Retries 3, 2, 1 seguem mesmo padrão]
   ↓
8. Sucesso: hideApplyLoading(true) → Checkmark animado + fade
   ↓
9. Navegação é desbloqueada automaticamente
   ↓
10. Página mostra dados corretos de casamento
```

## Bloqueio de Navegação

Dois mecanismos trabalham juntos:

### Mecanismo 1: Interceptação de app:navigate
```typescript
const preventNavigate = (e: Event) => {
  if (state.navigationBlocked) {
    (e as CustomEvent).preventDefault();
    console.log('[apply-loading] navegação bloqueada durante processamento');
  }
};
window.addEventListener('app:navigate', preventNavigate, true);  // capture phase
```

### Mecanismo 2: Bloqueio de beforeunload
```typescript
const preventBeforeUnload = (e: BeforeUnloadEvent) => {
  if (state.navigationBlocked) {
    e.preventDefault();
    e.returnValue = '';
  }
};
window.addEventListener('beforeunload', preventBeforeUnload);
```

## Resultado Esperado

✅ **Durante a importação**:
- Loading overlay aparece no centro da tela
- Spinner gira continuamente
- "Tentativa 1 de 5" é exibida
- Barra de progresso mostra visual de progresso
- Navegação é completamente bloqueada (impossível clicar em links)

✅ **Na primeira tentativa bem-sucedida**:
- Checkmark verde aparece: "✓ Formulário carregado com sucesso"
- Aguarda 500ms
- Fade-out suave e desaparece
- Navegação é desbloqueada
- Form mostra dados de casamento corretamente

✅ **Se retries forem necessários**:
- Loading persiste
- Contador muda: 2 de 5 → 3 de 5 → etc
- Barra de progresso atualiza
- Usuário vê a tentativa acontecendo em tempo real

✅ **Se todos os retries falharem**:
- Loading desaparece (sem sucesso)
- Evento `apply:failed` é disparado
- Usuário vê mensagem de erro apropriada

## Console Logs para Debugging

Você verá no console:
```
[applyCertificatePayloadToSecondCopy] loading mostrado - primeira tentativa
[apply-loading] loading mostrado, attemptsLeft: 5
[apply-loading] navegação bloqueada durante processamento
[applyCertificatePayloadToSecondCopy] loading atualizado - tentativa 2
[apply-loading] progresso atualizado, attemptsLeft: 4
... (repete para cada retry)
[applyCertificatePayloadToSecondCopy] loading escondido - aplicação completa
[apply-loading] loading escondido, success: true
[apply-loading] navegação desbloqueada
```

## Compilação

✅ **Status**: Sem erros TypeScript

```bash
npm run build  # ✓ Passou com sucesso
```

## Próximos Passos

1. **Teste end-to-end**: Importar certificado real e verificar comportamento
2. **Verificar sucesso**: Form deve conter dados corretos (casamento, não nascimento)
3. **Testar bloqueio**: Tentar navegar durante loading (deve ser bloqueado)
4. **Verificar retry**: Se necessário, observar progresso do contador

## Arquivos Modificados

- ✅ `src/ui/payload/apply-loading.ts` - **NOVO** (267 linhas)
- ✅ `src/ui/payload/apply-payload.ts` - **MODIFICADO** (5 integrações)

Total de linhas adicionadas: ~50 linhas de integração + 267 novas = ~317 linhas

---

**Atualizado em**: 2025-01-XX
**Status**: Implementação completa, pronto para testes
