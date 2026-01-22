"""Inspeciona o módulo docling_core.scripts.ds_generate_docs e imprime informações úteis.
"""
import importlib
import inspect

try:
    m = importlib.import_module('docling_core.scripts.ds_generate_docs')
except Exception as e:
    print('IMPORT_ERROR', e)
    raise

print('module:', m)
print('docstring:', (m.__doc__ or '').strip()[:400])
attrs = [n for n in dir(m) if not n.startswith('_')]
print('attrs sample:', attrs[:60])
print('has main:', hasattr(m, 'main'))
if hasattr(m, 'main'):
    try:
        import inspect
        print('main signature:', inspect.signature(m.main))
    except Exception as e:
        print('could not get signature for main:', e)

# Try to see top of source
try:
    src = inspect.getsource(m)
    print('\n--- source snippet (first 80 lines) ---')
    for i, line in enumerate(src.splitlines()[:80], 1):
        print(f"{i:03d}: {line}")
except Exception as e:
    print('could not get source:', e)

print('\nDone')
