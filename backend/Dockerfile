FROM node:20-alpine AS frontend-builder

WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy and install Python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Download NLTK data needed for clinical text processing
RUN python -m nltk.downloader stopwords wordnet omw-1.4

# Copy backend application code
COPY backend/ ./

# Copy built frontend into backend image
COPY --from=frontend-builder /frontend/build ./frontend_build

# Expose port
EXPOSE 8000

# Start API on Render-provided port
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]