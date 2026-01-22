#!/usr/bin/env bash
PATTERN=${1:-'*.pdf,*.docx,*.html'}
BASE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$BASE_DIR" || exit 1
if [ -x ".venv/bin/python" ]; then
  .venv/bin/python ./scripts/convert.py --input ./in --output ./out --pattern "$PATTERN"
else
  echo "Aviso: venv não encontrado em .venv. Ative-o com: python3 -m venv .venv; source .venv/bin/activate"
  python3 ./scripts/convert.py --input ./in --output ./out --pattern "$PATTERN"
fi
