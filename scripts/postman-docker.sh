#!/usr/bin/env sh
# Ejecuta la colección de Postman con Newman dentro de Docker contra la API levantada.
# Requiere: docker compose up -d   (crea registros nuevos en la base de datos de desarrollo)
set -e
cd "$(dirname "$0")/.."
export MSYS_NO_PATHCONV=1
RAIZ="$(pwd -W 2>/dev/null || pwd)"
docker run --rm --network autoventas-crm_default \
  -v "$RAIZ/tests/postman:/etc/newman" \
  postman/newman:6-alpine run AutoVentas_CRM.postman_collection.json \
  --env-var baseUrl=http://backend:3000
