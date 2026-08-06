# Backend requerido

El front ya está preparado: toda la comunicación pasa por `src/lib/api.ts`.
Definí `VITE_API_URL` en el `.env` y el dashboard consume el backend real; sin
esa variable trabaja en "modo local" (procesa el Excel en el navegador).

## Tecnologías sugeridas

| Necesidad          | Opción recomendada                                        |
| ------------------ | --------------------------------------------------------- |
| API                | Node + TypeScript (NestJS o Fastify) — o Python + FastAPI |
| Lectura de Excel   | `xlsx` / `exceljs` (Node) o `pandas` + `openpyxl` (Python) |
| Base de datos      | PostgreSQL (tabla `ventas` + tabla `cargas`)              |
| ORM                | Prisma o Drizzle (Node) / SQLAlchemy (Python)             |
| Subida de archivos | `multer` (Node) / `UploadFile` (FastAPI) + storage S3     |
| Procesos largos    | Cola (BullMQ / Celery) si los Excel son grandes           |
| Auth               | JWT + roles (admin / gerencia / vendedor)                 |

> Alternativa sin backend propio: activar **Lovable Cloud** (base de datos,
> auth y funciones de servidor ya integradas).

## Endpoints que consume el front

| Método | Ruta                | Descripción                                                                              |
| ------ | ------------------- | ---------------------------------------------------------------------------------------- |
| POST   | `/api/uploads`      | `multipart/form-data` con `file`. Procesa el Excel e inserta filas. → `{ id, filas, estado }` |
| GET    | `/api/uploads`      | Historial de cargas → `[{ id, archivo, filas, creadoEn, estado }]`                       |
| GET    | `/api/uploads/:id`  | Estado de un procesamiento                                                               |
| GET    | `/api/dashboard`    | KPIs + series + rankings. Query: `desde, hasta, vendedor, canal, ciudad, zona`            |
| GET    | `/api/filtros`      | `{ vendedores, canales, ciudades, zonas }`                                               |
| GET    | `/api/ventas`       | Filas paginadas. Query: `page, pageSize` + filtros → `{ data, total }`                    |

Los tipos de respuesta están en `src/lib/types.ts` (`DashboardData`,
`OpcionesFiltro`, `VentaRow`) y la lógica de cálculo de referencia en
`src/lib/metrics.ts` (`calcularDashboard`), lista para replicar en SQL.

## Modelo de datos

Una fila del Excel = una línea de comprobante. Claves útiles:
`nro doc` (factura), `cod cliente`, `cod producto`, `cod vendedor`,
`cod canal`, `cod zona`, `ciudad`, `monto vta neta gua`, `costo vta gua`,
`vta unit`, `fecha`.

Recomendación: índice único por (`nro doc`, `cod producto`, `nro comprobante`)
para que reprocesar el mismo Excel sea idempotente (upsert).
