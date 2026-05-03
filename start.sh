#!/bin/bash
set -e

echo "=== GetOrder Starting ==="
echo "PORT=${PORT:-NOT SET}"

# Seed DB (non-critical)
python seed.py 2>&1 || echo "[WARN] Seed failed, continuing..."

# Run FastAPI (bot starts automatically inside the app via lifespan)
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
