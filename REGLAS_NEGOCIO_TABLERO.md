# Reglas de negocio del tablero comercial

**Estado:** propuesta pendiente de aprobación  
**Alcance:** tablero comercial local basado en la tabla `Venta` de SQLite  
**Moneda:** guaraníes (Gs.)

Este documento define una única interpretación para las métricas del tablero.
Las consultas nuevas y los tipos de la API deben respetarlo. Cuando una métrica
no tenga una fuente confiable, el tablero debe mostrarla como no disponible y no
reemplazarla silenciosamente por un valor inventado.

## 1. Fuente y período

- La base SQLite es la fuente de verdad cuando el backend está conectado.
- La fecha de una venta es `Venta.fecha`, derivada de la columna `fecha` del
  Excel. Los campos `anho`, `mes`, `dia` y `anhoMes` son auxiliares y no
  reemplazan a `fecha`.
- `desde` y `hasta` son fechas calendario inclusivas en formato `YYYY-MM-DD`.
  El backend puede implementarlas internamente como `[desde, hasta + 1 día)`.
- Todos los indicadores, rankings, series y alertas respetan los filtros
  visibles de vendedor, canal, ciudad y zona.
- Los importes se calculan con el valor almacenado en la base. El redondeo se
  aplica únicamente al presentar el resultado en pantalla.

## 2. Ventas y notas de crédito

- El indicador principal es **venta neta**: `SUM(montoVtaNetaGua)`.
- La **venta bruta** es `SUM(montoIvaBrutaGua)` y se muestra como indicador
  complementario.
- Las notas de crédito forman parte de los agregados como movimientos con el
  signo recibido desde el Excel. No se deben invertir ni excluir de forma
  silenciosa.
- Se considera una inconsistencia de origen que una nota de crédito tenga un
  importe positivo cuando el sistema espera importes firmados. La importación
  o una validación posterior debe reportarlo para revisión.
- El margen porcentual es `(venta neta - costo de venta) / venta neta`. Si la
  venta neta es cero, el margen se informa como no disponible o cero solo en la
  capa visual que lo requiera, pero no se debe dividir por cero.
- Las unidades vendidas son `SUM(vtaUnit)`, conservando el signo del origen.

### Identidad de documento

Una fila de Excel representa una línea, no una factura completa. Para evitar
contar varias veces un mismo documento, la identidad propuesta es la
combinación:

`codCompania + codDistribuidora + tipoDoc + nroDoc + nroComprobante`

La cantidad de facturas debe contar documentos de venta, no notas de crédito.
La clave propuesta debe confirmarse con archivos reales antes de modificar la
restricción única o las consultas existentes, porque la implementación actual
cuenta por `nroDoc` y la restricción actual usa solo
`nroDoc + codProducto + nroComprobante`.

El ticket promedio se calcula como venta neta dividida por la cantidad de
documentos de venta válidos. Las notas de crédito afectan el importe neto, pero
no agregan un ticket de venta al denominador.

## 3. Clientes

- **Cliente activo:** cliente cuyo importe neto acumulado en el período visible
  y con los filtros activos es mayor que cero. Un cliente con únicamente notas
  de crédito no cuenta como activo.
- **Cliente nuevo:** cliente cuya primera compra histórica válida pertenece al
  período visible. La primera compra válida es el primer documento que no sea
  nota de crédito y tenga importe neto positivo.
- La búsqueda de primera compra usa todo el histórico disponible, sin limitarse
  al período visible. Luego se aplican los filtros a la venta que originó el
  alta, de modo que el indicador siga siendo auditable cuando se filtra por
  vendedor, canal, ciudad o zona.
- Si no existe histórico anterior suficiente, la comparación de clientes
  nuevos se informa como no disponible, no como cero.

## 4. Comparaciones y variaciones

- La comparación se realiza siempre sobre venta neta y con los mismos filtros
  dimensionales del período visible.
- Para un día se compara contra el día calendario anterior.
- Para un mes calendario completo se compara contra el mes calendario anterior
  cuando la tarjeta diga “vs. mes anterior”, y contra el mismo mes del año
  anterior cuando diga “interanual”.
