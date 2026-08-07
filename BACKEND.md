# Backend local

La aplicación será utilizada por una sola persona en una computadora. La
arquitectura elegida es:

```text
React dentro de Tauri
        |
Fastify local como sidecar
        |
Prisma
        |
SQLite
```

El volumen estimado de 25.000 filas por mes equivale aproximadamente a 300.000
filas por año y 1.500.000 filas en cinco años. Ese volumen es adecuado para
SQLite. El rendimiento dependerá principalmente de importar en transacciones y
ejecutar las métricas en SQL, no de cargar todos los registros en el navegador.

## Tecnologías elegidas

| Necesidad        | Tecnología                                |
| ---------------- | ----------------------------------------- |
| Aplicación       | Tauri 2                                   |
| Frontend         | React + TypeScript                        |
| API local        | Fastify 5 + TypeScript                    |
| Lectura de Excel | `xlsx`                                    |
| Base de datos    | SQLite                                    |
| ORM              | Prisma                                    |
| Comunicación     | HTTP en `127.0.0.1:3001` mediante sidecar |
| Persistencia     | Directorio de datos de la aplicación      |

No se necesitan PostgreSQL, S3, colas de trabajo ni autenticación remota para
la primera versión local. Se evaluarían si la aplicación pasa a ser
multiusuario o si varias computadoras deben compartir los mismos datos.

## Desarrollo local

El backend está en el proyecto hermano `../distribuidora-backend`.

```bash
cd ../distribuidora-backend
npm install
npm run db:generate
npm run db:push
npm run dev
```

En otra terminal, desde este proyecto:

```bash
npm install
npm run dev
```

El frontend usa `VITE_API_URL=http://localhost:3001`. Si la variable está
vacía, conserva el modo local que procesa el Excel en el navegador. Ese modo es
un fallback de desarrollo; la versión persistente debe usar la API y SQLite.

## Persistencia con Tauri

`src-tauri/resources/distribuidora.db` es una base semilla incluida en el
instalador. No debe utilizarse como base activa porque los recursos empaquetados
no son el lugar adecuado para datos que deben sobrevivir a actualizaciones.

Cuando se ejecuta el backend compilado, `src/bootstrap.ts` copia la semilla al
directorio de datos de la aplicación si todavía no existe. La base activa debe
permanecer allí y debe incluir backups y restauración.

## Endpoints

| Método | Ruta               | Descripción                                                                                          |
| ------ | ------------------ | ---------------------------------------------------------------------------------------------------- |
| POST   | `/api/uploads`     | Recibe `multipart/form-data` con `file`, valida y procesa el Excel.                                  |
| GET    | `/api/uploads`     | Historial de cargas.                                                                                 |
| GET    | `/api/uploads/:id` | Detalle y estado de una carga.                                                                       |
| GET    | `/api/dashboard`   | KPIs, series y rankings. Query: `desde`, `hasta`, `vendedor`, `canal`, `ciudad`, `zona`.             |
| GET    | `/api/filtros`     | Valores disponibles para vendedor, canal, ciudad y zona.                                             |
| GET    | `/api/ventas`      | Filas paginadas. Query: `page`, `pageSize`, `desde`, `hasta`, `vendedor`, `canal`, `ciudad`, `zona`. |
| GET    | `/health`          | Verifica que el sidecar esté disponible.                                                             |

### Respuesta de una carga

```json
{
  "id": 1,
  "archivo": "ventas-2026-01.xlsx",
  "filasTotales": 25000,
  "filasNuevas": 24980,
  "filasOmitidas": 20,
  "estado": "procesado"
}
```

Los tipos compartidos del frontend están en `src/lib/types.ts`. Deben
mantenerse alineados con los tipos del backend en
`../distribuidora-backend/src/lib/types.ts`.

## Reglas de importación

- Cada fila del Excel representa una línea de comprobante.
- La importación debe ejecutarse dentro de una transacción.
- Las filas deben insertarse en lotes para no mantener una operación por fila.
- Reprocesar el mismo Excel no debe duplicar ventas.
- La clave única actual es (`nroDoc`, `codProducto`, `nroComprobante`). Debe
  validarse con los datos reales para confirmar que no faltan compañía,
  distribuidora o tipo de documento.
- `nroComprobante` se almacena como `BigInt` porque los comprobantes pueden
  superar el rango de un `Int` de Prisma. La API lo serializa como `number`.
- La deduplicación no debe cargar todas las claves de la tabla en memoria antes
  de cada importación.
- Los importes monetarios no deberían depender de `Float`; conviene utilizar
  enteros en guaraníes o una representación decimal controlada.

## SQLite y rendimiento

- Activar WAL para permitir lecturas mientras se escribe.
- Configurar un `busy_timeout` para evitar errores transitorios de bloqueo.
- Mantener índices para fecha y filtros.
- Agregar índices compuestos únicamente después de medir las consultas reales
  con `EXPLAIN QUERY PLAN`.
- Ejecutar los agregados del dashboard en SQL.
- Mantener `/api/ventas` paginado y no devolver todas las filas al frontend.
- Probar el rendimiento con 25.000, 300.000 y 1.500.000 filas.

## Backup y recuperación

La aplicación debe incluir:

- Backup manual de la base.
- Backup automático antes de una importación.
- Restauración desde un archivo `.db`.
- Opción de conservar los Excel originales.
- Verificación de integridad después de restaurar.

## Cuándo cambiar a PostgreSQL

SQLite deja de ser la opción adecuada si se necesita:

- Acceso simultáneo desde varias computadoras.
- Una base central compartida por varios usuarios.
- Varias importaciones concurrentes.
- Autenticación, roles y auditoría centralizados.

En ese caso Tauri puede conservarse como cliente, pero la API y la base deben
pasar a un servidor central con PostgreSQL.
