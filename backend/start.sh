#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
PORT="${BACKEND_PORT:-${PORT:-8006}}"
PYTHON_BIN="${PYTHON_BIN:-}"
if [[ -z "$PYTHON_BIN" ]]; then
  if command -v python3.12 >/dev/null 2>&1; then
    PYTHON_BIN=python3.12
  elif command -v python3.11 >/dev/null 2>&1; then
    PYTHON_BIN=python3.11
  else
    PYTHON_BIN=python3
  fi
fi
if [[ ! -d .venv ]]; then
  "$PYTHON_BIN" -m venv .venv
fi
# shellcheck disable=SC1091
source .venv/bin/activate
pip install -q -r requirements.txt
exec python -m uvicorn server:app --host 0.0.0.0 --port "$PORT" --reload
