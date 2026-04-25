#!/bin/bash
set -e

echo "=== GetOrder Starting ==="
echo "PORT=${PORT:-NOT SET}"

# Seed DB (non-critical)
python seed.py 2>&1 || echo "[WARN] Seed failed, continuing..."

# Start Telegram bot in background
echo "Starting Telegram bot..."
python -m bot.main &
BOT_PID=$!
echo "Bot started (PID: $BOT_PID)"

# Run FastAPI on Railway's PORT (foreground)
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
