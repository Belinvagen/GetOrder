#!/bin/bash
set -e

# Run seed to initialize DB if needed
python seed.py 2>/dev/null || true

# Start FastAPI backend (background)
uvicorn app.main:app --host 0.0.0.0 --port 8000 &

# Start Next.js standalone server (foreground)
cd frontend-standalone/frontend
PORT=3000 HOSTNAME=0.0.0.0 node ../server.js
