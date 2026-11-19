-- =====================================================================
-- CRM AutoVentas GT, S.A. — Datos de ejemplo (100 % ficticios)
-- Idempotente: INSERT IGNORE con IDs explícitos. Las fechas son
-- relativas al momento de carga para que el dashboard tenga datos
-- recientes desde el primer arranque.
--
-- Usuarios de prueba (ver README):
--   admin@autoventas.gt      / Admin123!     (Administrador)
--   gerente@autoventas.gt    / Gerente123!   (Gerente Comercial)
--   vendedor@autoventas.gt   / Vendedor123!  (Vendedor)
--   vendedora2@autoventas.gt / Vendedor123!  (Vendedor)
--   vendedor3@autoventas.gt  / Vendedor123!  (Vendedor)
-- =====================================================================

SET NAMES utf8mb4;
SET time_zone = '-06:00';

-- ---------------------------------------------------------------- Roles
INSERT IGNORE INTO roles (id, codigo, nombre, descripcion) VALUES
 (1, 'ADMIN',    'Administrador',     'Gestiona usuarios, roles y tiene acceso total al sistema.'),
 (2, 'GERENTE',  'Gerente Comercial', 'Supervisa toda la gestión comercial, inventario, reportes y dashboard.'),
 (3, 'VENDEDOR', 'Vendedor',          'Gestiona únicamente sus clientes, prospectos, oportunidades, cotizaciones y ventas.');

-- ------------------------------------------------------------- Usuarios
INSERT IGNORE INTO usuarios (id, nombre, email, password_hash, rol_id, activo) VALUES
 (1, 'Administrador del Sistema', 'admin@autoventas.gt',      '$2b$10$ujAvS.A3/rVzmwA.AyA7NOcGjdz22Vs0XUGFa5WJWWfOTVuUuRaG6', 1, 1),
 (2, 'Mariela Castillo Gómez',    'gerente@autoventas.gt',    '$2b$10$ZUeXRBEsadCJqYhCtYOsU.NK5uC4f2y9t3WZ2DsMDnXqbZJezawKm', 2, 1),
 (3, 'Carlos Ajú Pérez',          'vendedor@autoventas.gt',   '$2b$10$dccveONArLXHFP2rXqAZOuYWXwx818XYnVtvQkl7wtOuYzoM1KpZ.', 3, 1),
 (4, 'Ana Lucía Morales Rivas',   'vendedora2@autoventas.gt', '$2b$10$dccveONArLXHFP2rXqAZOuYWXwx818XYnVtvQkl7wtOuYzoM1KpZ.', 3, 1),
 (5, 'José Pablo Xicará López',   'vendedor3@autoventas.gt',  '$2b$10$dccveONArLXHFP2rXqAZOuYWXwx818XYnVtvQkl7wtOuYzoM1KpZ.', 3, 1);

