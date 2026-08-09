# Plan de implementación del tablero comercial

## Objetivo

Completar el tablero comercial para cubrir los indicadores, comparativos,
gráficos, alertas y tablas mostrados en la imagen de referencia de WhatsApp.

El alcance incluye:

- Backend local en Fastify, Prisma y SQLite.
- Frontend React/TanStack/Tauri.
- Cálculo desde la base de datos cuando el backend está conectado.
- Modo mock como fallback para desarrollo y demostraciones.
- Pruebas con archivos Excel reales y con datos históricos.

## Estado actual

Ya existe una base funcional:

- Importación de Excel.
- Persistencia local en SQLite.
- Endpoint `GET /api/dashboard`.
- Filtros por fecha, vendedor, canal, ciudad y zona.
- KPIs básicos de ventas, facturas, unidades, clientes, productos, margen y ticket.
- Evolución diaria de ventas.
- Rankings por vendedor, ciudad, canal, marca, cliente y producto.
- Campos de zona, latitud y longitud en las ventas.

La implementación actual todavía no cubre:

- Comparaciones contra mes y año anterior.
- Acumulado anual y acumulado de 12 meses.
- Clientes nuevos.
- Objetivos comerciales y porcentaje de cumplimiento.
- Mapa de ventas por zona.
- Alertas comerciales.
- Visitas importantes.
- Comparación de ventas entre períodos en una misma serie.

## Criterios de diseño

- La base de datos será la fuente de verdad cuando el backend esté conectado.
- El frontend no debe cargar todas las ventas para calcular el tablero en modo backend.
- Las agregaciones grandes deben ejecutarse en SQL.
- Las métricas deben tener una definición única compartida por backend y frontend.
- Las fechas deben trabajar con períodos explícitos para evitar mezclar meses o años.
- Los objetivos y las visitas no deben inferirse de forma silenciosa si no existe una fuente confiable.
- Cada etapa debe dejar el proyecto compilable y usable.

## Etapa 0: definir reglas de negocio

**Prioridad:** alta  
**Dependencia:** ninguna  
**Estimación:** 0,5 a 1 día

### Decisiones necesarias

- Definir si las métricas se basan en venta bruta, venta neta o venta neta incluyendo/excluyendo notas de crédito.
- Definir qué fecha controla cada período: fecha de emisión, año/mes del Excel u otra.
- Definir cómo se calcula “cliente nuevo”: primera compra histórica o primera compra dentro del período visible.
- Definir qué significa “cliente activo”: cualquier compra, compra neta positiva o factura válida.
- Definir qué se considera venta en caída y crecimiento.
- Definir si el objetivo aplica a toda la empresa, zona, vendedor, canal o una combinación.
- Definir la fuente de las próximas visitas y los campos mínimos necesarios.
- Confirmar si “zona” corresponde a departamentos, ciudades, territorios comerciales u otra división.

### Entregable

Un documento corto de reglas aprobado antes de cerrar las consultas SQL. Sin estas
definiciones, dos pantallas podrían mostrar números diferentes para el mismo
indicador.

## Etapa 1: ampliar el contrato de datos

**Prioridad:** alta  
**Dependencia:** etapa 0  
**Estimación:** 1 día

### Backend

- Ampliar `DashboardData` en `distribuidora-backend/src/lib/types.ts`.
- Definir estructuras para:
  - KPIs actuales, anteriores y acumulados.
  - Series del período actual y período comparativo.
  - Acumulado de los últimos 12 meses.
  - Ventas por zona para el mapa.
  - Comparativo tabular.
  - Alertas.
  - Objetivos y cumplimiento.
- Mantener tipos equivalentes en `distribuidora-front/src/lib/types.ts`.
- Definir si se amplía `GET /api/dashboard` o si se crean endpoints separados para objetivos y visitas.
- Versionar cualquier cambio de contrato en la documentación de la API.

### Frontend

- Actualizar los tipos compartidos.
- Preparar estados de carga, ausencia de datos y error para las nuevas secciones.
- No renderizar valores inventados cuando una métrica todavía no tiene fuente.

### Criterio de aceptación

Backend y frontend compilan usando el mismo contrato, incluso antes de conectar
todas las consultas definitivas.

## Etapa 2: completar métricas derivadas de ventas

**Prioridad:** alta  
**Dependencia:** etapas 0 y 1  
**Estimación:** 1 a 2 días

Estas métricas pueden calcularse usando la tabla `Venta`, sin nuevas tablas de
negocio.

### Backend

- Agregar venta del día, venta del mes y acumulado del año.
- Calcular comparación contra el día, mes y año anterior.
- Calcular variación absoluta y porcentual.
- Calcular acumulado mensual de los últimos 12 meses.
- Generar la serie diaria del período actual y del período comparativo.
- Evitar agrupar únicamente por `dia` cuando el filtro abarca más de un mes.
- Revisar el tratamiento de notas de crédito en cada agregado.
- Mantener los filtros de vendedor, canal, ciudad y zona en todas las consultas.
- Crear consultas SQL con períodos explícitos y revisar sus planes de ejecución.

