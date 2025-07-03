# Etapa 1: imagem base com dependências para Puppeteer/Chromium
FROM node:18-slim

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Define diretório de trabalho
WORKDIR /app

# Instala dependências do sistema para Chromium
RUN apt-get update && apt-get install -y \
    chromium \
    wget \
    ca-certificates \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libgdk-pixbuf2.0-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    libgbm-dev \
    libgtk-3-0 \
    libxshmfence-dev \
    libgconf-2-4 \
    libglib2.0-0 \
    --no-install-recommends \
 && apt-get clean \
 && rm -rf /var/lib/apt/lists/*

# Copia os arquivos do projeto
COPY . .

# Instala dependências do projeto
RUN npm install

# Expõe a porta usada pela API
EXPOSE 3000

# Executa a API + WhatsApp monitor
CMD ["npm", "run", "start"]