-- ------------------------------------------------------------ Vehículos
-- VIN con formato válido (17 caracteres, sin I/O/Q, dígito verificador correcto).
INSERT IGNORE INTO vehiculos (id, vin, marca, modelo, anio, version, tipo, condicion, color, transmision, combustible, motor, kilometraje, precio, estado, descripcion, creado_en) VALUES
 (1,  'JTFHK3FB6TA100231', 'Toyota',     'Hilux',    2026, 'SR 4x4',         'Pickup',    'Nuevo', 'Blanco',      'Manual',     'Diésel',    '2.4 L turbo diésel', 0,     289900.00, 'Vendido',    'Doble cabina, ideal para trabajo y campo.', DATE_SUB(NOW(), INTERVAL 200 DAY)),
 (2,  'JTDBCRBE3TC200418', 'Toyota',     'Corolla',  2026, 'XLE',            'Sedán',     'Nuevo', 'Gris perla',  'Automática', 'Gasolina',  '2.0 L',              0,     219500.00, 'Disponible', 'Sedán ejecutivo con asistente de carril.', DATE_SUB(NOW(), INTERVAL 120 DAY)),
 (3,  'JTMDWRFVXSD300552', 'Toyota',     'RAV4',     2025, 'Hybrid XLE',     'SUV',       'Nuevo', 'Azul',        'Automática', 'Híbrido',   '2.5 L híbrido',      0,     345000.00, 'Reservado',  'SUV híbrida, bajo consumo de combustible.', DATE_SUB(NOW(), INTERVAL 150 DAY)),
 (4,  '7FARW2H51RE401187', 'Honda',      'CR-V',     2024, 'EX',             'SUV',       'Usado', 'Negro',       'Automática', 'Gasolina',  '1.5 L turbo',        28500, 238000.00, 'Vendido',    'Un dueño, servicios en agencia.', DATE_SUB(NOW(), INTERVAL 180 DAY)),
 (5,  '2HGFE2F5XPH510034', 'Honda',      'Civic',    2023, 'Sport',          'Sedán',     'Usado', 'Rojo',        'Automática', 'Gasolina',  '2.0 L',              41200, 168000.00, 'Disponible', 'Excelente estado, llantas nuevas.', DATE_SUB(NOW(), INTERVAL 90 DAY)),
 (6,  '3N6CD3CT7TN620975', 'Nissan',     'Frontier', 2026, 'LE 4x4',         'Pickup',    'Nuevo', 'Plata',       'Automática', 'Diésel',    '2.5 L diésel',       0,     312000.00, 'Disponible', 'Pickup de alto rendimiento.', DATE_SUB(NOW(), INTERVAL 100 DAY)),
 (7,  '3N1CP5DVXSL731460', 'Nissan',     'Kicks',    2025, 'Advance',        'SUV',       'Nuevo', 'Blanco',      'Automática', 'Gasolina',  '1.6 L',              0,     172900.00, 'Vendido',    'SUV compacta urbana.', DATE_SUB(NOW(), INTERVAL 160 DAY)),
 (8,  'KM8JBCAE4SU842213', 'Hyundai',    'Tucson',   2025, 'GLS',            'SUV',       'Nuevo', 'Gris',        'Automática', 'Gasolina',  '2.0 L',              0,     259000.00, 'Disponible', 'Pantalla de 10", cámara de retroceso.', DATE_SUB(NOW(), INTERVAL 80 DAY)),
 (9,  'KMHCT4AE8NU953377', 'Hyundai',    'Accent',   2022, 'GL',             'Sedán',     'Usado', 'Blanco',      'Manual',     'Gasolina',  '1.6 L',              52000, 98500.00,  'Vendido',    'Económico, ideal como primer vehículo.', DATE_SUB(NOW(), INTERVAL 140 DAY)),
 (10, 'KNAPX81G4T7106688', 'Kia',        'Sportage', 2026, 'LX',             'SUV',       'Nuevo', 'Rojo',        'Automática', 'Gasolina',  '2.0 L',              0,     249900.00, 'Disponible', 'Garantía de fábrica de 5 años.', DATE_SUB(NOW(), INTERVAL 60 DAY)),
 (11, 'KNAB25120RT217749', 'Kia',        'Picanto',  2024, 'EX',             'Hatchback', 'Usado', 'Amarillo',    'Manual',     'Gasolina',  '1.2 L',              18000, 89000.00,  'Disponible', 'Bajo kilometraje.', DATE_SUB(NOW(), INTERVAL 50 DAY)),
 (12, 'JM3KFBEY2S0328810', 'Mazda',      'CX-5',     2025, 'Grand Touring',  'SUV',       'Nuevo', 'Azul',        'Automática', 'Gasolina',  '2.5 L',              0,     298000.00, 'Disponible', 'Interior de cuero, techo solar.', DATE_SUB(NOW(), INTERVAL 110 DAY)),
 (13, 'MMBJNKL38MZ439921', 'Mitsubishi', 'L200',     2021, 'GLX',            'Pickup',    'Usado', 'Gris',        'Manual',     'Diésel',    '2.4 L diésel',       76300, 185000.00, 'Vendido',    'Pickup de trabajo con mantenimiento al día.', DATE_SUB(NOW(), INTERVAL 130 DAY)),
 (14, 'MA3ZC83S5SM541032', 'Suzuki',     'Swift',    2025, 'GLX',            'Hatchback', 'Nuevo', 'Celeste',     'Automática', 'Gasolina',  '1.2 L',              0,     129900.00, 'Disponible', 'Hatchback eficiente para la ciudad.', DATE_SUB(NOW(), INTERVAL 40 DAY)),
 (15, 'MPATFS867TH652143', 'Isuzu',      'D-Max',    2026, 'LS',             'Pickup',    'Nuevo', 'Blanco',      'Manual',     'Diésel',    '3.0 L diésel',       0,     279000.00, 'Disponible', 'Alta capacidad de carga.', DATE_SUB(NOW(), INTERVAL 30 DAY)),
 (16, 'JTFSS22P1R0763254', 'Toyota',     'Hiace',    2024, 'Commuter',       'Microbús',  'Usado', 'Blanco',      'Manual',     'Diésel',    '2.8 L diésel',       35000, 315000.00, 'Disponible', '15 pasajeros, ideal para transporte de personal.', DATE_SUB(NOW(), INTERVAL 70 DAY)),
 (17, 'LGXCE4CB7TA874365', 'BYD',        'Dolphin',  2026, 'GS',             'Hatchback', 'Nuevo', 'Gris',        'Automática', 'Eléctrico', 'Eléctrico 70 kW',    0,     199900.00, 'Disponible', '100 % eléctrico, autonomía aproximada de 400 km.', DATE_SUB(NOW(), INTERVAL 20 DAY)),
 (18, '1GNSKBKC0LR985476', 'Chevrolet',  'Tahoe',    2020, 'LT',             'SUV',       'Usado', 'Negro',       'Automática', 'Gasolina',  '5.3 L V8',           64000, 365000.00, 'Vendido',    'Tres filas de asientos, blindaje nivel II.', DATE_SUB(NOW(), INTERVAL 60 DAY));

