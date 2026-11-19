-- =====================================================================
-- CRM AutoVentas GT, S.A. — Esquema de base de datos (MySQL 8)
-- Se ejecuta automáticamente en el primer arranque del contenedor `db`
-- (montado en /docker-entrypoint-initdb.d). Es idempotente: usa
-- CREATE TABLE IF NOT EXISTS, por lo que puede volver a ejecutarse.
-- No contiene `USE`: se aplica a la base indicada por MYSQL_DATABASE
-- (o a la base de pruebas cuando lo ejecutan las pruebas automáticas).
-- =====================================================================

SET NAMES utf8mb4;
SET time_zone = '-06:00';

-- ---------------------------------------------------------------------
-- Rol: Administrador, Gerente Comercial, Vendedor
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS roles (
  id            TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  codigo        VARCHAR(20)  NOT NULL,
  nombre        VARCHAR(50)  NOT NULL,
  descripcion   VARCHAR(255) NULL,
  PRIMARY KEY (id),
  CONSTRAINT uq_roles_codigo UNIQUE (codigo),
  CONSTRAINT uq_roles_nombre UNIQUE (nombre),
  CONSTRAINT ck_roles_codigo CHECK (codigo IN ('ADMIN', 'GERENTE', 'VENDEDOR'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- Usuario del sistema (la contraseña se guarda como hash bcrypt)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre          VARCHAR(120) NOT NULL,
  email           VARCHAR(150) NOT NULL,
  password_hash   CHAR(60)     NOT NULL,
  rol_id          TINYINT UNSIGNED NOT NULL,
  activo          TINYINT(1)   NOT NULL DEFAULT 1,
  ultimo_acceso   DATETIME     NULL,
  creado_en       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT uq_usuarios_email UNIQUE (email),
  CONSTRAINT fk_usuarios_rol FOREIGN KEY (rol_id) REFERENCES roles (id),
  CONSTRAINT ck_usuarios_activo CHECK (activo IN (0, 1)),
  INDEX ix_usuarios_rol (rol_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- Prospecto (lead). Puede convertirse en cliente al concretar una venta.
-- `telefono_normalizado` (solo dígitos) se usa para detectar duplicados.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS prospectos (
  id                    INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombres               VARCHAR(80)  NOT NULL,
  apellidos             VARCHAR(80)  NOT NULL,
  telefono              VARCHAR(25)  NOT NULL,
  telefono_normalizado  VARCHAR(20)  NOT NULL,
  email                 VARCHAR(150) NULL,
  fuente                VARCHAR(30)  NOT NULL,
  interes               VARCHAR(255) NULL,
  estado                VARCHAR(20)  NOT NULL DEFAULT 'Nuevo',
  vendedor_id           INT UNSIGNED NOT NULL,
  cliente_id            INT UNSIGNED NULL,
  creado_por            INT UNSIGNED NOT NULL,
  creado_en             DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT uq_prospectos_email UNIQUE (email),
  CONSTRAINT uq_prospectos_telefono UNIQUE (telefono_normalizado),
  CONSTRAINT fk_prospectos_vendedor FOREIGN KEY (vendedor_id) REFERENCES usuarios (id),
  CONSTRAINT fk_prospectos_creador FOREIGN KEY (creado_por) REFERENCES usuarios (id),
  CONSTRAINT ck_prospectos_estado CHECK (estado IN ('Nuevo', 'Contactado', 'Calificado', 'Convertido', 'Descartado')),
  CONSTRAINT ck_prospectos_fuente CHECK (fuente IN ('Sitio web', 'Referido', 'Redes sociales', 'Visita en agencia', 'Llamada', 'Feria')),
  INDEX ix_prospectos_vendedor (vendedor_id),
  INDEX ix_prospectos_estado (estado),
  INDEX ix_prospectos_creado (creado_en)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- Cliente. Clasificación: Nuevo, Regular, Frecuente, VIP, Inactivo.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clientes (
  id                   INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombres              VARCHAR(80)  NOT NULL,
  apellidos            VARCHAR(80)  NOT NULL,
  dpi                  CHAR(13)     NULL,
  nit                  VARCHAR(15)  NOT NULL DEFAULT 'CF',
  telefono             VARCHAR(25)  NOT NULL,
  email                VARCHAR(150) NULL,
  direccion            VARCHAR(255) NULL,
  clasificacion        VARCHAR(15)  NOT NULL DEFAULT 'Nuevo',
  vendedor_id          INT UNSIGNED NOT NULL,
  prospecto_origen_id  INT UNSIGNED NULL,
  creado_en            DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT uq_clientes_dpi UNIQUE (dpi),
  CONSTRAINT uq_clientes_email UNIQUE (email),
  CONSTRAINT uq_clientes_prospecto UNIQUE (prospecto_origen_id),
  CONSTRAINT fk_clientes_vendedor FOREIGN KEY (vendedor_id) REFERENCES usuarios (id),
  CONSTRAINT fk_clientes_prospecto FOREIGN KEY (prospecto_origen_id) REFERENCES prospectos (id),
  CONSTRAINT ck_clientes_clasificacion CHECK (clasificacion IN ('Nuevo', 'Regular', 'Frecuente', 'VIP', 'Inactivo')),
  CONSTRAINT ck_clientes_dpi CHECK (dpi IS NULL OR REGEXP_LIKE(dpi, '^[0-9]{13}$')),
  INDEX ix_clientes_vendedor (vendedor_id),
  INDEX ix_clientes_clasificacion (clasificacion),
  INDEX ix_clientes_nombre (apellidos, nombres)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- La FK prospecto -> cliente se agrega después por la dependencia circular.
SET @fk_existe := (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
                   WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'prospectos'
                     AND CONSTRAINT_NAME = 'fk_prospectos_cliente');
SET @sql := IF(@fk_existe = 0,
  'ALTER TABLE prospectos ADD CONSTRAINT fk_prospectos_cliente FOREIGN KEY (cliente_id) REFERENCES clientes (id)',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ---------------------------------------------------------------------
-- Vehículo. VIN de 17 caracteres (sin I, O ni Q), único.
-- Estados: Disponible, Reservado (cotización aceptada), Vendido.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vehiculos (
  id                     INT UNSIGNED NOT NULL AUTO_INCREMENT,
  vin                    CHAR(17)      NOT NULL,
  marca                  VARCHAR(40)   NOT NULL,
  modelo                 VARCHAR(60)   NOT NULL,
  anio                   SMALLINT UNSIGNED NOT NULL,
  version                VARCHAR(60)   NULL,
  tipo                   VARCHAR(20)   NOT NULL,
  condicion              VARCHAR(10)   NOT NULL,
  color                  VARCHAR(30)   NOT NULL,
  transmision            VARCHAR(15)   NOT NULL,
  combustible            VARCHAR(15)   NOT NULL,
  motor                  VARCHAR(40)   NULL,
  kilometraje            INT UNSIGNED  NOT NULL DEFAULT 0,
  precio                 DECIMAL(12,2) NOT NULL,
  estado                 VARCHAR(12)   NOT NULL DEFAULT 'Disponible',
  reservado_cotizacion_id INT UNSIGNED NULL,
  descripcion            VARCHAR(500)  NULL,
  creado_en              DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT uq_vehiculos_vin UNIQUE (vin),
  CONSTRAINT ck_vehiculos_vin CHECK (REGEXP_LIKE(vin, '^[A-HJ-NPR-Z0-9]{17}$', 'c')),
  CONSTRAINT ck_vehiculos_anio CHECK (anio BETWEEN 1980 AND 2100),
  CONSTRAINT ck_vehiculos_precio CHECK (precio > 0),
  CONSTRAINT ck_vehiculos_estado CHECK (estado IN ('Disponible', 'Reservado', 'Vendido')),
  CONSTRAINT ck_vehiculos_condicion CHECK (condicion IN ('Nuevo', 'Usado')),
  CONSTRAINT ck_vehiculos_tipo CHECK (tipo IN ('Sedán', 'Hatchback', 'SUV', 'Pickup', 'Camioneta', 'Microbús', 'Deportivo')),
  CONSTRAINT ck_vehiculos_transmision CHECK (transmision IN ('Automática', 'Manual')),
  CONSTRAINT ck_vehiculos_combustible CHECK (combustible IN ('Gasolina', 'Diésel', 'Híbrido', 'Eléctrico')),
  INDEX ix_vehiculos_estado (estado),
  INDEX ix_vehiculos_marca_modelo (marca, modelo),
  INDEX ix_vehiculos_precio (precio)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- Oportunidad de negocio (embudo de ventas). Pertenece a un prospecto
-- o a un cliente (al menos uno). Etapas del embudo:
-- Prospección -> Contacto -> Cotización -> Negociación -> Ganado | Perdido
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS oportunidades (
  id                     INT UNSIGNED NOT NULL AUTO_INCREMENT,
  titulo                 VARCHAR(120)  NOT NULL,
  prospecto_id           INT UNSIGNED  NULL,
  cliente_id             INT UNSIGNED  NULL,
  vehiculo_interes_id    INT UNSIGNED  NULL,
  vendedor_id            INT UNSIGNED  NOT NULL,
  etapa                  VARCHAR(15)   NOT NULL DEFAULT 'Prospección',
  monto_estimado         DECIMAL(12,2) NOT NULL DEFAULT 0,
  fecha_cierre_estimada  DATE          NULL,
  motivo_perdida         VARCHAR(255)  NULL,
  cerrada_en             DATETIME      NULL,
  creado_en              DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_oportunidades_prospecto FOREIGN KEY (prospecto_id) REFERENCES prospectos (id),
  CONSTRAINT fk_oportunidades_cliente FOREIGN KEY (cliente_id) REFERENCES clientes (id),
  CONSTRAINT fk_oportunidades_vehiculo FOREIGN KEY (vehiculo_interes_id) REFERENCES vehiculos (id),
  CONSTRAINT fk_oportunidades_vendedor FOREIGN KEY (vendedor_id) REFERENCES usuarios (id),
  CONSTRAINT ck_oportunidades_contacto CHECK (prospecto_id IS NOT NULL OR cliente_id IS NOT NULL),
  CONSTRAINT ck_oportunidades_etapa CHECK (etapa IN ('Prospección', 'Contacto', 'Cotización', 'Negociación', 'Ganado', 'Perdido')),
  CONSTRAINT ck_oportunidades_monto CHECK (monto_estimado >= 0),
  INDEX ix_oportunidades_vendedor (vendedor_id),
  INDEX ix_oportunidades_etapa (etapa),
  INDEX ix_oportunidades_creado (creado_en)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- Interacción (historial de contacto) con un cliente o prospecto.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS interacciones (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  cliente_id      INT UNSIGNED NULL,
  prospecto_id    INT UNSIGNED NULL,
  oportunidad_id  INT UNSIGNED NULL,
  usuario_id      INT UNSIGNED NOT NULL,
  tipo            VARCHAR(20)  NOT NULL,
  descripcion     VARCHAR(1000) NOT NULL,
  fecha           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_interacciones_cliente FOREIGN KEY (cliente_id) REFERENCES clientes (id),
  CONSTRAINT fk_interacciones_prospecto FOREIGN KEY (prospecto_id) REFERENCES prospectos (id),
  CONSTRAINT fk_interacciones_oportunidad FOREIGN KEY (oportunidad_id) REFERENCES oportunidades (id),
  CONSTRAINT fk_interacciones_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id),
  CONSTRAINT ck_interacciones_destino CHECK (cliente_id IS NOT NULL OR prospecto_id IS NOT NULL),
  CONSTRAINT ck_interacciones_tipo CHECK (tipo IN ('Llamada', 'Correo', 'WhatsApp', 'Visita', 'Reunión', 'Prueba de manejo', 'Nota', 'Sistema')),
  INDEX ix_interacciones_cliente (cliente_id, fecha),
  INDEX ix_interacciones_prospecto (prospecto_id, fecha),
  INDEX ix_interacciones_oportunidad (oportunidad_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- Correlativos de documentos (serie + año). Se bloquea la fila con
-- SELECT ... FOR UPDATE para generar números únicos sin huecos por carrera.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS correlativos (
  serie   VARCHAR(10)  NOT NULL,
  anio    SMALLINT UNSIGNED NOT NULL,
  ultimo  INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (serie, anio)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- Cotización. Importes en quetzales. IVA 12 % (supuesto S8).
-- Estados: Borrador, Enviada, Aceptada, Rechazada, Vencida, Convertida.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cotizaciones (
  id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  correlativo      VARCHAR(20)   NOT NULL,
  oportunidad_id   INT UNSIGNED  NOT NULL,
  vendedor_id      INT UNSIGNED  NOT NULL,
  fecha            DATE          NOT NULL,
  vigencia_hasta   DATE          NOT NULL,
  subtotal         DECIMAL(12,2) NOT NULL,
  descuento        DECIMAL(12,2) NOT NULL DEFAULT 0,
  base_imponible   DECIMAL(12,2) NOT NULL,
  iva_tasa         DECIMAL(5,4)  NOT NULL DEFAULT 0.1200,
  iva              DECIMAL(12,2) NOT NULL,
  total            DECIMAL(12,2) NOT NULL,
  estado           VARCHAR(12)   NOT NULL DEFAULT 'Borrador',
  observaciones    VARCHAR(500)  NULL,
  creado_en        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT uq_cotizaciones_correlativo UNIQUE (correlativo),
  CONSTRAINT fk_cotizaciones_oportunidad FOREIGN KEY (oportunidad_id) REFERENCES oportunidades (id),
  CONSTRAINT fk_cotizaciones_vendedor FOREIGN KEY (vendedor_id) REFERENCES usuarios (id),
  CONSTRAINT ck_cotizaciones_estado CHECK (estado IN ('Borrador', 'Enviada', 'Aceptada', 'Rechazada', 'Vencida', 'Convertida')),
  CONSTRAINT ck_cotizaciones_importes CHECK (subtotal >= 0 AND descuento >= 0 AND descuento <= subtotal
                                             AND base_imponible = subtotal - descuento
                                             AND iva >= 0 AND total = base_imponible + iva),
  CONSTRAINT ck_cotizaciones_vigencia CHECK (vigencia_hasta >= fecha),
  INDEX ix_cotizaciones_estado (estado),
  INDEX ix_cotizaciones_vendedor (vendedor_id),
  INDEX ix_cotizaciones_oportunidad (oportunidad_id),
  INDEX ix_cotizaciones_fecha (fecha)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- Detalle de cotización: un vehículo por línea (cada unidad es única).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS detalle_cotizacion (
  id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  cotizacion_id    INT UNSIGNED  NOT NULL,
  vehiculo_id      INT UNSIGNED  NOT NULL,
  precio_unitario  DECIMAL(12,2) NOT NULL,
  descuento        DECIMAL(12,2) NOT NULL DEFAULT 0,
  subtotal         DECIMAL(12,2) NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT uq_detalle_cotizacion_vehiculo UNIQUE (cotizacion_id, vehiculo_id),
  CONSTRAINT fk_detalle_cotizacion FOREIGN KEY (cotizacion_id) REFERENCES cotizaciones (id) ON DELETE CASCADE,
  CONSTRAINT fk_detalle_vehiculo FOREIGN KEY (vehiculo_id) REFERENCES vehiculos (id),
  CONSTRAINT ck_detalle_importes CHECK (precio_unitario > 0 AND descuento >= 0 AND descuento <= precio_unitario
                                        AND subtotal = precio_unitario - descuento),
  INDEX ix_detalle_vehiculo (vehiculo_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- La FK de reserva se agrega aquí porque cotizaciones se crea después de vehiculos.
SET @fk_existe := (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
                   WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'vehiculos'
                     AND CONSTRAINT_NAME = 'fk_vehiculos_reserva');
SET @sql := IF(@fk_existe = 0,
  'ALTER TABLE vehiculos ADD CONSTRAINT fk_vehiculos_reserva FOREIGN KEY (reservado_cotizacion_id) REFERENCES cotizaciones (id)',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ---------------------------------------------------------------------
-- Venta. Una cotización solo puede convertirse en UNA venta (UNIQUE).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ventas (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  correlativo     VARCHAR(20)   NOT NULL,
  cotizacion_id   INT UNSIGNED  NOT NULL,
  cliente_id      INT UNSIGNED  NOT NULL,
  vendedor_id     INT UNSIGNED  NOT NULL,
  fecha           DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  metodo_pago     VARCHAR(20)   NOT NULL,
  total           DECIMAL(12,2) NOT NULL,
  observaciones   VARCHAR(500)  NULL,
  registrado_por  INT UNSIGNED  NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT uq_ventas_correlativo UNIQUE (correlativo),
  CONSTRAINT uq_ventas_cotizacion UNIQUE (cotizacion_id),
  CONSTRAINT fk_ventas_cotizacion FOREIGN KEY (cotizacion_id) REFERENCES cotizaciones (id),
  CONSTRAINT fk_ventas_cliente FOREIGN KEY (cliente_id) REFERENCES clientes (id),
  CONSTRAINT fk_ventas_vendedor FOREIGN KEY (vendedor_id) REFERENCES usuarios (id),
  CONSTRAINT fk_ventas_registrador FOREIGN KEY (registrado_por) REFERENCES usuarios (id),
  CONSTRAINT ck_ventas_metodo CHECK (metodo_pago IN ('Contado', 'Financiamiento', 'Transferencia', 'Cheque')),
  CONSTRAINT ck_ventas_total CHECK (total > 0),
  INDEX ix_ventas_fecha (fecha),
  INDEX ix_ventas_vendedor (vendedor_id),
  INDEX ix_ventas_cliente (cliente_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- Vehículos vendidos en cada venta. UNIQUE(vehiculo_id) garantiza a nivel
-- de base de datos que un mismo vehículo nunca se venda dos veces.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS venta_vehiculos (
  venta_id     INT UNSIGNED  NOT NULL,
  vehiculo_id  INT UNSIGNED  NOT NULL,
  precio_final DECIMAL(12,2) NOT NULL,
  PRIMARY KEY (venta_id, vehiculo_id),
  CONSTRAINT uq_venta_vehiculos_vehiculo UNIQUE (vehiculo_id),
  CONSTRAINT fk_venta_vehiculos_venta FOREIGN KEY (venta_id) REFERENCES ventas (id),
  CONSTRAINT fk_venta_vehiculos_vehiculo FOREIGN KEY (vehiculo_id) REFERENCES vehiculos (id),
  CONSTRAINT ck_venta_vehiculos_precio CHECK (precio_final > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
