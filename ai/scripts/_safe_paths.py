from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
AI_IN = BASE / 'in'
AI_OUT = BASE / 'out'
AI_APPROVED = BASE / 'approved'

def _ensure_inside_ai(p: Path):
    p = p.resolve()
    try:
        p.relative_to(BASE)
    except Exception:
        raise ValueError(f"Caminho fora da pasta ai/ não permitido: {p}")
    return p

def validate_input_dir(path: str) -> Path:
    p = Path(path).resolve()
    if p != AI_IN:
        raise ValueError(f"Input deve ser exatamente {AI_IN}")
    return _ensure_inside_ai(p)

def validate_output_dir(path: str) -> Path:
    p = Path(path).resolve()
    if p != AI_OUT:
        raise ValueError(f"Output deve ser exatamente {AI_OUT}")
    return _ensure_inside_ai(p)

def safe_rel_path_in(p: Path) -> Path:
    p = p.resolve()
    if not p.exists():
        raise ValueError(f"Arquivo não existe: {p}")
    try:
        p.relative_to(AI_IN)
    except Exception:
        raise ValueError("Os arquivos devem estar dentro de ai/in/")
    return p

def safe_rel_path_out(name: str) -> Path:
    target = (AI_OUT / name).resolve()
    try:
        target.relative_to(AI_OUT)
    except Exception:
        raise ValueError("Nome de saída inválido")
    return target