### Frontend

- Agregar los KPI de:
  - Ventas del día.
  - Ventas del mes.
  - Ventas versus mes anterior.
  - Acumulado del año.
  - Clientes activos.
  - Cantidad de facturas.
  - Unidades vendidas.
  - Ticket promedio.
  - Clientes nuevos del mes, cuando la regla esté definida.
- Mostrar variaciones con signo, porcentaje y período de comparación.
- Agregar la línea del año anterior a la evolución diaria.
- Agregar el gráfico de acumulado de ventas de los últimos 12 meses.
- Agregar la tabla comparativa de indicadores.

### Criterio de aceptación

Con un conjunto de datos conocido, los totales del día, mes, año, períodos
comparativos y últimos 12 meses coinciden con cálculos independientes realizados
sobre el Excel original.

## Etapa 3: completar visualizaciones de ventas

**Prioridad:** alta  
**Dependencia:** etapa 2  
**Estimación:** 1 a 2 días

### Backend

- Mantener rankings de vendedor, ciudad, canal, marca, cliente y producto.
- Agregar agregación por zona con valor total y participación.
- Devolver latitud y longitud representativas cuando el mapa use puntos.
- Si el mapa es coroplético, preparar una clave de zona compatible con el GeoJSON.
- Definir el tratamiento de valores sin ciudad o sin zona.

### Frontend

- Mantener el ranking de vendedores top 10.
- Mantener la dona de ventas por ciudad.
- Implementar ventas por zona como mapa o mapa coroplético.
- Incorporar leyenda de mayor/menor venta y tooltip con valor, zona y participación.
- Elegir una solución de mapa compatible con Tauri y definir la fuente de mapas.
- Incorporar estados para zona sin coordenadas o sin geometría.

### Criterio de aceptación

El total mostrado por zona coincide con el total filtrado del tablero y ninguna
venta desaparece silenciosamente por no tener coordenadas o geometría.

## Etapa 4: objetivos comerciales

**Prioridad:** media-alta  
**Dependencia:** etapa 0  
**Estimación:** 2 a 4 días

Los objetivos no existen actualmente en el modelo `Venta`, por lo que requieren
una fuente adicional.

### Backend

- Diseñar una tabla `Objetivo` con período, monto, alcance y estado.
- Definir el alcance del objetivo: general, vendedor, zona, canal o combinación.
- Agregar restricciones para evitar objetivos duplicados para el mismo período y alcance.
- Crear endpoints para consultar y, si corresponde, administrar objetivos.
- Calcular porcentaje de cumplimiento y diferencia contra el objetivo.
- Definir qué objetivo se usa cuando hay filtros activos.
- Agregar validación para objetivos inexistentes o períodos incompletos.

### Frontend

- Agregar KPI `% cumplimiento objetivo`.
- Mostrar monto objetivo, venta acumulada y diferencia restante.
- Agregar una barra de progreso accesible.
- Crear una pantalla o diálogo de configuración si el usuario debe cargar objetivos.
- Mostrar claramente cuando no existe un objetivo configurado.

### Criterio de aceptación

El porcentaje de cumplimiento es reproducible para el período y los filtros
seleccionados, y nunca muestra `100%` por falta de objetivo.

## Etapa 5: alertas comerciales

**Prioridad:** media  
**Dependencia:** etapas 0, 2 y 4  
**Estimación:** 1 a 2 días

### Backend

- Definir la regla y umbral de cada alerta.
- Generar alertas para:
  - Vendedores con ventas en caída.
  - Clientes sin compras durante el período definido.
  - Productos en caída.
  - Productos en crecimiento.
  - Vendedores bajo objetivo.
- Devolver severidad, título, descripción, cantidad, valor de referencia y período.
- Evitar que una alerta se base en una comparación inválida por falta de histórico.
- Aplicar los filtros del tablero cuando la alerta corresponda al contexto visible.

### Frontend

- Crear un componente reutilizable de tarjeta de alerta.
- Mostrar las seis tarjetas de la referencia con colores y estados consistentes.
- Permitir navegar al detalle filtrado cuando la alerta tenga una entidad asociada.
- Mostrar estado vacío cuando no existan alertas.

### Criterio de aceptación

Cada alerta puede explicarse con datos concretos: entidad, período actual,
período comparativo y regla que la activó.

## Etapa 6: clientes y próximas visitas

**Prioridad:** media  
**Dependencia:** etapa 0  
**Estimación:** 2 a 4 días

### Backend

