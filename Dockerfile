# Serve o site estático com nginx
FROM nginx:alpine

# Copia os arquivos do site para o diretório servido pelo nginx
COPY . /usr/share/nginx/html

# nginx escuta na porta 80 (configure a porta 80 no painel de domínios)
EXPOSE 80
