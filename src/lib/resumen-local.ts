import { aplicarFiltros } from "./metrics";
import type { Comparativo, Filtros, ResumenData, ResumenKpi, VentaRow } from "./types";

/**
 * Resumen ejecutivo (modo local). Replica la logica del endpoint
 * GET /api/dashboard/resumen para que la vista funcione sin conexion.
 * Como en el backend, el filtro de fechas se ignora: las ventanas (dia vigente,
 * mes vigente, mes anterior) salen del ultimo dia con datos.
 */

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

const pad = (n: number) => String(n).padStart(2, "0");
const armar = (anho: number, mes: number, dia: number) => `${anho}-${pad(mes)}-${pad(dia)}`;
const ultimoDia = (anho: number, mes: number) => new Date(anho, mes, 0).getDate();
const etiquetaMes = (anho: number, mes: number) => `${MESES[mes - 1]} ${anho}`;

const partes = (iso: string) => {
  const [anho, mes, dia] = iso.split("-").map(Number);
  return { anho: anho ?? 0, mes: mes ?? 0, dia: dia ?? 0 };
};

const etiquetaDia = (iso: string) => {
  const { anho, mes, dia } = partes(iso);
  return `${pad(dia)}/${pad(mes)}/${anho}`;
};

type Agregado = {
  ventaNeta: number;
  costo: number;
  facturas: number;
  unidades: number;
  clientes: number;
  filas: number;
};

const VACIO: Agregado = {
  ventaNeta: 0,
  costo: 0,
  facturas: 0,
  unidades: 0,
  clientes: 0,
  filas: 0,
};

/** Agregados de un tramo de fechas (ambos extremos inclusive). */
function agregar(rows: VentaRow[], desde: string, hasta: string): Agregado {
  const facturas = new Set<string>();
  const clientes = new Set<number>();
  const agg = { ...VACIO };

  for (const r of rows) {
    if (r.fecha < desde || r.fecha > hasta) continue;
    agg.filas += 1;
    agg.ventaNeta += r.montoVtaNetaGua ?? 0;
    agg.costo += r.costoVtaGua ?? 0;
    agg.unidades += r.vtaUnit ?? 0;
    facturas.add(r.nroDoc);
    if (r.codCliente !== null) clientes.add(r.codCliente);
  }

  agg.facturas = facturas.size;
  agg.clientes = clientes.size;
  return agg;
}

/** Clientes cuya primera compra historica cae dentro del tramo. */
function clientesNuevos(rows: VentaRow[], desde: string, hasta: string): number {
  const primera = new Map<number, string>();
  for (const r of rows) {
    if (r.codCliente === null) continue;
    const actual = primera.get(r.codCliente);
    if (actual === undefined || r.fecha < actual) primera.set(r.codCliente, r.fecha);
  }
  let total = 0;
  for (const fecha of primera.values()) if (fecha >= desde && fecha <= hasta) total += 1;
  return total;
}

const noDisponible = (motivo: string): Comparativo => ({ tipo: "no-disponible", motivo });

function delta(
  actual: number,
  base: number,
  hayDatosBase: boolean,
  etiquetaBase: string,
): Comparativo {
  if (!hayDatosBase) return noDisponible(`sin datos de ${etiquetaBase}`);
  if (base === 0) return noDisponible(`${etiquetaBase} sin ventas`);
  return {
    tipo: "delta",
    unidad: "pct",
    pct: (actual - base) / base,
    valorBase: base,
    base: etiquetaBase,
  };
}

function deltaPuntos(
  actual: number,
  base: number,
  hayDatosBase: boolean,
  etiquetaBase: string,
): Comparativo {
  if (!hayDatosBase) return noDisponible(`sin datos de ${etiquetaBase}`);
  return { tipo: "delta", unidad: "pp", pct: actual - base, valorBase: base, base: etiquetaBase };
}

const margen = (a: Agregado) => (a.ventaNeta ? (a.ventaNeta - a.costo) / a.ventaNeta : 0);

const BASE = {
  ventasDia: { titulo: "Ventas del día", formato: "moneda" },
  ventasMes: { titulo: "Ventas del mes", formato: "moneda" },
  margen: { titulo: "Margen bruto", formato: "porcentaje" },
  clientesActivos: { titulo: "Clientes activos", formato: "numero" },
  clientesNuevos: { titulo: "Clientes nuevos", formato: "numero" },
  facturas: { titulo: "Facturas", formato: "numero" },
  unidades: { titulo: "Unidades", formato: "numero" },
  cumplimientoObjetivo: { titulo: "Cumpl. objetivo", formato: "porcentaje" },
} as const satisfies Record<string, { titulo: string; formato: ResumenKpi["formato"] }>;

const CLAVES = Object.keys(BASE) as Array<keyof typeof BASE>;

/** Filtros del tablero sin las fechas: las alertas y el resumen las ignoran. */
export function sinFechas(f: Filtros): Filtros {
  const { desde: _desde, hasta: _hasta, ...resto } = f;
  return resto;
}