-- ----------------------------------------------------------- Prospectos
INSERT IGNORE INTO prospectos (id, nombres, apellidos, telefono, telefono_normalizado, email, fuente, interes, estado, vendedor_id, creado_por, creado_en) VALUES
 (1,  'Luis Fernando',   'Ixcot Chán',         '5512-3401', '55123401', 'luis.ixcot@correo.gt',       'Sitio web',         'Sedán automático para uso familiar',       'Calificado', 3, 3, DATE_SUB(NOW(), INTERVAL 35 DAY)),
 (2,  'María José',      'Tzul Ventura',       '5523-4402', '55234402', 'mariajose.tzul@correo.gt',   'Redes sociales',    'Hatchback económico',                      'Contactado', 3, 2, DATE_SUB(NOW(), INTERVAL 12 DAY)),
 (3,  'Kevin Estuardo',  'Barrios Lemus',      '4134-5403', '41345403', 'kevin.barrios@correo.gt',    'Feria',             'Pickup 4x4 diésel para finca',             'Calificado', 5, 5, DATE_SUB(NOW(), INTERVAL 70 DAY)),
 (4,  'Andrea Sofía',    'Cifuentes Aldana',   '3045-6404', '30456404', 'andrea.cifuentes@correo.gt', 'Referido',          'Sedán usado con bajo kilometraje',         'Contactado', 4, 4, DATE_SUB(NOW(), INTERVAL 18 DAY)),
 (5,  'Byron Alexander', 'Chávez Morales',     '5756-7405', '57567405', 'byron.chavez@correo.gt',     'Visita en agencia', 'SUV mediana',                              'Descartado', 4, 4, DATE_SUB(NOW(), INTERVAL 95 DAY)),
 (6,  'Gabriela',        'Patzán Sajché',      '4267-8406', '42678406', 'gaby.patzan@correo.gt',      'Llamada',           'Pickup de trabajo',                        'Nuevo',      5, 2, DATE_SUB(NOW(), INTERVAL 6 DAY)),
 (7,  'Diego Armando',   'Coyoy Pérez',        '5578-9407', '55789407', 'diego.coyoy@correo.gt',      'Sitio web',         'Vehículo eléctrico',                       'Nuevo',      3, 3, DATE_SUB(NOW(), INTERVAL 4 DAY)),
 (8,  'Silvia Elena',    'Monterroso Paz',     '3189-0408', '31890408', 'silvia.monterroso@correo.gt','Redes sociales',    'Microbús para colegio',                    'Descartado', 5, 5, DATE_SUB(NOW(), INTERVAL 120 DAY)),
 (9,  'Oscar René',      'Sical Tum',          '5590-1409', '55901409', NULL,                         'Visita en agencia', 'Cotizar pickup usado',                     'Nuevo',      3, 3, DATE_SUB(NOW(), INTERVAL 2 DAY)),
 (10, 'Lucía Fernanda',  'Batz Cumes',         '4401-2410', '44012410', 'lucia.batz@correo.gt',       'Referido',          'SUV compacta',                             'Nuevo',      4, 2, DATE_SUB(NOW(), INTERVAL 1 DAY)),
 (11, 'Rodrigo Esteban', 'Pineda Lux',         '5612-3411', '56123411', 'rodrigo.pineda@correo.gt',   'Sitio web',         'SUV grande de tres filas',                 'Convertido', 4, 4, DATE_SUB(NOW(), INTERVAL 40 DAY)),
 (12, 'Wendy Carolina',  'Ajanel Toj',         '3323-4412', '33234412', 'wendy.ajanel@correo.gt',     'Feria',             'Sedán nuevo',                              'Contactado', 5, 5, DATE_SUB(NOW(), INTERVAL 25 DAY));

