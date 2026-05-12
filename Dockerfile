# Glunex — single image: FastAPI + React static build
#
# This image does NOT rely on Docker build context for app source. During build we
# clone the public GitHub repo and checkout the deploy commit. That fixes Render
# cases where the context is wrong (e.g. Root Directory set to `backend`) or empty.
#
# Render passes RENDER_GIT_COMMIT as a build arg automatically (see Render docs).
# Local build: docker build -t glunex-webapp --build-arg RENDER_GIT_COMMIT=$(git rev-parse HEAD) .

FROM alpine:3.19 AS fetch
RUN apk add --no-cache git
WORKDIR /src
ARG RENDER_GIT_COMMIT
ENV REPO_URL=https://github.com/Talharehman421/glunex-webap.git
# Full clone so any commit SHA Render passes can be checked out reliably.
RUN set -eux; \
  git clone "${REPO_URL}" repo; \
  cd repo; \
  if [ -n "${RENDER_GIT_COMMIT}" ]; then git checkout "${RENDER_GIT_COMMIT}"; fi

FROM node:20-alpine AS frontend-builder
COPY --from=fetch /src/repo/frontend /frontend
WORKDIR /frontend
RUN npm install && npm run build

FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

COPY --from=fetch /src/repo/backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

RUN python -m nltk.downloader stopwords wordnet omw-1.4

COPY --from=fetch /src/repo/backend/ ./

COPY --from=frontend-builder /frontend/build ./frontend_build

EXPOSE 8000

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
