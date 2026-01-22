import docling.document_converter as dc
import inspect
print('DocumentConverter members:')
print([name for name in dir(dc.DocumentConverter) if not name.startswith('_')])
print('\nconvert signature:')
print(inspect.signature(dc.DocumentConverter.convert))
print('\nDocumentConverter doc:')
print(dc.DocumentConverter.__doc__)
