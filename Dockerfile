FROM node:18-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    chromium \
    fonts-liberation \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libgbm1 \
    libgtk-3-0 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libasound2 \
    libnss3 \
    libxshmfence-dev \
    libgconf-2-4 \
    xdg-utils \
    ca-certificates \
    --no-install-recommends \
 && apt-get clean \
 && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

COPY . .

RUN npm ci --omit=dev

EXPOSE 3000

CMD ["npm", "start"]
