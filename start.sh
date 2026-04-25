#!/bin/bash
set -e

echo "=== GetOrder Starting ==="
echo "PORT=$PORT"

# Run seed (may fail if no DB yet, that's ok)
python seed.py 2>&1 || echo "Seed skipped"

# Start FastAPI backend on internal port 8000
echo "Starting FastAPI on :8000..."
uvicorn app.main:app --host 0.0.0.0 --port 8000 &
sleep 2

# Start Next.js on Railway's $PORT (defaults to 3000 locally)
echo "Starting Next.js on :${PORT:-3000}..."
cd frontend
PORT=${PORT:-3000} HOSTNAME=0.0.0.0 node server.js
