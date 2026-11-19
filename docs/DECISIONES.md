# Decisiones de implementación

Registro de las decisiones que **no estaban cubiertas** por los documentos del proyecto (instrucciones del curso y Fase 2, entregables 9 al 15) o que requirieron interpretación. En cada caso se eligió la opción más simple que cumple los criterios. Formato: decisión, motivo y dónde se aplica.

> **Aviso importante sobre las fuentes.** En el equipo solo se encontraron las *instrucciones del proyecto* (PDF) y el documento de la *Fase 2* (entregables 9 al 15), copiados en `docs/fuentes/`. **El documento de la Fase 1 (entregables 1 al 8) no estaba disponible.** Por eso el texto exacto de las historias HU-01 a HU-15, sus criterios de aceptación, el modelo de dominio y el supuesto S8 se reconstruyeron con lo que cita la Fase 2 (tablas 14 y 16 y sección 12.3) y con el enunciado de la tarea. Si la Fase 1 difiere en algún punto, prevalece la Fase 1 y estas decisiones deben revisarse.

## Alcance y datos

| # | Decisión | Motivo |
|---|----------|--------|
| D1 | Las 10 entidades del dominio (Rol, Usuario, Cliente, Prospecto, Oportunidad, Interacción, Vehículo, Cotización, DetalleCotización, Venta) se implementan como tablas. Además hay **dos tablas técnicas**: `correlativos` (numeración) y `venta_vehiculos` (vehículos de cada venta). | `venta_vehiculos` con `UNIQUE(vehiculo_id)` garantiza **en la base de datos** que un vehículo no se venda dos veces, aunque una cotización tenga varias unidades. `correlativos` permite numerar sin huecos por carreras. |
| D2 | MySQL **8.4 LTS** (rama 8). | Es la versión LTS vigente de MySQL 8, como pide el stack. |
| D3 | Angular **21** (etiqueta `v21-lts` en npm). | La versión `latest` es la 22; la LTS vigente es la 21. Se usa *zoneless* y *signals*, que son el estándar actual. |
| D4 | Node.js **22 LTS** y Express **5**. | Express 5 maneja errores de funciones `async` sin envoltorios. |
| D5 | Las fechas se manejan en **hora de Guatemala (UTC-6)**: el servidor MySQL usa `--default-time-zone=-06:00` y la API devuelve fechas como texto (`AAAA-MM-DD HH:mm:ss`). | Evita desfases de zona horaria entre el navegador, Node y MySQL. Guatemala no usa horario de verano. |
| D6 | Los datos de ejemplo usan **fechas relativas** a la fecha de carga (`DATE_SUB(NOW(), ...)`). | El dashboard muestra datos recientes en cualquier momento en que se levante el sistema. |
| D7 | Los VIN de ejemplo tienen **dígito verificador válido** (ISO 3779). La API exige solo el **formato** (17 caracteres, sin I/O/Q) y avisa si el dígito verificador no corresponde. | En Guatemala circulan vehículos de mercados donde el dígito verificador no es obligatorio. |

## Reglas de negocio