- Confirmar si el Excel contiene información suficiente para detectar clientes nuevos.
- Calcular la primera compra histórica por cliente, si corresponde.
- Diseñar una tabla `Visita` si las visitas no vienen del Excel.
- Definir campos mínimos: cliente, vendedor, fecha, motivo, estado y observaciones.
- Crear endpoint para obtener próximas visitas importantes.
- Asociar visitas con clientes y vendedores existentes.

### Frontend

- Mostrar `Clientes nuevos (mes)` con su comparación interanual o mensual.
- Mostrar tarjeta de próxima visita importante.
- Agregar detalle de visitas si el usuario necesita gestionarlas.
- Diferenciar “sin visitas cargadas” de “no hay visitas próximas”.

### Criterio de aceptación

La métrica de clientes nuevos y la próxima visita tienen una fuente identificable
y pueden auditarse desde los datos cargados.

## Etapa 7: integrar el layout del tablero

**Prioridad:** media  
**Dependencia:** etapas 2 a 6  
**Estimación:** 1 a 2 días

### Frontend

- Reorganizar `src/routes/index.tsx` para acercar la distribución a la imagen:
  - Encabezado y filtros.
  - Primera fila de KPI.
  - Segunda fila de KPI.
  - Evolución diaria, ranking de vendedores y ciudad.
  - Comparativo, acumulado anual/12 meses y mapa.
  - Alertas y top 5 clientes.
- Extraer secciones grandes a componentes independientes para evitar que la ruta se vuelva difícil de mantener.
- Mantener responsive para escritorio y pantallas pequeñas.
- Agregar fecha y hora de última actualización.
- Agregar acción de refrescar datos cuando el backend esté conectado.
- Revisar consistencia visual de colores, leyendas, tooltips y estados vacíos.

### Criterio de aceptación

El tablero conserva la información esencial en móvil, no desborda tablas ni
gráficos y cada sección indica cuándo está cargando o no tiene datos.

## Etapa 8: rendimiento, validación y empaquetado

**Prioridad:** alta antes del uso real  
**Dependencia:** etapas anteriores  
**Estimación:** 2 a 4 días

### Backend

- Probar consultas con 25.000, 300.000 y 1.500.000 filas.
- Ejecutar `EXPLAIN QUERY PLAN` para las consultas nuevas.
- Agregar índices solo cuando las mediciones lo justifiquen.
- Confirmar que las respuestas del dashboard no devuelvan todas las ventas.
- Validar conversiones de fechas, montos y porcentajes.
- Confirmar que los agregados de períodos vacíos devuelvan ceros y no `null` inesperados.
- Completar pruebas de importación idempotente antes de validar los gráficos.

### Frontend

- Verificar que el modo backend no use `rows` para recalcular el dashboard.
- Verificar que el modo mock tenga un comportamiento documentado para métricas que requieren histórico u objetivos.
- Probar filtros combinados y cambios rápidos de período.
- Probar errores de red, backend apagado y respuestas incompletas.
- Validar accesibilidad de tablas, tooltips, colores y barras de progreso.
- Ejecutar build de Vite y empaquetado Tauri.

### Pruebas funcionales mínimas

- Cargar un Excel de un solo mes.
- Cargar dos o más meses y verificar comparativos.
- Reimportar el mismo archivo y verificar que no se duplique.
- Filtrar por vendedor, zona, ciudad y canal.
- Verificar que todos los paneles respeten los filtros.
- Cargar un objetivo y validar el porcentaje de cumplimiento.
- Crear una visita y verificar que aparezca como próxima visita.
- Probar datos sin coordenadas, sin zona y con notas de crédito.
- Cerrar y abrir la aplicación y verificar persistencia.

### Criterio de aceptación

La aplicación muestra los mismos totales que el Excel de referencia, conserva los
datos al reiniciarse y funciona con el volumen esperado sin cargar toda la base
en el navegador.

## Orden recomendado de ejecución

1. Aprobar las reglas de negocio de la etapa 0.
2. Ampliar tipos y contrato de API.
3. Implementar comparativos y acumulados basados únicamente en `Venta`.
4. Incorporar las visualizaciones y el mapa.
5. Agregar objetivos y porcentaje de cumplimiento.
6. Agregar alertas.
7. Agregar clientes nuevos y visitas.
8. Ajustar layout, responsive y estados de interfaz.
9. Ejecutar pruebas de volumen, persistencia y empaquetado.

## Estimación global

- Métricas y gráficos que usan datos ya existentes: **3 a 5 días hábiles**.
- Objetivos, alertas, clientes nuevos y visitas: **4 a 8 días hábiles**.
- Pruebas con datos reales, rendimiento y empaquetado: **2 a 4 días hábiles**.

Estimación total para cubrir la imagen de forma completa: **1 a 2 semanas de
trabajo**, dependiendo de la disponibilidad de datos de objetivos y visitas y de
las decisiones de negocio pendientes.
