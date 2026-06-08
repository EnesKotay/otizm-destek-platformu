#!/usr/bin/env bash
# ── SSL İlk Kurulum ───────────────────────────────────────────────────────────
# Sunucuya ilk deploy öncesinde SADECE BİR KEZ çalıştırılır.
# Çalıştırma: bash scripts/setup-ssl.sh
#
# Gereksinimler:
#   - Docker kurulu ve çalışıyor olmalı
#   - 80 ve 443 portları açık olmalı (güvenlik duvarı)
#   - otizmdestek.com DNS'i bu sunucuyu göstermeli
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

DOMAIN="otizmdestek.com"
EMAIL="admin@otizmdestek.com"
WEBROOT="/var/www/certbot"

echo ">>> Certbot webroot dizini oluşturuluyor..."
mkdir -p "$WEBROOT"

echo ">>> Geçici HTTP-only nginx başlatılıyor (ACME challenge için)..."
docker run -d --name ssl-init-nginx \
  -p 80:80 \
  -v "$WEBROOT:/var/www/certbot" \
  nginx:1.27-alpine \
  sh -c "printf 'server { listen 80; server_name ${DOMAIN} www.${DOMAIN}; location /.well-known/acme-challenge/ { root /var/www/certbot; } location / { return 200 \"ok\"; } }' > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"

sleep 2

echo ">>> Let's Encrypt sertifikası alınıyor..."
docker run --rm \
  -v "/etc/letsencrypt:/etc/letsencrypt" \
  -v "$WEBROOT:/var/www/certbot" \
  certbot/certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    -d "$DOMAIN" \
    -d "www.$DOMAIN"

echo ">>> Geçici nginx durduruluyor..."
docker stop ssl-init-nginx && docker rm ssl-init-nginx

echo ""
echo "✓ SSL sertifikası başarıyla alındı."
echo "  Şimdi deploy edebilirsin:"
echo "  docker compose -f docker-compose.prod.yml up -d --build"
