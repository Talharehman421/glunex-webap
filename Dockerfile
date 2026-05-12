# Build from repository root (not from backend/).
# Render: Root Directory must be empty; Dockerfile Path = Dockerfile
#
# docker build -t glunex-webapp .

FROM node:20-alpine AS frontend-builder

WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

RUN python -m nltk.downloader stopwords wordnet omw-1.4

COPY backend/ ./

COPY --from=frontend-builder /frontend/build ./frontend_build

EXPOSE 8000

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
