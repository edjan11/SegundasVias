#!/usr/bin/env python3
"""Lightweight PDF->Markdown converter using pdfplumber and simple heuristics.

Design goals:
- Fast and low-resource (no big ML models)
- Produce readable Markdown with headings/paragraphs
- Safe: only works within ai/in -> ai/out
"""
from __future__ import annotations
import argparse
from pathlib import Path
import pdfplumber
import json
import time


def validate_paths(input_path: Path, output_dir: Path):
    root = Path(__file__).resolve().parents[1]  # ai/
    in_dir = (root / "in").resolve()
    out_dir = (root / "out").resolve()

    if not input_path.resolve().is_file():
        raise FileNotFoundError(f"Input not found: {input_path}")

    if not input_path.resolve().is_relative_to(in_dir):
        raise ValueError("Input file must be inside ai/in")

    if not output_dir.resolve().is_relative_to(out_dir):
        raise ValueError("Output must be inside ai/out")

    output_dir.mkdir(parents=True, exist_ok=True)


def is_heading(line: str) -> bool:
    s = line.strip()
    if not s:
        return False
    words = s.split()
    if len(s) <= 60 and len(words) <= 7 and (s.isupper() or s.istitle() or s.endswith(':')):
        return True
    # heuristic: short line with trailing ':'
    if s.endswith(':') and len(words) <= 8:
        return True
    return False


def extract_markdown_from_pdf(path: Path) -> tuple[str, dict]:
    start = time.time()
    pages = []
    total_chars = 0
    headings_found = 0

    md_lines = []
    with pdfplumber.open(path) as pdf:
        for p_idx, page in enumerate(pdf.pages, start=1):
            text = page.extract_text() or ""
            total_chars += len(text)
            lines = text.splitlines()
            # simple grouping into paragraphs/headers
            buf = []
            for ln in lines:
                ln_stripped = ln.strip()
                if not ln_stripped:
                    # flush buffer as paragraph
                    if buf:
                        paragraph = ' '.join(l.strip() for l in buf)
                        md_lines.append(paragraph)
                        md_lines.append('')
                        buf = []
                    continue
                if is_heading(ln_stripped):
                    # flush buffer
                    if buf:
                        paragraph = ' '.join(l.strip() for l in buf)
                        md_lines.append(paragraph)
                        md_lines.append('')
                        buf = []
                    md_lines.append('## ' + ln_stripped)
                    md_lines.append('')
                    headings_found += 1
                else:
                    buf.append(ln_stripped)
            if buf:
                paragraph = ' '.join(l.strip() for l in buf)
                md_lines.append(paragraph)
                md_lines.append('')

            # Add page break marker for readability
            md_lines.append(f"--- page {p_idx} ---")
            md_lines.append('')

    meta = {
        "pages": len(pdf.pages),
        "chars": total_chars,
        "headings_found": headings_found,
        "elapsed": time.time() - start
    }
    md_text = "\n".join(md_lines).strip() + "\n"
    return md_text, meta


def write_output(stem: str, out_dir: Path, markdown: str | None, meta: dict):
    md_path = out_dir / f"{stem}.md"
    meta_path = out_dir / f"{stem}.meta.json"

    if markdown is not None:
        md_path.write_text(markdown, encoding='utf-8')
    else:
        if md_path.exists():
            md_path.unlink()

    meta_path.write_text(json.dumps(meta, indent=2, ensure_ascii=False), encoding='utf-8')
    return md_path, meta_path


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--input', required=True)
    parser.add_argument('--output', required=True)
    args = parser.parse_args()

    input_path = Path(args.input)
    out_dir = Path(args.output)

    validate_paths(input_path, out_dir)

    stem = input_path.stem

    md, meta = extract_markdown_from_pdf(input_path)
    meta.update({"input": str(input_path)})
    md_path, meta_path = write_output(stem, out_dir, md, meta)

    print(f"Wrote: {md_path} ({md_path.stat().st_size} bytes)")
    print(f"Wrote: {meta_path} ({meta_path.stat().st_size} bytes)")


if __name__ == '__main__':
    main()
