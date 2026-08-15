import { aplicarFiltros } from "./metrics";
import { sinFechas } from "./resumen-local";
import type {
  Alerta,
  AlertasData,
  ColumnaDetalle,
  DetalleAlerta,
  FilaDetalle,
  Filtros,
  VentaRow,
} from "./types";

/**
 * Alertas de caida/crecimiento (modo local). Replica la logica de los endpoints
 * GET /api/dashboard/alertas y /alertas/:clave para que la vista funcione sin
 * conexion. Como en el backend, el filtro de fechas se ignora.
 */

/** Dias sin comprar a partir de los cuales un cliente se considera inactivo. */
const DIAS_SIN_COMPRAS = 30;

/** Tope de filas devueltas al modal; `total` informa cuantas cumplen la condicion. */
const LIMITE_DETALLE = 300;

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

const pad = (n: number) => String(n).padStart(2, "0");
const armar = (anho: number, mes: number, dia: number) => `${anho}-${pad(mes)}-${pad(dia)}`;
const ultimoDia = (anho: number, mes: number) => new Date(anho, mes, 0).getDate();
const etiquetaMes = (anho: number, mes: number) => `${MESES[mes - 1]} ${anho}`;

const partes = (iso: string) => {
  const [anho, mes, dia] = iso.split("-").map(Number);
  return { anho: anho ?? 0, mes: mes ?? 0, dia: dia ?? 0 };
};

const aUTC = (iso: string) => {
  const { anho, mes, dia } = partes(iso);
  return Date.UTC(anho, mes - 1, dia);
};

const DIA_MS = 86_400_000;
const desplazarDias = (iso: string, dias: number) =>
  new Date(aUTC(iso) + dias * DIA_MS).toISOString().slice(0, 10);
const diasEntre = (desde: string, hasta: string) =>
  Math.round((aUTC(hasta) - aUTC(desde)) / DIA_MS);
const restarUnAnho = (iso: string) => {
  const { anho, mes, dia } = partes(iso);
  return armar(anho - 1, mes, dia);
};

type Tramo = { desde: string; hasta: string };

const enTramo = (fecha: string, t: Tramo) => fecha >= t.desde && fecha <= t.hasta;

const BASE = {
  vendedoresEnCaida: { titulo: "Ventas en caída", unidad: "vendedores", tono: "critico" },
  clientesSinCompras: { titulo: "Clientes sin compras", unidad: "clientes", tono: "critico" },
  productosEnCaida: { titulo: "Productos en caída", unidad: "productos", tono: "advertencia" },
  productosEnCrecimiento: {
    titulo: "Productos en crecimiento",
    unidad: "productos",
    tono: "positivo",
  },
} as const satisfies Record<string, Pick<Alerta, "titulo" | "unidad" | "tono">>;

export type ClaveAlerta = keyof typeof BASE;

const CLAVES = Object.keys(BASE) as ClaveAlerta[];

export const esClaveAlerta = (clave: string): clave is ClaveAlerta =>
  (CLAVES as string[]).includes(clave);

type Ventana = {
  actual: Tramo;
  previo: Tramo;
  mesParcial: boolean;
  /** Texto al pie: "vs. jul 2026 (1-11)". */
  detalleMes: string;
};

/** Mes vigente de la referencia y el mismo tramo de dias del mes anterior. */
function ventana(referencia: string): Ventana {
  const { anho, mes, dia } = partes(referencia);
  const actual: Tramo = { desde: armar(anho, mes, 1), hasta: referencia };

  const anhoPrevio = mes === 1 ? anho - 1 : anho;
  const mesPrevio = mes === 1 ? 12 : mes - 1;
  const previo: Tramo = {
    desde: armar(anhoPrevio, mesPrevio, 1),
    // Mismo tramo de dias en ambos meses: comparar un mes parcial contra uno
    // completo marcaria caidas que solo son dias que todavia no ocurrieron.
    hasta: armar(anhoPrevio, mesPrevio, Math.min(dia, ultimoDia(anhoPrevio, mesPrevio))),
  };

  const mesParcial = dia < ultimoDia(anho, mes);
  const baseComparacion = mesParcial
    ? `${etiquetaMes(anhoPrevio, mesPrevio)} (1-${dia})`
    : etiquetaMes(anhoPrevio, mesPrevio);

  return { actual, previo, mesParcial, detalleMes: `vs. ${baseComparacion}` };
}

/** Ultimo dia con ventas dentro de los filtros; null si no hay datos. */
function fechaReferencia(rows: VentaRow[]): string | null {
  let max = "";
  for (const r of rows) if (r.fecha && r.fecha > max) max = r.fecha;
  return max || null;
}

type Variacion = {
  nombre: string;
  actual: number;
  previo: number;
  unidades: number;
  clientes: number;
  ultimaVenta: string | null;
};