| # | Decisión | Motivo |
|---|----------|--------|
| R1 | **IVA (supuesto S8):** el precio de catálogo **no incluye IVA**. Base imponible = subtotal − descuentos; IVA = base × 12 %; total = base + IVA. Se redondea a centavos (mitad hacia arriba) y se calcula en enteros (centavos). | Es la lectura más simple de «subtotal, descuentos, IVA 12 % y total». Calcular en centavos evita errores de coma flotante. La tasa es configurable (`IVA_PUNTOS_BASICOS`). |
| R2 | Los descuentos son **por línea** (por vehículo), entre 0 y el precio. El precio siempre lo toma el servidor del catálogo. | Impide manipular precios desde el cliente. |
| R3 | **Correlativos:** `COT-AAAA-NNNNNN` y `VTA-AAAA-NNNNNN`, reiniciados cada año. Se generan dentro de la transacción con `SELECT ... FOR UPDATE` sobre la tabla `correlativos`; `UNIQUE` es la segunda barrera. | Garantiza unicidad también con solicitudes concurrentes (probado con 6 en paralelo). |
| R4 | **Estados de cotización:** Borrador → Enviada → Aceptada / Rechazada; Aceptada → Rechazada (el cliente desiste); Vencida (automática si pasa la vigencia en Borrador o Enviada); Convertida (solo al registrar la venta). | Seguimiento de ofertas mínimo y claro. |
| R5 | **Reserva de inventario:** al **aceptar** una cotización sus vehículos pasan a «Reservado» (vinculados a esa cotización). Al rechazarla, o al perder la oportunidad, se liberan. Una cotización solo se crea con vehículos «Disponibles». | Cubre «disponibilidad de unidades» y evita que dos clientes acepten el mismo vehículo. |
| R6 | **Venta (HU-10):** solo desde una cotización **Aceptada**. Todo ocurre en **una transacción**: bloqueo `FOR UPDATE` de la cotización, sus vehículos y la oportunidad; conversión o vinculación del prospecto; inserción de la venta; vehículos a «Vendido»; cotización a «Convertida»; oportunidad a «Ganado»; reclasificación del cliente; registro en el historial. Cualquier error produce `ROLLBACK`. | Es el escenario crítico de la Fase 2 (12.3). |
| R7 | Al convertir un prospecto, si ya existe un cliente con el **mismo correo**, se vincula a ese cliente en lugar de crear un duplicado. | Evita duplicados y choques con `UNIQUE(email)`. |
| R8 | **Etapas del embudo:** Prospección → Contacto → Cotización → Negociación → Ganado / Perdido. «Ganado» solo lo asigna la venta. «Perdido» exige un motivo y rechaza las cotizaciones abiertas. Las oportunidades cerradas no cambian de etapa. Al crear la primera cotización la oportunidad avanza a «Cotización», y al aceptarla, a «Negociación». | Trazabilidad automática sin pasos manuales redundantes. |
| R9 | **Duplicados de prospectos (HU-04):** coincidencia por correo (sin distinguir mayúsculas) o por **teléfono normalizado** (solo dígitos), comparando contra prospectos **y** clientes. Se **bloquea** el registro (409) y se muestran las coincidencias. A un vendedor no se le revelan los datos de contacto de registros ajenos. | La forma más simple de evitar duplicados respetando la privacidad entre vendedores. |
| R10 | **Clasificación de clientes (HU-15):** Nuevo (0 compras), Regular (1), Frecuente (2 o más), VIP (≥ Q500,000 acumulados o asignado manualmente), Inactivo (manual o sugerido tras un año sin compras). Se recalcula al registrar cada venta y nunca baja a un cliente VIP. El reporte muestra la clasificación **sugerida** cuando difiere. | Los documentos piden «clasificación» sin definir criterios. |
| R11 | **Eliminaciones:** solo gerente o administrador, y solo si no hay registros dependientes (por ejemplo, un cliente sin oportunidades ni ventas). Lo demás se maneja con estados (Inactivo, Descartado). Las cotizaciones solo se eliminan en Borrador. | Conserva la trazabilidad comercial. |
| R12 | Las interacciones de tipo «Sistema» las crea solo el servidor (cambios de etapa, cotizaciones, ventas, reasignaciones). | Trazabilidad automática. |

## Seguridad y roles

| # | Decisión | Motivo |
|---|----------|--------|
| S1 | **Permisos:** el *Administrador* tiene acceso total (además de usuarios y roles); el *Gerente Comercial* ve toda la gestión comercial, asigna vendedores, administra el inventario y ve los reportes, pero **no** administra usuarios; el *Vendedor* solo ve y modifica lo suyo y consulta el catálogo. | Lectura directa del enunciado. |
| S2 | Un vendedor que pide un registro ajeno recibe **404** (no 403). | No revela qué registros existen. |
| S3 | El rol se lee de la **base de datos en cada solicitud**, no del JWT; un usuario desactivado pierde el acceso de inmediato. | Un token con un rol falsificado no sirve. Probado. |
| S4 | Los roles son **fijos** (3) porque los permisos están en el código; el administrador puede renombrarlos y editar su descripción. | Simplicidad y seguridad (no se crean roles sin permisos definidos). |
| S5 | Límite de **5 intentos fallidos por IP cada 15 minutos** en el login (configurable). Contraseñas: mínimo 8 caracteres con letras y números (bcrypt, costo 10). JWT de **8 horas**. | Valores habituales y razonables para un MVP. |
| S6 | No puede quedar el sistema sin un administrador activo, y un administrador no puede desactivarse ni quitarse el rol a sí mismo. | Evita bloqueos accidentales. |
| S7 | El archivo `.env` se entrega con **claves de desarrollo** (lo pidió el enunciado). No debe usarse en producción. | Permite levantar el sistema con un solo comando. |

## Interfaz

| # | Decisión | Motivo |
|---|----------|--------|
| U1 | Sin librerías de componentes (CSS propio) y **Chart.js** para gráficas. | Paquete pequeño (≈ 85 kB comprimidos al inicio) y control total del diseño responsive. |
| U2 | Moneda con el formato **Q1,234.56**, construido sin `Intl` con `es-GT`. | `Intl` con `es-GT` inserta espacios distintos según la versión de ICU (detectado por una prueba). |
| U3 | Los campos de fecha usan el control nativo del navegador; su formato visual depende del idioma del sistema operativo. Todas las fechas mostradas en tablas y fichas usan **dd/mm/aaaa**. | Control accesible y sin dependencias. |
| U4 | Las listas desplegables de selección (oportunidades, vehículos y contactos en los formularios) cargan hasta 100 registros con búsqueda. | Suficiente para el volumen de una agencia. Para miles de registros convendría un autocompletado paginado. |
| U5 | La HU-14 (PDF) se implementó en el **servidor** con PDFKit (`GET /api/cotizaciones/:id/pdf`). | El documento sale idéntico en cualquier navegador y respeta los permisos. |