-- ------------------------------------------------------------- Clientes
INSERT IGNORE INTO clientes (id, nombres, apellidos, dpi, nit, telefono, email, direccion, clasificacion, vendedor_id, prospecto_origen_id, creado_en) VALUES
 (1,  'Jorge Mario',      'Rodríguez Solís',   '2456789010101', '4521873-6', '5501-1001', 'jorge.rodriguez@correo.gt',  '6a. avenida 12-45 zona 10, Guatemala',          'Frecuente', 3, NULL, DATE_SUB(NOW(), INTERVAL 220 DAY)),
 (2,  'Claudia Patricia', 'Estrada López',     '2567890120101', '3698521-4', '5502-2002', 'claudia.estrada@correo.gt',  'Calzada Roosevelt 23-10 zona 7, Mixco',         'Regular',   4, NULL, DATE_SUB(NOW(), INTERVAL 190 DAY)),
 (3,  'Héctor Manuel',    'Cuxil Tepeu',       '2678901230901', '7412589-0', '4103-3003', 'hector.cuxil@correo.gt',     '4a. calle 5-20 zona 1, Quetzaltenango',         'Regular',   3, NULL, DATE_SUB(NOW(), INTERVAL 170 DAY)),
 (4,  'Ingrid Paola',     'Reyes Sandoval',    '2789012340101', 'CF',        '3004-4004', 'ingrid.reyes@correo.gt',     'Boulevard Los Próceres 18-50 zona 10',          'Regular',   5, NULL, DATE_SUB(NOW(), INTERVAL 160 DAY)),
 (5,  'Fernando José',    'Arriola Méndez',    '2890123450101', '1597534-8', '5505-5005', 'fernando.arriola@correo.gt', 'Carretera a El Salvador km 15, Santa Catarina Pinula', 'Nuevo', 3, NULL, DATE_SUB(NOW(), INTERVAL 60 DAY)),
 (6,  'Edgar Rolando',    'Guzmán Cano',       '2901234560501', '9638527-1', '4106-6006', 'edgar.guzman@correo.gt',     'Transportes Guzmán, 2a. avenida 3-15, Escuintla','VIP',      4, NULL, DATE_SUB(NOW(), INTERVAL 45 DAY)),
 (7,  'Mónica Beatriz',   'Valdez Herrera',    '3012345670101', 'CF',        '5507-7007', 'monica.valdez@correo.gt',    'Diagonal 6 13-01 zona 10',                      'Nuevo',     4, NULL, DATE_SUB(NOW(), INTERVAL 15 DAY)),
 (8,  'Julio César',      'Ordóñez Fuentes',   '3123456780101', '8527419-3', '3008-8008', 'julio.ordonez@correo.gt',    '15 avenida 8-22 zona 18',                       'Inactivo',  3, NULL, DATE_SUB(NOW(), INTERVAL 400 DAY)),
 (9,  'Karla Rocío',      'Méndez Orellana',   '3234567890101', 'CF',        '4109-9009', 'karla.mendez@correo.gt',     'Residenciales San Cristóbal, Mixco',            'Nuevo',     5, NULL, DATE_SUB(NOW(), INTERVAL 28 DAY)),
 (10, 'Erick Daniel',     'Samayoa Lima',      '3345678900101', '7539514-2', '5510-1010', 'erick.samayoa@correo.gt',    '3a. calle 2-34 zona 2, Antigua Guatemala',      'Nuevo',     3, NULL, DATE_SUB(NOW(), INTERVAL 10 DAY)),
 (11, 'Paola Andrea',     'Quiñónez Arana',    '3456789010101', '1472583-9', '3011-1111', 'paola.quinonez@correo.gt',   'Km 19.5 carretera a Fraijanes',                 'Regular',   4, NULL, DATE_SUB(NOW(), INTERVAL 300 DAY)),
 (12, 'Mario Alberto',    'Tzoc Ajcip',        '3567890120801', 'CF',        '4112-1212', 'mario.tzoc@correo.gt',       '1a. avenida 4-11 zona 3, Totonicapán',          'Nuevo',     5, NULL, DATE_SUB(NOW(), INTERVAL 33 DAY)),
 (13, 'Rodrigo Esteban',  'Pineda Lux',        NULL,            'CF',        '5612-3411', 'rodrigo.pineda@correo.gt',   NULL,                                            'Regular',   4, 11,   DATE_SUB(NOW(), INTERVAL 8 DAY));

UPDATE prospectos SET cliente_id = 13 WHERE id = 11 AND cliente_id IS NULL;

