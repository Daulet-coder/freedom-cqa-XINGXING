#!/bin/zsh
set -e
cd "$(dirname "$0")"
mkdir -p work
export OLLAMA_MODELS="$PWD/models/ollama"
export OLLAMA_HOST=127.0.0.1:11434
export OLLAMA_NO_CLOUD=1
OLLAMA_BIN="$(command -v ollama || true)"
if [[ -z "$OLLAMA_BIN" && -x work/runtime/ollama/ollama ]]; then OLLAMA_BIN="$PWD/work/runtime/ollama/ollama"; fi
if [[ -z "$OLLAMA_BIN" ]]; then
  printf 'Установите Ollama с https://ollama.com/download/mac или brew install ollama\n'
  exit 1
fi
if ! curl -fsS http://127.0.0.1:11434/api/version >/dev/null 2>&1; then
  "$OLLAMA_BIN" serve >work/ollama.log 2>&1 &
  for i in {1..30}; do curl -fsS http://127.0.0.1:11434/api/version >/dev/null 2>&1 && break; sleep 1; done
fi
if ! curl -fsS http://127.0.0.1:11434/api/version >/dev/null 2>&1; then
  printf 'Ollama не запустилась. Откройте work/ollama.log для причины ошибки.\n'
  exit 1
fi
MODEL="${CQA_OLLAMA_MODEL:-hf.co/unsloth/Qwen3.5-9B-MTP-GGUF:Q4_K_M}"
"$OLLAMA_BIN" pull "$MODEL"
if [[ ! -x .venv-model-mac/bin/python ]]; then
  PYTHON_BIN="${CQA_MAC_PYTHON:-$(command -v python3.12 || true)}"
  if [[ -z "$PYTHON_BIN" && -x /Users/daulet/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 ]]; then
    PYTHON_BIN=/Users/daulet/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3
  fi
  if [[ -z "$PYTHON_BIN" ]]; then printf 'Нужен Python 3.12. Укажите путь через CQA_MAC_PYTHON.\n'; exit 1; fi
  "$PYTHON_BIN" -m venv .venv-model-mac
  .venv-model-mac/bin/python -m pip install -r model_service/requirements-mac431-lock.txt
fi
exec .venv-model-mac/bin/python model_service/ollama431_service.py --port 9001
