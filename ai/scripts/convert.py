#!/usr/bin/env python3
"""Converter arquivos (PDF/DOCX/HTML) em Markdown usando o `docling` CLI.

Regras:
- Lê somente de ai/in/
- Escreve somente em ai/out/
- Não acessa outras pastas
- Gera .md e .meta.json para cada arquivo processado
"""

import argparse
import subprocess
import json
import time
import mimetypes
from pathlib import Path
try:
    from ._safe_paths import validate_input_dir, validate_output_dir, safe_rel_path_in, safe_rel_path_out
except Exception:
    # Suporte para execução direta: garante que o diretório do script esteja no sys.path
    import sys
    import pathlib

    SCRIPT_DIR = pathlib.Path(__file__).resolve().parent
    if str(SCRIPT_DIR) not in sys.path:
        sys.path.insert(0, str(SCRIPT_DIR))
    from _safe_paths import validate_input_dir, validate_output_dir, safe_rel_path_in, safe_rel_path_out


def iso_now():
    return time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())


import sys

def convert_file(src: Path, out_md: Path):
    # Usar CLI do docling para converter. Faz fallback para "python -m docling" e "python -m docling_core" se necessário.
    tried = []
    proc = None
    stderr = ''
    # tentativa direta (depende de script console estar no PATH)
    try:
        proc = subprocess.run(['docling', 'convert', str(src), '-o', str(out_md)], capture_output=True, text=True)
    except FileNotFoundError:
        # fallback: tentar executar como módulo Python
        for module_name in ('docling', 'docling_core'):
            cmd = [sys.executable, '-m', module_name, 'convert', str(src), '-o', str(out_md)]
            tried.append(' '.join(cmd))
            try:
                proc = subprocess.run(cmd, capture_output=True, text=True)
                break
            except FileNotFoundError:
                proc = None
        if proc is None:
            stderr = f"docling CLI não encontrado. Tentados: {'; '.join(tried)}"
            proc = type('Proc', (), {'returncode': 1, 'stdout': '', 'stderr': stderr})()
    except Exception as e:
        stderr = str(e)
        proc = type('Proc', (), {'returncode': 1, 'stdout': '', 'stderr': stderr})()

    success = proc.returncode == 0 and out_md.exists()
    stdout = proc.stdout or ''
    stderr = proc.stderr or ''

    # Se falhou, tentar fallback leve para PDF (pypdfium2) e HTML (strip)
    warnings = []
    if not success:
        if stderr:
            warnings.append(stderr)
        ext = src.suffix.lower()
        if ext == '.pdf':
            try:
                import pypdfium2 as pdfium
                doc = pdfium.PdfDocument(str(src))
                texts = []
                for i in range(len(doc)):
                    page = doc.get_page(i)
                    tp = page.get_textpage()
                    texts.append(tp.get_text_range())
                    tp.close()
                    page.close()
                doc.close()
                content = '\n\n'.join(t.strip() for t in texts if t and t.strip())
                out_md.write_text(content, encoding='utf-8')
                warnings.append('Fallback: extração de texto via pypdfium2 usada (docling não executável)')
                success = True
            except Exception as e:
                warnings.append(f'Fallback PDF falhou: {e}')
        elif ext in ('.html', '.htm'):
            try:
                # conversão simples: remover tags HTML (fallback mínimo)
                from html.parser import HTMLParser
                class TextExtractor(HTMLParser):
                    def __init__(self):
                        super().__init__()
                        self.parts = []
                    def handle_data(self, data):
                        self.parts.append(data)
                    def get_text(self):
                        return ' '.join(p.strip() for p in self.parts if p.strip())
                html = src.read_text(encoding='utf-8', errors='ignore')
                extractor = TextExtractor()
                extractor.feed(html)
                out_md.write_text(extractor.get_text(), encoding='utf-8')
                warnings.append('Fallback: extração simples de HTML (removidas tags)')
                success = True
            except Exception as e:
                warnings.append(f'Fallback HTML falhou: {e}')

    combined_stderr = '\n'.join([w for w in warnings if w])
    return success, stdout, combined_stderr


def build_meta(src: Path, warnings):
    return {
        'original': str(src.name),
        'timestamp': iso_now(),
        'size': src.stat().st_size,
        'type': mimetypes.guess_type(str(src))[0] or 'application/octet-stream',
        'warnings': warnings,
    }


def main():
    parser = argparse.ArgumentParser(description='Converter documentos em Markdown (isolado em ai/)')
    parser.add_argument('--input', required=True, help='Diretório de input (deve ser ai/in)')
    parser.add_argument('--output', required=True, help='Diretório de output (deve ser ai/out)')
    parser.add_argument('--pattern', default='*.pdf,*.docx,*.html', help='Padrões separados por vírgula')
    args = parser.parse_args()

    try:
        input_dir = validate_input_dir(args.input)
        output_dir = validate_output_dir(args.output)
    except Exception as e:
        print('Erro de validação de diretórios:', e)
        return 2

    patterns = [p.strip() for p in args.pattern.split(',') if p.strip()]
    files = []
    for pat in patterns:
        files.extend(list(input_dir.glob(pat)))

    if not files:
        print('Nenhum arquivo encontrado com o(s) padrão(ões):', patterns)
        return 0

    errors = []
    for f in files:
        try:
            f = safe_rel_path_in(f)
        except Exception as e:
            errors.append((str(f), str(e)))
            continue

        out_md = output_dir / (f.stem + '.md')
        meta_file = output_dir / (f.stem + '.meta.json')

        success, stdout, stderr = convert_file(f, out_md)
        warnings = []
        if stderr:
            warnings.append(stderr.strip())

        meta = build_meta(f, warnings)
        try:
            with open(meta_file, 'w', encoding='utf-8') as mf:
                json.dump(meta, mf, indent=2, ensure_ascii=False)
        except Exception as e:
            errors.append((str(f), f'Erro ao escrever .meta.json: {e}'))
            continue

        if not success:
            errors.append((str(f), stderr or stdout or 'Conversão falhou'))

        print(f'Processado: {f.name} -> {out_md.name} (meta: {meta_file.name})')

    if errors:
        print('\nResumo de erros:')
        for filename, msg in errors:
            print('-', filename, '->', msg)
        return 1

    print('\nConversão concluída com sucesso.')
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
