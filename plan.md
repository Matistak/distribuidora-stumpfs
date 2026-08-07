# Plan de implementación

## Objetivo

Construir una aplicación de escritorio para una sola persona que importe
archivos Excel de ventas, conserve los datos en SQLite y muestre el dashboard
sin cargar toda la base en memoria.

Volumen de referencia:

- 25.000 filas por mes.
- 300.000 filas por año.
- 1.500.000 filas en cinco años.

## Estado actual

- [x] Esquema Prisma con SQLite.
- [x] API local con Fastify.
- [x] Importación inicial de Excel.
- [x] Consultas SQL para el dashboard.
- [x] Consulta paginada de ventas.
- [x] Tauri configurado para iniciar el backend como sidecar.
- [x] Copia de la base semilla al directorio de datos de la aplicación.
- [x] Documentación alineada con SQLite + Tauri.
- [ ] Frontend utilizando la base como fuente de verdad.
- [ ] Importación validada e idempotente para datos reales.
- [ ] Backups y restauración.
- [ ] Pruebas con el volumen esperado.
- [ ] Instalador final validado.

## Etapa 1: Conectar el frontend con la base

Prioridad: alta.

- [ ] Cargar `GET /api/dashboard` al iniciar la aplicación.
- [ ] Cargar `GET /api/filtros` al iniciar la aplicación.
- [ ] Después de una carga exitosa, refrescar dashboard y filtros desde la API.
- [ ] Usar `GET /api/ventas` solo para tablas paginadas.
- [ ] Dejar `parseExcel` únicamente como fallback explícito de modo local.
- [ ] Eliminar el estado global de todas las filas cuando el backend esté conectado.
- [ ] Hacer que un error de `/api/uploads` detenga el flujo y no continúe con una carga local silenciosa.
- [ ] Alinear `UploadResponse` y `UploadHistorial` entre frontend y backend.
- [ ] Agregar al frontend los filtros de fecha si se necesitan en el dashboard.

Criterio de finalización: cerrar y volver a abrir la aplicación no debe borrar el
dashboard; los datos deben provenir de SQLite mediante la API.

## Etapa 2: Hacer robusta la importación

Prioridad: alta.

- [ ] Validar que el Excel tenga las columnas esperadas.
- [ ] Validar fechas, claves y valores numéricos antes de insertar.
- [ ] Mantener una única transacción por archivo.
- [ ] Mantener inserciones por lotes.
- [ ] Evitar cargar todas las claves existentes de `Venta` en memoria antes de cada importación.
- [ ] Usar la restricción única de SQLite para que reprocesar un archivo sea seguro.
- [ ] Confirmar con datos reales que la clave (`nroDoc`, `codProducto`, `nroComprobante`) sea suficiente.
- [ ] Registrar correctamente filas totales, nuevas, omitidas y errores en `Carga`.
- [ ] Probar dos veces el mismo archivo y verificar que no se dupliquen filas.
- [ ] Probar un archivo con filas duplicadas dentro del propio Excel.

Criterio de finalización: una importación de 25.000 filas se completa sin duplicar
datos, sin dejar una carga en estado incorrecto y sin consumir memoria de forma
innecesaria.

## Etapa 3: Corregir el modelo de datos

Prioridad: alta antes de acumular muchos meses.

- [ ] Confirmar si los importes en guaraníes no tienen decimales.
- [ ] Cambiar importes monetarios de `Float` a enteros o una representación decimal controlada.
- [ ] Revisar el tipo de `vtaUnit`, descuentos, IVA, latitud y longitud por separado.
- [ ] Confirmar cómo se identifican documentos de distintas compañías, sucursales y tipos.
- [ ] Crear una migración de Prisma para los cambios del modelo.
- [ ] Documentar cualquier campo derivado que venga calculado desde el Excel.

Criterio de finalización: los totales, costos y márgenes deben ser reproducibles
sin errores de redondeo y la clave de idempotencia debe estar validada.

## Etapa 4: Rendimiento de SQLite

