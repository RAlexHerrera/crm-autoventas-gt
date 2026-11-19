# ---------------------------------------------------------------
# Frontend CRM AutoVentas GT — Angular compilado + Nginx (multi-stage)
# ---------------------------------------------------------------
FROM node:22-alpine AS deps
WORKDIR /app
ENV NG_CLI_ANALYTICS=false
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# Etapa de pruebas: lint + pruebas unitarias (Vitest + jsdom).
FROM deps AS test
COPY . .
CMD ["sh", "-c", "npm run lint && npm run format:check && npm test"]

FROM deps AS build
COPY . .
RUN npx ng build --configuration production

# Imagen final: solo los archivos estáticos servidos por Nginx.
FROM nginx:1.28-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/autoventas/browser /usr/share/nginx/html
EXPOSE 80