/**
 * Entidades (vendedor o producto) con su venta neta del tramo actual y del
 * previo. Solo entran las que vendieron en el tramo previo: sin base de
 * comparacion no hay caida ni crecimiento.
 */
function variaciones(
  rows: VentaRow[],
  columna: "vendedor" | "codProducto",
  direccion: "caida" | "crecimiento",
  actual: Tramo,
  previo: Tramo,
): Variacion[] {
  type Agg = Variacion & { clientesSet: Set<number> };
  const porClave = new Map<string, Agg>();

  for (const r of rows) {
    const bruto = columna === "vendedor" ? r.vendedor : r.codProducto;
    if (bruto === null || bruto === undefined || bruto === "") continue;
    const clave = String(bruto);

    let agg = porClave.get(clave);
    if (!agg) {
      agg = {
        // Los productos se agrupan por codigo, pero se muestran por nombre.
        nombre: columna === "vendedor" ? String(bruto) : `Cód. ${clave}`,
        actual: 0,
        previo: 0,
        unidades: 0,
        clientes: 0,
        ultimaVenta: null,
        clientesSet: new Set<number>(),
      };
      porClave.set(clave, agg);
    }
    if (columna === "codProducto" && r.producto) agg.nombre = r.producto;

    if (enTramo(r.fecha, actual)) {
      agg.actual += r.montoVtaNetaGua ?? 0;
      agg.unidades += r.vtaUnit ?? 0;
      if (r.codCliente !== null) agg.clientesSet.add(r.codCliente);
      if (agg.ultimaVenta === null || r.fecha > agg.ultimaVenta) agg.ultimaVenta = r.fecha;
    }
    if (enTramo(r.fecha, previo)) agg.previo += r.montoVtaNetaGua ?? 0;
  }

  const cumple = (v: Agg) =>
    v.previo > 0 && (direccion === "caida" ? v.actual < v.previo : v.actual > v.previo);

  // Caida: primero la peor (diferencia mas negativa). Crecimiento: la mayor.
  const signo = direccion === "caida" ? 1 : -1;

  return [...porClave.values()]
    .filter(cumple)
    .map(({ clientesSet, ...v }) => ({ ...v, clientes: clientesSet.size }))
    .sort((a, b) => signo * (a.actual - a.previo - (b.actual - b.previo)));
}

type ClienteInactivo = {
  nombre: string;
  ruc: string | null;
  ultimaCompra: string;
  diasSinComprar: number;
  montoUltimoAnho: number;
  compras: number;
  vendedor: string | null;
  ciudad: string | null;
};

/** Clientes con al menos una compra historica y sin comprar desde hace N dias. */
function clientesSinCompras(rows: VentaRow[], referencia: string, dias: number): ClienteInactivo[] {
  type Agg = Omit<ClienteInactivo, "compras" | "diasSinComprar"> & { facturas: Set<string> };
  const porCliente = new Map<number, Agg>();
  const desdeAnho = restarUnAnho(referencia);

  for (const r of rows) {
    if (r.codCliente === null) continue;
    let agg = porCliente.get(r.codCliente);
    if (!agg) {
      agg = {
        nombre: `Cód. ${r.codCliente}`,
        ruc: null,
        ultimaCompra: "",
        montoUltimoAnho: 0,
        vendedor: null,
        ciudad: null,
        facturas: new Set<string>(),
      };
      porCliente.set(r.codCliente, agg);
    }
    if (r.razonSocial) agg.nombre = r.razonSocial;
    if (r.ruc) agg.ruc = r.ruc;
    if (r.vendedor) agg.vendedor = r.vendedor;
    if (r.ciudad) agg.ciudad = r.ciudad;
    if (r.fecha > agg.ultimaCompra) agg.ultimaCompra = r.fecha;
    if (r.fecha >= desdeAnho) agg.montoUltimoAnho += r.montoVtaNetaGua ?? 0;
    agg.facturas.add(r.nroDoc);
  }

  const corte = desplazarDias(referencia, -dias);

  return [...porCliente.values()]
    .filter((a) => a.ultimaCompra && a.ultimaCompra < corte)
    .map(({ facturas, ...a }) => ({
      ...a,
      compras: facturas.size,
      diasSinComprar: diasEntre(a.ultimaCompra, referencia),
    }))
    .sort((a, b) => b.montoUltimoAnho - a.montoUltimoAnho || b.diasSinComprar - a.diasSinComprar);
}

