"""Download docling models from Hugging Face to ensure all ONNX/pt artifacts exist.

This uses huggingface_hub.snapshot_download to grab the full model repository for ds4sd/docling-models.
"""
from huggingface_hub import snapshot_download
import argparse
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--repo', default='ds4sd/docling-models')
parser.add_argument('--cache_dir', default=None)
args = parser.parse_args()

print('Starting snapshot download for', args.repo)
path = snapshot_download(repo_id=args.repo, repo_type='model', cache_dir=args.cache_dir)
print('Downloaded to', path)
