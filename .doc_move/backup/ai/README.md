# AI Documentation Pipeline (Local & Isolada)

Fluxo local para converter documentação (PDF/DOCX/HTML) em Markdown usando o Docling.

Princípios e isolamento
- Tudo fica dentro de `ai/`.
- **NÃO** altera código da aplicação (src/, ui/, tests/, package.json, tsconfig, etc.).
- Entrada: `ai/in/` → Conversão → Saída: `ai/out/` → Aprovado manualmente: `ai/approved/` (movimento manual obrigatório).

Ambiente Python (venv)
Windows (PowerShell):

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Windows (CMD):

```cmd
python -m venv .venv
.\.venv\Scripts\activate.bat
pip install -r requirements.txt
```

Linux/macOS (bash):

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Instalação do Docling
- O `docling` será instalado dentro do `.venv` com `pip install -r requirements.txt`.

Uso (exemplo)
- Converter todo o diretório `ai/in` para `ai/out` (padrões: `*.pdf,*.docx,*.html`):

```bash
python ai/scripts/convert.py --input ai/in --output ai/out --pattern "*.pdf,*.docx,*.html"
```

- Para processar apenas um arquivo:

```bash
python ai/scripts/convert.py --input ai/in --output ai/out --pattern "meuarquivo.pdf"
```

Regras de segurança do fluxo
- Nada é consumido automaticamente; tudo fica em `ai/out/`.
- Só o que você mover manualmente para `ai/approved/` será considerado aprovado.

Formato de saída
- Para cada arquivo convertido é gerado:
  - `<nome>.md` — o Markdown gerado
  - `<nome>.meta.json` — metadata: arquivo original, timestamp, tamanho, tipo, warnings (se houver)

Logs e erros
- O script continua em caso de erro em um arquivo e reporta um resumo ao final.

--

Se quiser, posso também criar um script opcional para inspeção manual dos `ai/out/` e facilitar o movimento para `ai/approved/`.

Atalho via npm (opcional)
- Você pode usar um `package.json` local em `ai/` para facilitar a execução (comando abaixo assume que ativou o venv):

  ```bash
  cd ai
  npm run docling -- --pattern "*.pdf,*.docx,*.html"
  ```

Scripts de conveniência
- `ai/run_docling.ps1` (Windows PowerShell) e `ai/run_docling.sh` (Linux/macOS) executam o conversor usando o Python do `.venv` quando presente, ou caem para o `python` do sistema com um aviso.

Observação: importe/instale o Docling apenas dentro do venv em `ai/.venv` (ver seção anterior). Nada é executado automaticamente — o comando acima processa somente `ai/in/` e gera resultados em `ai/out/`.
