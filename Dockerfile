FROM node:18-slim
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ENV USER_ID=default
CMD ["npm", "run", "start"]