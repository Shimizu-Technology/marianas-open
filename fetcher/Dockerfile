FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends chromium xvfb fonts-noto-cjk ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --chown=node:node src ./src
COPY --chown=node:node entrypoint.sh ./entrypoint.sh
USER node
ENV DISPLAY=:99 CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium
ENTRYPOINT ["/bin/sh", "/app/entrypoint.sh"]
