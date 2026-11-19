#!/usr/bin/env sh
# Ejecuta lint y pruebas automatizadas DENTRO de Docker.
# Requiere que exista el archivo .env (copie .env.example si no lo tiene).
# Uso: sh scripts/test-docker.sh
set -e
cd "$(dirname "$0")/.."
export MSYS_NO_PATHCONV=1

echo "==> Levantando MySQL (si no está corriendo)..."
docker compose up -d db

echo "==> Backend: lint + pruebas (Jest + Supertest contra MySQL real, base autoventas_test)"
docker compose --profile test build backend-test
docker compose --profile test run --rm backend-test sh -c "npm run lint && npm run format:check && npm run test:cov"

echo "==> Frontend: pruebas unitarias (Vitest) y compilación de producción"
docker build --target test -t autoventas-frontend-test ./frontend
docker run --rm autoventas-frontend-test

echo "==> Todas las pruebas finalizaron correctamente."
