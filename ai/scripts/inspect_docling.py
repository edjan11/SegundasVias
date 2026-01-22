import docling, pkgutil
print('docling file:', getattr(docling, '__file__', None))
print('submodules:', [m.name for m in pkgutil.iter_modules(docling.__path__)])
print('has __main__:', hasattr(docling, '__main__'))