-- -------------------------------------------------------- Oportunidades
INSERT IGNORE INTO oportunidades (id, titulo, prospecto_id, cliente_id, vehiculo_interes_id, vendedor_id, etapa, monto_estimado, fecha_cierre_estimada, motivo_perdida, cerrada_en, creado_en) VALUES
 (1,  'Hilux para empresa agrícola',        NULL, 1,  1,  3, 'Ganado',      289900.00, DATE(DATE_SUB(NOW(), INTERVAL 150 DAY)), NULL, DATE_SUB(NOW(), INTERVAL 150 DAY), DATE_SUB(NOW(), INTERVAL 175 DAY)),
 (2,  'CR-V usada para familia',            NULL, 2,  4,  4, 'Ganado',      238000.00, DATE(DATE_SUB(NOW(), INTERVAL 110 DAY)), NULL, DATE_SUB(NOW(), INTERVAL 110 DAY), DATE_SUB(NOW(), INTERVAL 130 DAY)),
 (3,  'Kicks nueva',                        NULL, 3,  7,  3, 'Ganado',      172900.00, DATE(DATE_SUB(NOW(), INTERVAL 75 DAY)),  NULL, DATE_SUB(NOW(), INTERVAL 75 DAY),  DATE_SUB(NOW(), INTERVAL 95 DAY)),
 (4,  'Primer vehículo — Accent',           NULL, 4,  9,  5, 'Ganado',      98500.00,  DATE(DATE_SUB(NOW(), INTERVAL 45 DAY)),  NULL, DATE_SUB(NOW(), INTERVAL 45 DAY),  DATE_SUB(NOW(), INTERVAL 60 DAY)),
 (5,  'Segunda pickup para la finca',       NULL, 1,  13, 3, 'Ganado',      185000.00, DATE(DATE_SUB(NOW(), INTERVAL 20 DAY)),  NULL, DATE_SUB(NOW(), INTERVAL 20 DAY),  DATE_SUB(NOW(), INTERVAL 32 DAY)),
 (6,  'Tahoe para traslado ejecutivo',      11,   13, 18, 4, 'Ganado',      365000.00, DATE(DATE_SUB(NOW(), INTERVAL 8 DAY)),   NULL, DATE_SUB(NOW(), INTERVAL 8 DAY),   DATE_SUB(NOW(), INTERVAL 38 DAY)),
 (7,  'RAV4 híbrida',                       NULL, 5,  3,  3, 'Negociación', 345000.00, DATE(DATE_ADD(NOW(), INTERVAL 10 DAY)),  NULL, NULL, DATE_SUB(NOW(), INTERVAL 25 DAY)),
 (8,  'Corolla XLE',                        1,    NULL, 2, 3, 'Cotización',  219500.00, DATE(DATE_ADD(NOW(), INTERVAL 20 DAY)),  NULL, NULL, DATE_SUB(NOW(), INTERVAL 30 DAY)),
 (9,  'CX-5 Grand Touring',                 5,    NULL, 12, 4, 'Perdido',    298000.00, DATE(DATE_SUB(NOW(), INTERVAL 60 DAY)),  'Eligió otra marca por precio', DATE_SUB(NOW(), INTERVAL 62 DAY), DATE_SUB(NOW(), INTERVAL 90 DAY)),
 (10, 'Flota: Tucson + Sportage',           NULL, 6,  8,  4, 'Cotización',  508900.00, DATE(DATE_ADD(NOW(), INTERVAL 30 DAY)),  NULL, NULL, DATE_SUB(NOW(), INTERVAL 14 DAY)),
 (11, 'Frontier 4x4 para finca',            3,    NULL, 6, 5, 'Negociación', 312000.00, DATE(DATE_ADD(NOW(), INTERVAL 5 DAY)),   NULL, NULL, DATE_SUB(NOW(), INTERVAL 65 DAY)),
 (12, 'Swift para uso diario',              2,    NULL, 14, 3, 'Prospección', 129900.00, DATE(DATE_ADD(NOW(), INTERVAL 45 DAY)), NULL, NULL, DATE_SUB(NOW(), INTERVAL 10 DAY)),
 (13, 'Civic Sport usado',                  4,    NULL, 5, 4, 'Contacto',    168000.00, DATE(DATE_ADD(NOW(), INTERVAL 25 DAY)),  NULL, NULL, DATE_SUB(NOW(), INTERVAL 16 DAY)),
 (14, 'D-Max de trabajo',                   6,    NULL, 15, 5, 'Contacto',   279000.00, DATE(DATE_ADD(NOW(), INTERVAL 40 DAY)),  NULL, NULL, DATE_SUB(NOW(), INTERVAL 5 DAY)),
 (15, 'Vehículo eléctrico BYD',             7,    NULL, 17, 3, 'Prospección', 199900.00, DATE(DATE_ADD(NOW(), INTERVAL 60 DAY)), NULL, NULL, DATE_SUB(NOW(), INTERVAL 3 DAY)),
 (16, 'Microbús para colegio',              8,    NULL, 16, 5, 'Perdido',    315000.00, DATE(DATE_SUB(NOW(), INTERVAL 90 DAY)),  'Presupuesto insuficiente', DATE_SUB(NOW(), INTERVAL 92 DAY), DATE_SUB(NOW(), INTERVAL 118 DAY)),
 (17, 'Picanto para hija universitaria',    NULL, 7,  11, 4, 'Prospección', 89000.00,  DATE(DATE_ADD(NOW(), INTERVAL 30 DAY)),  NULL, NULL, DATE_SUB(NOW(), INTERVAL 7 DAY));

