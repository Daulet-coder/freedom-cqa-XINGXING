#!/bin/zsh
set -e
cd "$(dirname "$0")"
if [[ ! -x .venv/bin/python ]]; then
  python3 -m venv .venv
  .venv/bin/python -m pip install -r requirements.txt
fi
printf '\nFreedom CQA → http://127.0.0.1:8000\nAPI → http://127.0.0.1:8000/docs\n\n'
exec .venv/bin/python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
