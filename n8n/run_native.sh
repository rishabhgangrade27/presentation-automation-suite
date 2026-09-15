#!/usr/bin/env bash
# Runs n8n natively on Windows (no Docker), pointed at the native Presenton
# FastAPI backend proven working in this session.
set -a
N8N_USER_FOLDER="C:\Desktop\Projects\presentation-automation-suite\n8n\.n8n_native_data"
N8N_PORT=5678
N8N_HOST="127.0.0.1"
N8N_PROTOCOL=http
PRESENTON_BASE_URL="http://127.0.0.1:8000"
N8N_RUNNERS_ENABLED=true
GENERIC_TIMEZONE="Asia/Kolkata"
N8N_DIAGNOSTICS_ENABLED=false
# This n8n version blocks $env access inside Code/HTTP-Request expressions by
# default; our workflow reads $env.PRESENTON_BASE_URL, so allow it explicitly.
N8N_BLOCK_ENV_ACCESS_IN_NODE=false
set +a

npx n8n start
