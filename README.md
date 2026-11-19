# CRM AutoVentas GT, S.A.

Sistema CRM (Customer Relationship Management) para una empresa guatemalteca de venta de vehículos nuevos y usados. Permite administrar **clientes, prospectos, oportunidades, inventario de vehículos, cotizaciones y ventas**, con **reportes y dashboard gerencial**, control de acceso por rol y exportación de cotizaciones a PDF.

Proyecto del curso *Ingeniería de Software 2* (Universidad Da Vinci de Guatemala, 2026). Implementa las historias de usuario HU-01 a HU-15. El detalle está en [`docs/MAPEO_HU.md`](docs/MAPEO_HU.md).

| Capa | Tecnología |
|------|------------|
| Frontend | Angular 21 (LTS) + TypeScript, Chart.js, servido con Nginx |
| Backend | Node.js 22 + Express 5, API REST por capas, Zod, JWT, bcrypt, PDFKit |
| Base de datos | MySQL 8.4 |
| Infraestructura | Docker Compose (db, backend, frontend) |

---

## Requisitos

- **Docker Desktop** (Windows/macOS) o Docker Engine + Docker Compose v2 (Linux).
- Puertos libres: **4200** (web), **3000** (API) y **3307** (MySQL). Se pueden cambiar en `.env`.

No hace falta instalar Node.js ni MySQL en el equipo.

## Cómo levantarlo

```bash
docker compose up --build
```

La primera vez tarda unos minutos (descarga imágenes, compila Angular y crea la base de datos). Cuando los tres servicios estén *healthy*:

| Qué | URL |
|-----|-----|
| **Aplicación web** | http://localhost:4200 |
| API REST | http://localhost:3000/api |
| Documentación de la API (Swagger) | http://localhost:3000/api/docs |
| Estado del servicio | http://localhost:3000/api/salud |
| MySQL (Workbench, DBeaver…) | `localhost:3307`, usuario `autoventas_app`, clave en `.env` |

La base de datos **se crea sola** en el primer arranque: `db/init/01_schema.sql` (tablas, llaves foráneas, índices, `UNIQUE` y `CHECK`) y `db/init/02_seed.sql` (datos de ejemplo). Ambos scripts son idempotentes.

Para levantarlo en segundo plano: `docker compose up -d --build`. Para detenerlo: `docker compose down`.

> El archivo `.env` trae **claves de desarrollo** listas para usar. Para otro entorno, copie `.env.example` a `.env` y cambie las claves (en especial `JWT_SECRET`).

## Usuarios de prueba

| Rol | Correo | Contraseña | Puede… |
|-----|--------|------------|--------|
| Administrador | `admin@autoventas.gt` | `Admin123!` | Gestionar usuarios y roles; acceso total |
| Gerente Comercial | `gerente@autoventas.gt` | `Gerente123!` | Ver todo lo comercial, asignar vendedores, inventario, reportes y dashboard |
| Vendedor | `vendedor@autoventas.gt` | `Vendedor123!` | Solo sus clientes, prospectos, oportunidades, cotizaciones y ventas |
| Vendedor | `vendedora2@autoventas.gt` | `Vendedor123!` | (segunda vendedora, para probar el aislamiento entre vendedores) |
| Vendedor | `vendedor3@autoventas.gt` | `Vendedor123!` | (tercer vendedor) |

Los datos de ejemplo son **ficticios**: 18 vehículos (nuevos y usados, con VIN de formato válido), 13 clientes, 12 prospectos, 17 oportunidades en todas las etapas, 11 cotizaciones en todos los estados, 6 ventas y 25 interacciones. Así el dashboard muestra información desde el primer arranque.

## Flujo de uso (resumen)

1. **Prospectos → Nuevo prospecto.** El sistema avisa en vivo si el correo o el teléfono ya existen.
2. Desde el prospecto: **+ Nueva oportunidad** (vehículo de interés, monto, fecha estimada).
3. Desde la oportunidad: **+ Nueva cotización.** Solo se ofrecen vehículos *Disponibles* y los totales con IVA 12 % se ven en vivo.
4. En la cotización: **Marcar como enviada → El cliente aceptó** (los vehículos quedan *Reservados*) **→ Registrar venta**.
5. La venta, en una sola transacción, deja el vehículo en *Vendido*, la oportunidad en *Ganado* y convierte el prospecto en cliente.
6. El gerente ve el **dashboard** actualizado en *Inicio* y los detalles en **Reportes**.

