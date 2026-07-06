# Estágio 1: build da SPA (Vite) — sem segredos, a config entra em runtime
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --no-fund --no-audit
COPY . .
RUN npm run build

# Estágio 2: nginx servindo os estáticos
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
# Gera /config.js na inicialização a partir das variáveis de ambiente do serviço
COPY docker/40-config-js.sh /docker-entrypoint.d/40-config-js.sh
RUN chmod +x /docker-entrypoint.d/40-config-js.sh
EXPOSE 80
# CMD herdado da imagem nginx (nginx -g "daemon off;")