export function resumenLocal(rows: VentaRow[], filtros: Filtros): ResumenData {
  const base = aplicarFiltros(rows, sinFechas(filtros));

  let minFecha = "";
  let maxFecha = "";
  for (const r of base) {
    if (!r.fecha) continue;
    if (!minFecha || r.fecha < minFecha) minFecha = r.fecha;
    if (r.fecha > maxFecha) maxFecha = r.fecha;
  }

  if (!minFecha || !maxFecha) {
    return {
      referencia: null,
      primerDato: null,
      kpis: CLAVES.map((clave) => ({
        ...BASE[clave],
        clave,
        valor: null,
        estado: "sin-datos" as const,
        periodo: "",
        comparativo: noDisponible("sin ventas cargadas"),
      })),
    };
  }

  const hoy = maxFecha;
  const { anho, mes, dia } = partes(hoy);

  const mesDesde = armar(anho, mes, 1);
  const mesParcial = dia < ultimoDia(anho, mes);

  const anhoPrevio = mes === 1 ? anho - 1 : anho;
  const mesPrevio = mes === 1 ? 12 : mes - 1;
  const previoDesde = armar(anhoPrevio, mesPrevio, 1);
  const previoHasta = armar(anhoPrevio, mesPrevio, Math.min(dia, ultimoDia(anhoPrevio, mesPrevio)));

  const etiquetaTramo = mesParcial
    ? `${etiquetaMes(anhoPrevio, mesPrevio)} (1-${dia})`
    : etiquetaMes(anhoPrevio, mesPrevio);

  // Ultimo dia con ventas anterior al de referencia.
  let diaPrevio: string | null = null;
  for (const r of base) {
    if (r.fecha && r.fecha < hoy && (diaPrevio === null || r.fecha > diaPrevio))
      diaPrevio = r.fecha;
  }

  const actualDia = agregar(base, hoy, hoy);
  const previoDiaAgg = diaPrevio ? agregar(base, diaPrevio, diaPrevio) : VACIO;
  const actualMes = agregar(base, mesDesde, hoy);
  const previoMes = agregar(base, previoDesde, previoHasta);

  const hayDia = Boolean(diaPrevio) && previoDiaAgg.filas > 0;
  const hayMes = previoMes.filas > 0;
  const etiquetaDiaPrevio = diaPrevio ? etiquetaDia(diaPrevio) : "dias anteriores";

  const primerMes = partes(minFecha);
  const mesEsElPrimero = primerMes.anho === anho && primerMes.mes === mes;
  const previoEsElPrimero = primerMes.anho === anhoPrevio && primerMes.mes === mesPrevio;

  const nuevosActual = mesEsElPrimero ? null : clientesNuevos(base, mesDesde, hoy);
  const nuevosPrevio =
    mesEsElPrimero || previoEsElPrimero || !hayMes
      ? 0
      : clientesNuevos(base, previoDesde, previoHasta);
  const hayNuevosPrevio = hayMes && !previoEsElPrimero;

  const periodoMes = mesParcial
    ? `${etiquetaMes(anho, mes)} · al ${pad(dia)}/${pad(mes)}`
    : etiquetaMes(anho, mes);
  const estadoMes = mesParcial ? ("parcial" as const) : ("ok" as const);

  const delMes = (
    valor: number,
    base_: number,
  ): Pick<ResumenKpi, "estado" | "periodo" | "comparativo"> => ({
    estado: estadoMes,
    periodo: periodoMes,
    comparativo: delta(valor, base_, hayMes, etiquetaTramo),
  });

  const kpis: ResumenKpi[] = [
    {
      ...BASE.ventasDia,
      clave: "ventasDia",
      valor: actualDia.ventaNeta,
      estado: "ok",
      periodo: etiquetaDia(hoy),
      comparativo: delta(actualDia.ventaNeta, previoDiaAgg.ventaNeta, hayDia, etiquetaDiaPrevio),
    },
    {
      ...BASE.ventasMes,
      clave: "ventasMes",
      valor: actualMes.ventaNeta,
      ...delMes(actualMes.ventaNeta, previoMes.ventaNeta),
    },
    {
      ...BASE.margen,
      clave: "margen",
      valor: actualMes.ventaNeta ? margen(actualMes) : null,
      estado: actualMes.ventaNeta ? estadoMes : "sin-datos",
      periodo: periodoMes,
      comparativo: deltaPuntos(margen(actualMes), margen(previoMes), hayMes, etiquetaTramo),
    },
    {
      ...BASE.clientesActivos,
      clave: "clientesActivos",
      valor: actualMes.clientes,
      ...delMes(actualMes.clientes, previoMes.clientes),
    },
    {
      ...BASE.clientesNuevos,
      clave: "clientesNuevos",
      valor: nuevosActual,
      estado: mesEsElPrimero ? "sin-datos" : estadoMes,
      periodo: periodoMes,
      comparativo: mesEsElPrimero
        ? noDisponible("primer mes con datos: no hay historial previo")
        : delta(nuevosActual ?? 0, nuevosPrevio, hayNuevosPrevio, etiquetaTramo),
    },
    {
      ...BASE.facturas,
      clave: "facturas",
      valor: actualMes.facturas,
      ...delMes(actualMes.facturas, previoMes.facturas),
    },
    {
      ...BASE.unidades,
      clave: "unidades",
      valor: actualMes.unidades,
      ...delMes(actualMes.unidades, previoMes.unidades),
    },
    {
      ...BASE.cumplimientoObjetivo,
      clave: "cumplimientoObjetivo",
      valor: null,
      estado: "sin-configurar",
      periodo: periodoMes,
      comparativo: noDisponible("sin objetivos cargados"),
      accion: { texto: "Configurar objetivos", href: "/configuracion/objetivos" },
    },
  ];

  return { referencia: hoy, primerDato: minFecha, kpis };
}