-- --------------------------------------------------------- Cotizaciones
-- Cálculo: base = subtotal - descuento; IVA = base x 12 %; total = base + IVA.
INSERT IGNORE INTO cotizaciones (id, correlativo, oportunidad_id, vendedor_id, fecha, vigencia_hasta, subtotal, descuento, base_imponible, iva_tasa, iva, total, estado, observaciones, creado_en) VALUES
 (1,  CONCAT('COT-', YEAR(DATE_SUB(NOW(), INTERVAL 160 DAY)), '-000001'), 1,  3, DATE(DATE_SUB(NOW(), INTERVAL 160 DAY)), DATE(DATE_SUB(NOW(), INTERVAL 145 DAY)), 289900.00, 4900.00,  285000.00, 0.1200, 34200.00, 319200.00, 'Convertida', 'Incluye primer servicio gratis.', DATE_SUB(NOW(), INTERVAL 160 DAY)),
 (2,  CONCAT('COT-', YEAR(DATE_SUB(NOW(), INTERVAL 120 DAY)), '-000002'), 2,  4, DATE(DATE_SUB(NOW(), INTERVAL 120 DAY)), DATE(DATE_SUB(NOW(), INTERVAL 105 DAY)), 238000.00, 0.00,     238000.00, 0.1200, 28560.00, 266560.00, 'Convertida', NULL, DATE_SUB(NOW(), INTERVAL 120 DAY)),
 (3,  CONCAT('COT-', YEAR(DATE_SUB(NOW(), INTERVAL 85 DAY)),  '-000003'), 3,  3, DATE(DATE_SUB(NOW(), INTERVAL 85 DAY)),  DATE(DATE_SUB(NOW(), INTERVAL 70 DAY)),  172900.00, 2900.00,  170000.00, 0.1200, 20400.00, 190400.00, 'Convertida', NULL, DATE_SUB(NOW(), INTERVAL 85 DAY)),
 (4,  CONCAT('COT-', YEAR(DATE_SUB(NOW(), INTERVAL 52 DAY)),  '-000004'), 4,  5, DATE(DATE_SUB(NOW(), INTERVAL 52 DAY)),  DATE(DATE_SUB(NOW(), INTERVAL 37 DAY)),  98500.00,  1500.00,  97000.00,  0.1200, 11640.00, 108640.00, 'Convertida', NULL, DATE_SUB(NOW(), INTERVAL 52 DAY)),
 (5,  CONCAT('COT-', YEAR(DATE_SUB(NOW(), INTERVAL 26 DAY)),  '-000005'), 5,  3, DATE(DATE_SUB(NOW(), INTERVAL 26 DAY)),  DATE(DATE_SUB(NOW(), INTERVAL 11 DAY)),  185000.00, 5000.00,  180000.00, 0.1200, 21600.00, 201600.00, 'Convertida', 'Cliente frecuente.', DATE_SUB(NOW(), INTERVAL 26 DAY)),
 (6,  CONCAT('COT-', YEAR(DATE_SUB(NOW(), INTERVAL 15 DAY)),  '-000006'), 6,  4, DATE(DATE_SUB(NOW(), INTERVAL 15 DAY)),  DATE(DATE_SUB(NOW(), INTERVAL 1 DAY)),   365000.00, 15000.00, 350000.00, 0.1200, 42000.00, 392000.00, 'Convertida', NULL, DATE_SUB(NOW(), INTERVAL 15 DAY)),
 (7,  CONCAT('COT-', YEAR(DATE_SUB(NOW(), INTERVAL 9 DAY)),   '-000007'), 7,  3, DATE(DATE_SUB(NOW(), INTERVAL 9 DAY)),   DATE(DATE_ADD(NOW(), INTERVAL 21 DAY)),  345000.00, 5000.00,  340000.00, 0.1200, 40800.00, 380800.00, 'Aceptada',   'Aceptada por el cliente; pendiente de registrar la venta.', DATE_SUB(NOW(), INTERVAL 9 DAY)),
 (8,  CONCAT('COT-', YEAR(DATE_SUB(NOW(), INTERVAL 5 DAY)),   '-000008'), 8,  3, DATE(DATE_SUB(NOW(), INTERVAL 5 DAY)),   DATE(DATE_ADD(NOW(), INTERVAL 25 DAY)),  219500.00, 0.00,     219500.00, 0.1200, 26340.00, 245840.00, 'Enviada',    NULL, DATE_SUB(NOW(), INTERVAL 5 DAY)),
 (9,  CONCAT('COT-', YEAR(DATE_SUB(NOW(), INTERVAL 75 DAY)),  '-000009'), 9,  4, DATE(DATE_SUB(NOW(), INTERVAL 75 DAY)),  DATE(DATE_SUB(NOW(), INTERVAL 60 DAY)),  298000.00, 0.00,     298000.00, 0.1200, 35760.00, 333760.00, 'Rechazada',  'El cliente consideró el precio elevado.', DATE_SUB(NOW(), INTERVAL 75 DAY)),
 (10, CONCAT('COT-', YEAR(DATE_SUB(NOW(), INTERVAL 3 DAY)),   '-000010'), 10, 4, DATE(DATE_SUB(NOW(), INTERVAL 3 DAY)),   DATE(DATE_ADD(NOW(), INTERVAL 27 DAY)),  508900.00, 8900.00,  500000.00, 0.1200, 60000.00, 560000.00, 'Borrador',   'Cotización de flota (2 unidades).', DATE_SUB(NOW(), INTERVAL 3 DAY)),
 (11, CONCAT('COT-', YEAR(DATE_SUB(NOW(), INTERVAL 60 DAY)),  '-000011'), 11, 5, DATE(DATE_SUB(NOW(), INTERVAL 60 DAY)),  DATE(DATE_SUB(NOW(), INTERVAL 45 DAY)),  312000.00, 12000.00, 300000.00, 0.1200, 36000.00, 336000.00, 'Vencida',    'Venció sin respuesta del prospecto.', DATE_SUB(NOW(), INTERVAL 60 DAY));

