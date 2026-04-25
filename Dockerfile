FROM python:3.12-slim
WORKDIR /app

# Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY app/ ./app/
COPY bot/ ./bot/
COPY seed.py .
COPY start.sh .
RUN chmod +x start.sh

CMD ["./start.sh"]