export function alertasLocal(rows: VentaRow[], filtros: Filtros): AlertasData {
  const base = aplicarFiltros(rows, sinFechas(filtros));
  const referencia = fechaReferencia(base);

  if (!referencia) {
    return {
      referencia: null,
      alertas: CLAVES.map((clave) => ({
        ...BASE[clave],
        clave,
        valor: null,
        estado: "sin-datos" as const,
        detalle: "sin ventas cargadas",
      })),
    };
  }

  const { actual, previo, mesParcial, detalleMes } = ventana(referencia);

  const valores: Record<ClaveAlerta, number> = {
    vendedoresEnCaida: variaciones(base, "vendedor", "caida", actual, previo).length,
    clientesSinCompras: clientesSinCompras(base, referencia, DIAS_SIN_COMPRAS).length,
    productosEnCaida: variaciones(base, "codProducto", "caida", actual, previo).length,
    productosEnCrecimiento: variaciones(base, "codProducto", "crecimiento", actual, previo).length,
  };

  return {
    referencia,
    alertas: CLAVES.map((clave) => ({
      ...BASE[clave],
      clave,
      valor: valores[clave],
      estado: clave === "clientesSinCompras" || !mesParcial ? "ok" : "parcial",
      detalle:
        clave === "clientesSinCompras" ? `más de ${DIAS_SIN_COMPRAS} días sin compras` : detalleMes,
    })),
  };
}

const COLUMNAS_VARIACION: ColumnaDetalle[] = [
  { clave: "nombre", titulo: "Nombre", tipo: "texto" },
  { clave: "actual", titulo: "Mes vigente", tipo: "moneda" },
  { clave: "previo", titulo: "Mes anterior", tipo: "moneda" },
  { clave: "diferencia", titulo: "Diferencia", tipo: "moneda" },
  { clave: "variacion", titulo: "Variación", tipo: "porcentaje" },
  { clave: "unidades", titulo: "Unidades", tipo: "numero" },
  { clave: "clientes", titulo: "Clientes", tipo: "numero" },
  { clave: "ultimaVenta", titulo: "Última venta", tipo: "fecha" },
];

const COLUMNAS_CLIENTES: ColumnaDetalle[] = [
  { clave: "nombre", titulo: "Cliente", tipo: "texto" },
  { clave: "ruc", titulo: "RUC", tipo: "texto" },
  { clave: "diasSinComprar", titulo: "Días sin comprar", tipo: "numero" },
  { clave: "ultimaCompra", titulo: "Última compra", tipo: "fecha" },
  { clave: "montoUltimoAnho", titulo: "Comprado (últ. 12 meses)", tipo: "moneda" },
  { clave: "compras", titulo: "Facturas (histórico)", tipo: "numero" },
  { clave: "vendedor", titulo: "Vendedor", tipo: "texto" },
  { clave: "ciudad", titulo: "Ciudad", tipo: "texto" },
];

/** Filas que explican una alerta, con las mismas ventanas y filtros del contador. */
export function detalleAlertaLocal(
  rows: VentaRow[],
  clave: ClaveAlerta,
  filtros: Filtros,
): DetalleAlerta {
  const base = aplicarFiltros(rows, sinFechas(filtros));
  const referencia = fechaReferencia(base);

  const vacio: DetalleAlerta = {
    clave,
    titulo: BASE[clave].titulo,
    detalle: "sin ventas cargadas",
    columnas: clave === "clientesSinCompras" ? COLUMNAS_CLIENTES : COLUMNAS_VARIACION,
    filas: [],
    total: 0,
  };
  if (!referencia) return vacio;

  const { actual, previo, detalleMes } = ventana(referencia);

  if (clave === "clientesSinCompras") {
    const inactivos = clientesSinCompras(base, referencia, DIAS_SIN_COMPRAS);
    return {
      ...vacio,
      detalle: `más de ${DIAS_SIN_COMPRAS} días sin compras · al ${referencia}`,
      filas: inactivos.slice(0, LIMITE_DETALLE) as unknown as FilaDetalle[],
      total: inactivos.length,
    };
  }

  const columna = clave === "vendedoresEnCaida" ? "vendedor" : "codProducto";
  const direccion = clave === "productosEnCrecimiento" ? "crecimiento" : "caida";
  const encontradas = variaciones(base, columna, direccion, actual, previo);

  const filas: FilaDetalle[] = encontradas.slice(0, LIMITE_DETALLE).map((v) => ({
    nombre: v.nombre,
    actual: v.actual,
    previo: v.previo,
    diferencia: v.actual - v.previo,
    variacion: v.previo > 0 ? ((v.actual - v.previo) / v.previo) * 100 : null,
    unidades: v.unidades,
    clientes: v.clientes,
    ultimaVenta: v.ultimaVenta,
  }));

  const titulo = clave === "vendedoresEnCaida" ? "Vendedor" : "Producto";

  return {
    ...vacio,
    columnas: COLUMNAS_VARIACION.map((c) => (c.clave === "nombre" ? { ...c, titulo } : c)),
    detalle: detalleMes,
    filas,
    total: encontradas.length,
  };
}
