FROM node:18.17.1-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libgbm1 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxshmfence1 \
    libxrandr2 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV NODE_ENV=production
ENV DISABLE_GPU=1
ENV CHROMIUM_FLAGS="--no-sandbox --disable-setuid-sandbox --disable-dev-shm-usage --single-process"

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --prefer-offline --no-audit --progress=false

COPY . .

RUN chown -R node:node /app
USER node

EXPOSE 3000

CMD ["node", "src/index.js"]
