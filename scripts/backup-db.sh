#!/bin/sh
set -eu

: "${DB_HOST:?DB_HOST gerekli}"
: "${DB_NAME:?DB_NAME gerekli}"
: "${DB_USERNAME:?DB_USERNAME gerekli}"
: "${DB_PASSWORD:?DB_PASSWORD gerekli}"
: "${BACKUP_ENCRYPTION_PASSWORD:?BACKUP_ENCRYPTION_PASSWORD gerekli}"

BACKUP_DIR=${BACKUP_DIR:-/backups}
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-30}
mkdir -p "$BACKUP_DIR"

timestamp=$(date -u +%Y%m%dT%H%M%SZ)
temporary="$BACKUP_DIR/.autism-$timestamp.sql.gz.enc.tmp"
destination="$BACKUP_DIR/autism-$timestamp.sql.gz.enc"

export PGPASSWORD="$DB_PASSWORD"
pg_dump --host "$DB_HOST" --username "$DB_USERNAME" --dbname "$DB_NAME" --no-owner --no-privileges \
  | gzip -9 \
  | openssl enc -aes-256-cbc -salt -pbkdf2 -iter 200000 -pass env:BACKUP_ENCRYPTION_PASSWORD -out "$temporary"

test -s "$temporary"
mv "$temporary" "$destination"
find "$BACKUP_DIR" -type f -name 'autism-*.sql.gz.enc' -mtime "+$RETENTION_DAYS" -delete
echo "Şifreli veritabanı yedeği oluşturuldu: $(basename "$destination")"