Prioridad: media, después de tener datos reales.

- [ ] Activar `journal_mode = WAL`.
- [ ] Configurar `busy_timeout`.
- [ ] Revisar las consultas del dashboard con `EXPLAIN QUERY PLAN`.
- [ ] Medir las consultas con filtros de fecha, vendedor, canal, ciudad y zona.
- [ ] Agregar índices compuestos solo si las mediciones los justifican.
- [ ] Ejecutar `PRAGMA optimize` después de cargas importantes o en tareas de mantenimiento.
- [ ] Confirmar que `/api/ventas` siempre limite el tamaño de página.

Criterio de finalización: el dashboard debe responder en un tiempo aceptable con
al menos 300.000 filas, sin devolver todas las ventas al navegador.

## Etapa 5: Backup y recuperación

Prioridad: alta antes del uso real.

- [ ] Definir la ubicación de la base activa en el directorio de datos de Tauri.
- [ ] Agregar backup manual desde la aplicación.
- [ ] Crear backup automático antes de una importación.
- [ ] Agregar restauración desde un archivo `.db`.
- [ ] Validar la base restaurada con una comprobación de integridad.
- [ ] Permitir conservar los Excel originales como respaldo de origen.
- [ ] Documentar dónde se guardan los backups en macOS y Windows.

Criterio de finalización: se debe poder reinstalar la aplicación, restaurar un
backup y recuperar el dashboard completo.

## Etapa 6: Pruebas de volumen

Prioridad: media.

- [ ] Probar una carga real de 25.000 filas.
- [ ] Acumular o generar 300.000 filas y medir importación y dashboard.
- [ ] Probar 1.500.000 filas como escenario de cinco años.
- [ ] Medir tiempo de importación.
- [ ] Medir tiempo de cada consulta del dashboard.
- [ ] Medir memoria del sidecar y del frontend.
- [ ] Medir tamaño de la base y del backup.
- [ ] Probar reinicio de la aplicación durante una sesión normal.

Criterio de finalización: los resultados de las métricas deben coincidir con el
Excel de referencia y el comportamiento debe ser estable con el volumen máximo
planificado.

## Etapa 7: Empaquetado Tauri

Prioridad: media, después de completar las etapas anteriores.

- [ ] Generar el sidecar con `node scripts/setup-sidecar.js`.
- [ ] Verificar que el sidecar encuentre el engine de Prisma.
- [ ] Verificar que la base semilla se copie solo cuando no existe una base activa.
- [ ] Verificar el endpoint `/health` antes de enviar requests desde el frontend.
- [ ] Resolver el caso de puerto `3001` ocupado por otro proceso.
- [ ] Ejecutar `npm run tauri:build`.
- [ ] Instalar la aplicación en una computadora limpia.
- [ ] Cargar datos, cerrar la aplicación, abrirla nuevamente y confirmar persistencia.
- [ ] Actualizar la aplicación y confirmar que no reemplace la base activa.

Criterio de finalización: el instalador funciona sin Node.js, npm ni PostgreSQL
instalados y conserva los datos entre actualizaciones.

## Fuera de alcance inicial

No implementar en esta versión salvo que cambien los requisitos:

- PostgreSQL.
- S3 u otro almacenamiento remoto.
- Colas de trabajos.
- Autenticación remota y roles centralizados.
- Sincronización entre varias computadoras.
- Acceso multiusuario simultáneo.

Si se necesita alguno de esos puntos, Tauri puede mantenerse como cliente, pero
la base y la API deberán pasar a una infraestructura central.

## Definición de terminado

- [ ] Se puede importar un Excel real de 25.000 filas.
- [ ] Reimportar el mismo Excel no duplica ventas.
- [ ] El dashboard se calcula desde SQLite.
- [ ] Las ventas se consultan de forma paginada.
- [ ] La aplicación conserva los datos al reiniciarse.
- [ ] Existe un backup restaurable.
- [ ] La aplicación empaquetada funciona sin dependencias de desarrollo.
