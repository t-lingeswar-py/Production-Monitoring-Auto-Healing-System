FROM node:22-alpine

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 5000

ENV DASHBOARD_PORT=5000
ENV BACKEND_URL=http://backend:3000
ENV HEALER_URL=http://auto-healer:4000

CMD ["node", "server.js"]