La aplicación incluye una pantalla de **Ayuda** (menú lateral) con esta guía y preguntas frecuentes.

---

## Pruebas

Todas se ejecutan **dentro de Docker**:

```bash
# Backend (lint + formato + 118 pruebas Jest/Supertest contra MySQL real) y frontend (lint + formato + 20 pruebas Vitest)
sh scripts/test-docker.sh
#   en Windows PowerShell:  powershell -ExecutionPolicy Bypass -File scripts\test-docker.ps1

# Con el sistema levantado (docker compose up -d):
sh scripts/postman-docker.sh     # colección Postman con Newman: 77 solicitudes y 103 aserciones
sh scripts/e2e-docker.sh         # flujo completo en navegador (Playwright) con capturas en tests/e2e/capturas/
```

Comandos individuales:

```bash
docker compose --profile test run --rm --build backend-test          # solo pruebas del backend
docker compose --profile test run --rm backend-test npm run test:cov # con cobertura (≈ 83 % de líneas)
docker build --target test -t av-front-test ./frontend && docker run --rm av-front-test
```

| Suite | Qué cubre |
|-------|-----------|
| `backend/tests/api/auth-permisos.test.js` | Login, credenciales inválidas, límite de intentos (429), token vencido o manipulado, rol falsificado en el JWT, permisos por rol, aislamiento del vendedor, usuarios |
| `backend/tests/api/vehiculos.test.js` | VIN único (también en minúsculas o con guiones), VIN inválido, filtros, inventario, disponibilidad |
| `backend/tests/api/clientes-prospectos.test.js` | Clientes, DPI, historial, duplicados de prospectos, asignación, conversión, etapas del embudo |
| `backend/tests/api/cotizaciones.test.js` | Cálculo de subtotal, descuentos, IVA y total; correlativo único con 6 solicitudes en paralelo; rechazo de vehículos no disponibles; estados; PDF |
| `backend/tests/api/ventas.test.js` | Venta, **venta duplicada**, **concurrencia** (201 y 409), **rollback total** con falla simulada, conversión del prospecto |
| `backend/tests/api/reportes.test.js` | Dashboard, reportes y panel del vendedor |
| `backend/tests/unit/*` | Cálculos monetarios y validación de VIN |
| `frontend/src/**/*.spec.ts` | AuthService, guards, interceptor HTTP, formatos (Q, fechas) y vista previa de totales |
| `tests/postman/` | Todos los endpoints con casos de error (se regenera con `node tests/postman/generar-coleccion.js`) |
| `tests/e2e/flujo-completo.mjs` | Login, duplicado, prospecto, oportunidad, cotización, aceptación, venta y dashboard; vista de celular |

Las pruebas del backend usan una base **separada** (`autoventas_test`) que se recrea desde `db/init` en cada archivo de pruebas. Nunca tocan los datos de la aplicación.

### Calidad e integración continua

- **ESLint + Prettier** en ambos proyectos (`npm run lint`, `npm run format:check`).
- **GitHub Actions** (`.github/workflows/ci.yml`): lint, formato, pruebas del backend con MySQL, pruebas y build del frontend, build de imágenes Docker y análisis SonarQube (se activa al definir los secretos `SONAR_TOKEN` y `SONAR_HOST_URL`).
- **SonarQube / SonarCloud**: configuración en `sonar-project.properties` (usa la cobertura `backend/coverage/lcov.info`).

---

## Estructura de carpetas

