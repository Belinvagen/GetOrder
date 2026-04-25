#!/bin/bash
set -e

# Railway sets PORT env var — Next.js must listen on it
export NEXT_PORT="${PORT:-3000}"

# Run seed to initialize DB
python seed.py 2>/dev/null || true

# Start FastAPI backend on internal port 8000 (not exposed publicly)
uvicorn app.main:app --host 0.0.0.0 --port 8000 &

# Wait for backend to be ready
sleep 2

# Start Next.js standalone server on Railway's $PORT
cd frontend-standalone/frontend
PORT=$NEXT_PORT HOSTNAME=0.0.0.0 node ../server.js
