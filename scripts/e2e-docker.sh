#!/usr/bin/env sh
# Prueba E2E de la interfaz (Playwright + Chromium) dentro de Docker.
# Requiere el sistema levantado: docker compose up -d
# Las capturas de pantalla quedan en tests/e2e/capturas/
set -e
cd "$(dirname "$0")/.."
export MSYS_NO_PATHCONV=1                 # Git Bash en Windows: no convertir rutas
RAIZ="$(pwd -W 2>/dev/null || pwd)"
docker run --rm --network autoventas-crm_default \
  -e BASE_URL=http://frontend -e CAPTURAS=/e2e/capturas \
  -v "$RAIZ/tests/e2e:/e2e" -w /e2e \
  mcr.microsoft.com/playwright:v1.65.1-noble \
  sh -c "npm install --no-audit --no-fund --silent && node flujo-completo.mjs"
