#!/bin/sh
# Gera /config.js na inicialização do container a partir das variáveis de ambiente.
# Roda automaticamente: o entrypoint da imagem nginx executa os *.sh de /docker-entrypoint.d/.
set -e

cat > /usr/share/nginx/html/config.js <<EOF
window.__ENV__ = {
  VITE_SUPABASE_URL: "${VITE_SUPABASE_URL:-}",
  VITE_SUPABASE_ANON_KEY: "${VITE_SUPABASE_ANON_KEY:-}"
};
EOF

if [ -z "${VITE_SUPABASE_URL:-}" ]; then
  echo "AVISO: VITE_SUPABASE_URL nao definida — o app vai mostrar erro de config."
else
  echo "config.js gerado (VITE_SUPABASE_URL=${VITE_SUPABASE_URL})."
fi
