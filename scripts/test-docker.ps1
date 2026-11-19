# Ejecuta lint y pruebas automatizadas DENTRO de Docker (Windows PowerShell).
# Uso: powershell -ExecutionPolicy Bypass -File scripts\test-docker.ps1
$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')

function Invoke-Paso($descripcion, [scriptblock]$accion) {
  Write-Host "==> $descripcion" -ForegroundColor Cyan
  & $accion
  if ($LASTEXITCODE -ne 0) { throw "Falló: $descripcion" }
}

Invoke-Paso 'Levantando MySQL' { docker compose up -d db }
Invoke-Paso 'Construyendo imagen de pruebas del backend' { docker compose --profile test build backend-test }
Invoke-Paso 'Backend: lint + pruebas' { docker compose --profile test run --rm backend-test sh -c "npm run lint && npm run format:check && npm run test:cov" }
Invoke-Paso 'Frontend: construyendo imagen de pruebas' { docker build --target test -t autoventas-frontend-test ./frontend }
Invoke-Paso 'Frontend: pruebas unitarias' { docker run --rm autoventas-frontend-test }
Write-Host '==> Todas las pruebas finalizaron correctamente.' -ForegroundColor Green