INSERT IGNORE INTO detalle_cotizacion (id, cotizacion_id, vehiculo_id, precio_unitario, descuento, subtotal) VALUES
 (1,  1,  1,  289900.00, 4900.00,  285000.00),
 (2,  2,  4,  238000.00, 0.00,     238000.00),
 (3,  3,  7,  172900.00, 2900.00,  170000.00),
 (4,  4,  9,  98500.00,  1500.00,  97000.00),
 (5,  5,  13, 185000.00, 5000.00,  180000.00),
 (6,  6,  18, 365000.00, 15000.00, 350000.00),
 (7,  7,  3,  345000.00, 5000.00,  340000.00),
 (8,  8,  2,  219500.00, 0.00,     219500.00),
 (9,  9,  12, 298000.00, 0.00,     298000.00),
 (10, 10, 8,  259000.00, 4000.00,  255000.00),
 (11, 10, 10, 249900.00, 4900.00,  245000.00),
 (12, 11, 6,  312000.00, 12000.00, 300000.00);

-- La RAV4 (vehículo 3) queda reservada por la cotización aceptada 7.
UPDATE vehiculos SET reservado_cotizacion_id = 7 WHERE id = 3 AND estado = 'Reservado';

-- --------------------------------------------------------------- Ventas
INSERT IGNORE INTO ventas (id, correlativo, cotizacion_id, cliente_id, vendedor_id, fecha, metodo_pago, total, observaciones, registrado_por) VALUES
 (1, CONCAT('VTA-', YEAR(DATE_SUB(NOW(), INTERVAL 150 DAY)), '-000001'), 1, 1,  3, DATE_SUB(NOW(), INTERVAL 150 DAY), 'Contado',        319200.00, NULL, 3),
 (2, CONCAT('VTA-', YEAR(DATE_SUB(NOW(), INTERVAL 110 DAY)), '-000002'), 2, 2,  4, DATE_SUB(NOW(), INTERVAL 110 DAY), 'Financiamiento', 266560.00, 'Financiamiento a 48 meses.', 4),
 (3, CONCAT('VTA-', YEAR(DATE_SUB(NOW(), INTERVAL 75 DAY)),  '-000003'), 3, 3,  3, DATE_SUB(NOW(), INTERVAL 75 DAY),  'Transferencia',  190400.00, NULL, 3),
 (4, CONCAT('VTA-', YEAR(DATE_SUB(NOW(), INTERVAL 45 DAY)),  '-000004'), 4, 4,  5, DATE_SUB(NOW(), INTERVAL 45 DAY),  'Contado',        108640.00, NULL, 5),
 (5, CONCAT('VTA-', YEAR(DATE_SUB(NOW(), INTERVAL 20 DAY)),  '-000005'), 5, 1,  3, DATE_SUB(NOW(), INTERVAL 20 DAY),  'Cheque',         201600.00, NULL, 3),
 (6, CONCAT('VTA-', YEAR(DATE_SUB(NOW(), INTERVAL 8 DAY)),   '-000006'), 6, 13, 4, DATE_SUB(NOW(), INTERVAL 8 DAY),   'Financiamiento', 392000.00, 'Prospecto convertido en cliente.', 4);

INSERT IGNORE INTO venta_vehiculos (venta_id, vehiculo_id, precio_final) VALUES
 (1, 1,  285000.00),
 (2, 4,  238000.00),
 (3, 7,  170000.00),
 (4, 9,  97000.00),
 (5, 13, 180000.00),
 (6, 18, 350000.00);

-- ---------------------------------------------------------- Correlativos
-- Se sincronizan con el mayor número usado por serie y año.
INSERT INTO correlativos (serie, anio, ultimo)
  SELECT 'COT', CAST(SUBSTRING(correlativo, 5, 4) AS UNSIGNED), MAX(CAST(SUBSTRING(correlativo, 10) AS UNSIGNED))
    FROM cotizaciones GROUP BY CAST(SUBSTRING(correlativo, 5, 4) AS UNSIGNED)
  ON DUPLICATE KEY UPDATE ultimo = GREATEST(ultimo, VALUES(ultimo));
INSERT INTO correlativos (serie, anio, ultimo)
  SELECT 'VTA', CAST(SUBSTRING(correlativo, 5, 4) AS UNSIGNED), MAX(CAST(SUBSTRING(correlativo, 10) AS UNSIGNED))
    FROM ventas GROUP BY CAST(SUBSTRING(correlativo, 5, 4) AS UNSIGNED)
  ON DUPLICATE KEY UPDATE ultimo = GREATEST(ultimo, VALUES(ultimo));

