#!/usr/bin/env bash
# mvn-java21.sh — Java 21 ile Maven çalıştırır.
# Homebrew Maven Java 25 ile bağlanmış olduğu için,
# Docker içinde Maven kullanarak build yapar.
# Kullanım: ./mvn-java21.sh compile
#            ./mvn-java21.sh clean package -DskipTests

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

docker run --rm \
  -v "$SCRIPT_DIR":/app \
  -v "$HOME/.m2":/root/.m2 \
  -w /app \
  maven:3.9.6-eclipse-temurin-21-alpine \
  mvn "$@"
