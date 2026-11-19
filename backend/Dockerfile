# ---------------------------------------------------------------
# API CRM AutoVentas GT — imagen multi-stage (Node.js 22 LTS Alpine)
# ---------------------------------------------------------------
FROM node:22-alpine AS deps
# Desactiva la telemetría de @scarf/scarf (dependencia de swagger-ui-express).
ENV SCARF_ANALYTICS=false
WORKDIR /app
COPY package.json package-lock.json ./
# Solo dependencias de producción para la imagen final.
RUN npm ci --omit=dev --no-audit --no-fund

FROM node:22-alpine AS dev-deps
ENV SCARF_ANALYTICS=false
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# Etapa de pruebas: incluye devDependencies, pruebas y configuración de lint.
FROM dev-deps AS test
WORKDIR /app
COPY . .
ENV NODE_ENV=test
CMD ["npm", "test"]

# Imagen final ligera: sin devDependencies ni pruebas.
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
  CMD wget -qO- http://127.0.0.1:3000/api/salud > /dev/null || exit 1
CMD ["node", "src/server.js"]
