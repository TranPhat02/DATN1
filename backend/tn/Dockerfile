# ============================================
# TN Education Platform — Backend Dockerfile
# ============================================
FROM python:3.12-slim

# Set timezone
ENV TZ=Asia/Ho_Chi_Minh

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for Docker layer caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY src/ ./src/
COPY .env.example .env.example

# Copy Google Drive credentials if present (optional)
COPY cntt-491408-271a3f6050bc.json* /app/credentials/

# Expose port
EXPOSE 8000

# Set Python path so `tn` package is importable
ENV PYTHONPATH=/app/src
ENV PYTHONUNBUFFERED=1

# Start uvicorn
CMD ["uvicorn", "tn.main:app", "--host", "0.0.0.0", "--port", "8000"]