-- --------------------------------------------------------- Interacciones
INSERT IGNORE INTO interacciones (id, cliente_id, prospecto_id, oportunidad_id, usuario_id, tipo, descripcion, fecha) VALUES
 (1,  1,    NULL, 1,    3, 'Visita',           'El cliente visitó la agencia y revisó la Hilux.', DATE_SUB(NOW(), INTERVAL 170 DAY)),
 (2,  1,    NULL, 1,    3, 'Prueba de manejo', 'Prueba de manejo en carretera a El Salvador.', DATE_SUB(NOW(), INTERVAL 165 DAY)),
 (3,  1,    NULL, 1,    3, 'Sistema',          'Venta registrada con la cotización COT-000001.', DATE_SUB(NOW(), INTERVAL 150 DAY)),
 (4,  2,    NULL, 2,    4, 'Llamada',          'Consultó opciones de financiamiento.', DATE_SUB(NOW(), INTERVAL 125 DAY)),
 (5,  2,    NULL, 2,    4, 'Sistema',          'Venta registrada con la cotización COT-000002.', DATE_SUB(NOW(), INTERVAL 110 DAY)),
 (6,  3,    NULL, 3,    3, 'WhatsApp',         'Envió fotos del vehículo y ficha técnica.', DATE_SUB(NOW(), INTERVAL 90 DAY)),
 (7,  4,    NULL, 4,    5, 'Correo',           'Se envió la cotización por correo.', DATE_SUB(NOW(), INTERVAL 52 DAY)),
 (8,  1,    NULL, 5,    3, 'Llamada',          'El cliente necesita una segunda pickup para la finca.', DATE_SUB(NOW(), INTERVAL 30 DAY)),
 (9,  5,    NULL, 7,    3, 'Reunión',          'Negociación de descuento; el cliente aceptó la cotización.', DATE_SUB(NOW(), INTERVAL 7 DAY)),
 (10, 6,    NULL, 10,   4, 'Visita',           'Visita a las oficinas del cliente para revisar necesidades de flota.', DATE_SUB(NOW(), INTERVAL 12 DAY)),
 (11, 7,    NULL, 17,   4, 'Llamada',          'Primer contacto, interesada en un vehículo económico.', DATE_SUB(NOW(), INTERVAL 6 DAY)),
 (12, 8,    NULL, NULL, 3, 'Correo',           'Se envió promoción de servicio; sin respuesta.', DATE_SUB(NOW(), INTERVAL 200 DAY)),
 (13, 11,   NULL, NULL, 4, 'Llamada',          'Encuesta de satisfacción posventa.', DATE_SUB(NOW(), INTERVAL 90 DAY)),
 (14, NULL, 1,    8,    3, 'Llamada',          'Se calificó al prospecto: presupuesto aprobado.', DATE_SUB(NOW(), INTERVAL 28 DAY)),
 (15, NULL, 1,    8,    3, 'Correo',           'Se envió la cotización del Corolla XLE.', DATE_SUB(NOW(), INTERVAL 5 DAY)),
 (16, NULL, 2,    12,   3, 'WhatsApp',         'Pidió información del Suzuki Swift.', DATE_SUB(NOW(), INTERVAL 9 DAY)),
 (17, NULL, 3,    11,   5, 'Prueba de manejo', 'Prueba de manejo de la Frontier 4x4.', DATE_SUB(NOW(), INTERVAL 62 DAY)),
 (18, NULL, 4,    13,   4, 'Llamada',          'Interesada en el Civic Sport usado.', DATE_SUB(NOW(), INTERVAL 15 DAY)),
 (19, NULL, 5,    9,    4, 'Nota',             'El prospecto decidió comprar otra marca.', DATE_SUB(NOW(), INTERVAL 62 DAY)),
 (20, NULL, 6,    14,   5, 'Llamada',          'Solicitó información de pickups diésel.', DATE_SUB(NOW(), INTERVAL 5 DAY)),
 (21, NULL, 7,    15,   3, 'Correo',           'Se envió catálogo de vehículos eléctricos.', DATE_SUB(NOW(), INTERVAL 3 DAY)),
 (22, NULL, 8,    16,   5, 'Nota',             'No cuenta con presupuesto este año.', DATE_SUB(NOW(), INTERVAL 92 DAY)),
 (23, 13,   11,   6,    4, 'Sistema',          'Prospecto convertido en cliente al registrar la venta.', DATE_SUB(NOW(), INTERVAL 8 DAY)),
 (24, NULL, 12,   NULL, 5, 'WhatsApp',         'Consultó por sedanes nuevos.', DATE_SUB(NOW(), INTERVAL 20 DAY)),
 (25, 10,   NULL, NULL, 3, 'Visita',           'Visitó la sala de ventas; volverá con su familia.', DATE_SUB(NOW(), INTERVAL 9 DAY));
