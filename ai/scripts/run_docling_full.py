#!/usr/bin/env python3
"""Run a single-file Docling 'full' conversion using DocumentConverter.

This script tries multiple programmatic strategies to invoke Docling:
  1. Use docling.document_converter.DocumentConverter.convert directly.
  2. If not available, try to find and call console entry points from docling_core.

It writes:
  - <basename>.md  (Markdown content)
  - <basename>.meta.json (metadata: original filename, timestamp, warnings, raw result dump)

Usage:
  python run_docling_full.py --input "../in/file.pdf" --output ../out

Note: ensures input is inside ai/in and output inside ai/out for safety.
"""

from __future__ import annotations
import argparse
import json
import sys
import time
from pathlib import Path
import importlib
import importlib.metadata


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


def write_output(stem: str, out_dir: Path, markdown: str | None, meta: dict):
    md_path = out_dir / f"{stem}.md"
    meta_path = out_dir / f"{stem}.meta.json"

    if markdown is not None:
        md_path.write_text(markdown, encoding="utf-8")
    else:
        # Ensure previous md is removed if any and we failed to produce content
        if md_path.exists():
            md_path.unlink()

    meta_path.write_text(json.dumps(meta, indent=2, ensure_ascii=False), encoding="utf-8")
    return md_path, meta_path


def try_document_converter(input_file: str):
    """Attempt to invoke DocumentConverter from docling.document_converter.

    Returns a tuple (markdown_text_or_None, meta_dict)
    """
    try:
        import docling.document_converter as dc
        DocumentConverter = getattr(dc, "DocumentConverter", None)
        if DocumentConverter is None:
            return None, {"error": "DocumentConverter not found in docling.document_converter"}

        conv = DocumentConverter()

        # Inspect signature and try common call patterns
        try:
            # Try simple call first
            res = conv.convert(input_file)
        except TypeError:
            try:
                # Named args variant
                res = conv.convert(input_path=input_file)
            except Exception as ex:
                return None, {"error": "convert invocation failed", "exception": str(ex)}

        # Now extract markdown/text from res (best-effort)
        markdowns = []
        meta = {"raw_result_type": type(res).__name__}

        # If it's a dict-like result
        if isinstance(res, dict):
            # Common patterns: res.get('markdown') or res.get('documents')
            if "markdown" in res and isinstance(res["markdown"], str):
                markdowns.append(res["markdown"])
            if "documents" in res and isinstance(res["documents"], list):
                for d in res["documents"]:
                    if isinstance(d, dict):
                        if "markdown" in d and isinstance(d["markdown"], str):
                            markdowns.append(d["markdown"])
                        elif "text" in d and isinstance(d["text"], str):
                            markdowns.append(d["text"])
        # If it's a list-like result
        elif isinstance(res, (list, tuple)):
            for item in res:
                if isinstance(item, str):
                    markdowns.append(item)
                elif isinstance(item, dict) and "markdown" in item:
                    markdowns.append(item["markdown"])
                elif hasattr(item, "text"):
                    markdowns.append(getattr(item, "text"))
        # If it exposes attributes
        else:
            # Try common attributes
            if hasattr(res, "markdown"):
                markdowns.append(getattr(res, "markdown"))
            elif hasattr(res, "text"):
                markdowns.append(getattr(res, "text"))

        if markdowns:
            return "\n\n---\n\n".join(markdowns), {"info": "extracted markdown from DocumentConverter", "details": meta}

        # Nothing extracted
        return None, {"warning": "No markdown found in DocumentConverter result", "details": meta}

    except Exception as e:
        return None, {"error": "exception while trying DocumentConverter", "exception": str(e)}


def try_ds_generate_docs_cli(input_file: str, out_dir: str):
    """Try to call ds_generate_docs entrypoint function (docling_core) programmatically.
    This is best-effort: we try to find the console script and call it if possible.
    """
    try:
        eps = importlib.metadata.entry_points()
        # For compat with py < 11, use select if available
        if hasattr(eps, "select"):
            scripts = eps.select(group="console_scripts")
        else:
            scripts = [ep for ep in eps.get("console_scripts", [])]

        target = None
        for ep in scripts:
            name = getattr(ep, "name", None) or ep[0]
            if name and "ds_generate_docs" in name:
                target = ep
                break

        if target is None:
            # try direct import
            try:
                mod = importlib.import_module("docling_core.scripts.ds_generate_docs")
                func = getattr(mod, "main", None) or getattr(mod, "generate", None)
                if callable(func):
                    # Call the function with CLI-like args
                    argv = [str(input_file), "-o", str(out_dir)]
                    func(argv)
                    return True, {"info": "called docling_core.scripts.ds_generate_docs"}
            except Exception:
                return False, {"info": "ds_generate_docs not importable"}

        # If we found an entry point, load and call
        if target is not None:
            ep = target
            call = ep.load()
            # Many console scripts accept argv list or parse from sys.argv
            try:
                call([str(input_file), "-o", str(out_dir)])
                return True, {"info": f"invoked entrypoint {ep.name}"}
            except TypeError:
                # maybe it expects no args
                call()
                return True, {"info": f"invoked entrypoint {ep.name} with no args"}
    except Exception as e:
        return False, {"error": str(e)}

    return False, {"info": "no suitable ds_generate_docs entrypoint found"}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, help="Path to input file inside ai/in")
    parser.add_argument("--output", required=True, help="Path to output directory inside ai/out")
    args = parser.parse_args()

    in_path = Path(args.input)
    out_dir = Path(args.output)

    try:
        validate_paths(in_path, out_dir)
    except Exception as e:
        print("Path validation failed:", e)
        sys.exit(2)

    stem = in_path.stem
    started = time.time()

    # 1) Try programmatic DocumentConverter
    print("Trying DocumentConverter...")
    md, meta = try_document_converter(str(in_path))
    meta.update({"input": str(in_path), "started": started, "elapsed_try": time.time() - started})

    if md is not None:
        print("DocumentConverter produced markdown.")
        write_output(stem, out_dir, md, meta)
        print(f"Wrote: {out_dir / (stem + '.md')} and meta JSON")
        sys.exit(0)

    print("DocumentConverter did not produce markdown; details:", meta)

    # 2) Try ds_generate_docs (console script) as fallback
    print("Trying docling_core ds_generate_docs entrypoint...")
    ok, info = try_ds_generate_docs_cli(str(in_path), str(out_dir))
    meta["ds_generate_docs_attempt"] = info

    if ok:
        print("ds_generate_docs was invoked; check output folder for generated files.")
        # We won't attempt to synthesize metadata beyond the info object
        meta.update({"final_status": "ds_generate_docs_invoked", "elapsed_total": time.time() - started})
        # Save meta
        write_output(stem, out_dir, None, meta)
        sys.exit(0)

    print("ds_generate_docs not available or failed; falling back to existing light fallback conversion.")

    # 3) Nothing worked
    meta.update({"final_status": "failed_all_strategies", "elapsed_total": time.time() - started})
    write_output(stem, out_dir, None, meta)
    print("Failed to produce markdown via Docling programmatic paths. See meta JSON for details.")
    sys.exit(3)


if __name__ == "__main__":
    main()