- Para un rango arbitrario se compara contra el rango inmediatamente anterior
  de igual cantidad de días calendario.
- Una comparación sin datos históricos suficientes tiene estado `sin_historico`.
  No se debe mostrar `0%` en ese caso.
- La variación absoluta es `actual - anterior`.
- La variación porcentual es `(actual - anterior) / anterior` cuando el valor
  anterior es distinto de cero.
- Para las alertas, se propone considerar **caída** una variación menor o igual
  a `-10%` y **crecimiento** una variación mayor o igual a `+10%`. No se genera
  alerta porcentual cuando el período comparativo vale cero.

## 5. Objetivos comerciales

- Los objetivos no se deducen desde las ventas ni desde la imagen de referencia.
  Solo se usan cuando exista un registro explícito de objetivo.
- La unidad inicial propuesta es un objetivo por mes calendario.
- El alcance puede ser general, vendedor, zona, canal o una combinación de
  dimensiones.
- No puede haber dos objetivos para el mismo período y alcance.
- Se usa únicamente el objetivo cuyo alcance coincide exactamente con los
  filtros activos. No se debe sustituir automáticamente por el objetivo
  general si falta uno específico.
- Para períodos de varios meses, el objetivo es la suma de los objetivos
  mensuales incluidos. Si falta al menos un mes, el cumplimiento queda marcado
  como `incompleto`.
- El porcentaje de cumplimiento es `venta neta acumulada / objetivo`.
  Si no existe objetivo o el objetivo es cero, el porcentaje y la diferencia se
  informan como no disponibles; nunca se muestra `100%` por defecto.

## 6. Zona y mapa

- `Venta.zona` es la división comercial provista por el Excel. No se deriva a
  partir de ciudad, coordenadas o geocodificación.
- Las filas sin zona se normalizan como `SIN ZONA`, siguiendo el importador
  actual.
- La suma por zona incluye también `SIN ZONA`, para que el total de zonas sea
  igual al total filtrado del tablero.
- Latitud y longitud son opcionales y solo determinan si una fila puede dibujar
  un punto. La falta de coordenadas no elimina la venta de la agregación.
- Si se usa un mapa coroplético, la clave de zona debe conservar una relación
  explícita con el GeoJSON; no se debe adivinar una geometría por el nombre.

## 7. Alertas y visitas

- Una alerta debe incluir entidad, período actual, período comparativo, regla,
  valor actual, valor de referencia y severidad.
- No se generan alertas de caída o crecimiento si no existe un período
  comparable válido.
- Las visitas no se infieren desde ventas. Requieren una fuente separada y
  auditable, inicialmente una tabla local `Visita` o un endpoint equivalente.
- Los campos mínimos propuestos para una visita son cliente, vendedor, fecha,
  motivo, estado, prioridad y observaciones.
- Una próxima visita importante es la visita futura más cercana con estado
  pendiente o confirmada y prioridad alta. “Sin visitas cargadas” es distinto de
  “no hay visitas próximas”.

## 8. Confirmaciones requeridas

Antes de cerrar la Etapa 0 se deben confirmar estas decisiones con el negocio:

1. Que las notas de crédito llegan con signo negativo y deben incluirse como
   movimientos netos.
2. Que la identidad compuesta propuesta distingue correctamente documentos de
   compañías, distribuidoras y tipos distintos.
3. Que cliente activo significa neto positivo y cliente nuevo significa primera
   compra histórica válida.
4. Que el umbral inicial de alertas es `10%`.
5. Que los objetivos son mensuales y no se aplica fallback al objetivo general.
6. Que `zona` representa territorios comerciales y que `SIN ZONA` debe aparecer
   en los totales.
7. Que las visitas se cargarán mediante una fuente separada y tendrán prioridad.

Una vez aprobados estos puntos, la Etapa 1 puede ampliar `DashboardData` y
documentar el contrato de la API sin cambiar definiciones entre backend y
frontend.