```
.
├── docker-compose.yml          # db + backend + frontend (+ backend-test con perfil "test")
├── .env / .env.example         # variables de entorno (sin credenciales en el código)
├── db/init/
│   ├── 01_schema.sql           # esquema completo (FK, índices, UNIQUE, CHECK)
│   └── 02_seed.sql             # datos de ejemplo ficticios
├── backend/                    # API REST (Node.js + Express)
│   ├── Dockerfile              # multi-stage: deps → test → runtime
│   ├── src/
│   │   ├── app.js / server.js
│   │   ├── config/             # variables de entorno
│   │   ├── db/                 # pool MySQL y helper de transacciones
│   │   ├── middleware/         # autenticación JWT, autorización por rol, validación, errores
│   │   ├── utils/              # cálculos (IVA), correlativos, VIN, paginación
│   │   ├── docs/openapi.js     # especificación Swagger
│   │   └── modules/<módulo>/   # *.routes → *.controller → *.service → *.repository (+ *.schemas)
│   │       auth, usuarios, roles, clientes, interacciones, prospectos,
│   │       oportunidades, vehiculos, cotizaciones (+ PDF), ventas, reportes
│   └── tests/                  # api/ (Supertest), unit/, helpers/
├── frontend/                   # Angular 21
│   ├── Dockerfile, nginx.conf  # build → Nginx con proxy /api → backend
│   └── src/app/
│       ├── core/               # auth, interceptor, guards, API, modelos, catálogos
│       ├── shared/             # pipes (Q, fechas), gráficas, historial, paginación, listados
│       ├── layout/             # estructura con menú por rol
│       └── features/           # login, inicio, clientes, prospectos, oportunidades,
│                               # vehiculos, cotizaciones, ventas, reportes, usuarios, ayuda
├── tests/
│   ├── postman/                # colección Postman + generador
│   └── e2e/                    # prueba de navegador con Playwright
├── scripts/                    # test-docker.(sh|ps1), postman-docker.sh, e2e-docker.sh
├── docs/
│   ├── MAPEO_HU.md             # HU → pantalla, endpoint, prueba y estado
│   ├── DECISIONES.md           # decisiones no cubiertas por los documentos
│   └── fuentes/                # instrucciones del proyecto y documento de la Fase 2
├── sonar-project.properties
└── .github/workflows/ci.yml
```

## Reiniciar la base de datos desde cero

Los scripts de `db/init` solo se ejecutan cuando el volumen de MySQL está vacío. Para borrar **todos** los datos y volver a los de ejemplo:

```bash
docker compose down -v          # -v elimina el volumen mysql_datos
docker compose up --build
```

## Solución de problemas

| Síntoma | Causa probable y solución |
|---------|---------------------------|
| `port is already allocated` (4200, 3000 o 3307) | Otro programa usa el puerto. Cambie `WEB_PUERTO_HOST`, `API_PUERTO_HOST` o `DB_PUERTO_HOST` en `.env`. Si cambia el de la web, actualice también `CORS_ORIGIN`. |
| El backend se queda en «Waiting» | Espera a que MySQL termine de crear la base (healthcheck). La primera vez puede tardar 30 a 60 s. Revise con `docker compose logs db`. |
| Cambié `db/init/*.sql` y no se aplica | Los scripts solo corren con el volumen vacío: `docker compose down -v && docker compose up --build`. |
| `Access denied for user` en el backend | Se cambiaron las claves de `.env` después de crear el volumen. Reinicie la base con `down -v`. |
| La web muestra «No se pudo conectar con el servidor» | El backend no está *healthy*: `docker compose ps` y `docker compose logs backend`. |
| «Demasiados intentos fallidos» al iniciar sesión | Protección contra fuerza bruta (5 intentos cada 15 min por IP). Espere o reinicie el backend: `docker compose restart backend`. |
| «Su sesión expiró» | El token dura 8 horas (`JWT_EXPIRES_IN`). Vuelva a iniciar sesión. |
| En Windows (Git Bash), `scripts/*.sh` falla con rutas como `C:/Program Files/Git/...` | Los scripts ya exportan `MSYS_NO_PATHCONV=1`. Si ejecuta `docker run` a mano, antepóngalo. |
| Docker Desktop no inicia | Habilite WSL 2 o la virtualización en el BIOS y reinicie Docker Desktop. |

## Seguridad (resumen)

- Permisos validados **siempre en el backend** (middleware por rol y filtro por vendedor en los servicios). Un vendedor que solicita un registro ajeno recibe 404.
- JWT con expiración; el rol y el estado activo se leen de la base de datos en cada solicitud.
- Contraseñas con bcrypt; nunca se devuelven en las respuestas.
- Validación de entrada con Zod, consultas parametrizadas, `helmet`, CORS con lista blanca y límite de intentos de inicio de sesión.
- Restricciones en la base de datos (`UNIQUE`, `CHECK`, llaves foráneas) como segunda línea de defensa: VIN único, correlativos únicos, una venta por cotización y un vehículo vendido una sola vez.

Más detalle de reglas y supuestos en [`docs/DECISIONES.md`](docs/DECISIONES.md).
