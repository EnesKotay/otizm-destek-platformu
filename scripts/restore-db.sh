#!/bin/sh
set -eu

if [ "$#" -ne 1 ]; then
  echo "Kullanım: restore-db.sh /backups/autism-TARIH.sql.gz.enc" >&2
  exit 2
fi
: "${DB_HOST:?DB_HOST gerekli}"
: "${DB_NAME:?DB_NAME gerekli}"
: "${DB_USERNAME:?DB_USERNAME gerekli}"
: "${DB_PASSWORD:?DB_PASSWORD gerekli}"
: "${BACKUP_ENCRYPTION_PASSWORD:?BACKUP_ENCRYPTION_PASSWORD gerekli}"

export PGPASSWORD="$DB_PASSWORD"
openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -pass env:BACKUP_ENCRYPTION_PASSWORD -in "$1" \
  | gzip -dc \
  | psql --host "$DB_HOST" --username "$DB_USERNAME" --dbname "$DB_NAME" --single-transaction --set ON_ERROR_STOP=on
