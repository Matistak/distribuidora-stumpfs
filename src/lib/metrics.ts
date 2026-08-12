import type {
  DashboardData,
  Filtros,
  OpcionesFiltro,
  RankingItem,
  SeriePunto,
  VentaRow,
} from "./types";

const sum = (arr: Array<number | null>) => arr.reduce<number>((a, b) => a + (b ?? 0), 0);

function ranking(rows: VentaRow[], key: (r: VentaRow) => string | null, limit = 10): RankingItem[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    const nombre = key(r) ?? "SIN DATO";
    map.set(nombre, (map.get(nombre) ?? 0) + (r.montoVtaNetaGua ?? 0));
  }
  const total = sum([...map.values()]) || 1;
  return [...map.entries()]
    .map(([nombre, valor]) => ({ nombre, valor, participacion: valor / total }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, limit);
}

export function aplicarFiltros(rows: VentaRow[], f: Filtros): VentaRow[] {
  return rows.filter(
    (r) =>
      (!f.desde || r.fecha >= f.desde) &&
      (!f.hasta || r.fecha <= f.hasta) &&
      (!f.cliente || r.razonSocial === f.cliente) &&
      (!f.vendedor || r.vendedor === f.vendedor) &&
      (!f.canal || r.canal === f.canal) &&
      (!f.ciudad || r.ciudad === f.ciudad) &&
      (!f.zona || r.zona === f.zona),
  );
}

export function opcionesFiltro(rows: VentaRow[]): OpcionesFiltro {
  const uniq = (vals: Array<string | null>) =>
    [...new Set(vals)].filter((v): v is string => Boolean(v)).sort();
  return {
    clientes: uniq(rows.map((r) => r.razonSocial)),
    vendedores: uniq(rows.map((r) => r.vendedor)),
    canales: uniq(rows.map((r) => r.canal)),
    ciudades: uniq(rows.map((r) => r.ciudad)),
    zonas: uniq(rows.map((r) => r.zona)),
  };
}

/**
 * Calculo de metricas. Esta misma logica debe existir en el backend
 * (endpoint GET /api/dashboard) cuando se conecte la base de datos.
 */
export function calcularDashboard(rows: VentaRow[]): DashboardData {
  const facturas = new Set(rows.map((r) => r.nroDoc));
  const clientes = new Set(rows.map((r) => r.codCliente).filter((c): c is number => c !== null));
  const productos = new Set(rows.map((r) => r.codProducto));
  const ventaNeta = sum(rows.map((r) => r.montoVtaNetaGua));
  const ventaBruta = sum(rows.map((r) => r.montoIvaBrutaGua));
  const costo = sum(rows.map((r) => r.costoVtaGua));
  const unidades = sum(rows.map((r) => r.vtaUnit));
  const notas = new Set(
    rows.filter((r) => /CREDITO/i.test(r.tipoDoc ?? "")).map((r) => r.nroDoc),
  );

  const porDia = new Map<number, number>();
  for (const r of rows) porDia.set(r.dia, (porDia.get(r.dia) ?? 0) + (r.montoVtaNetaGua ?? 0));
  const ventasPorDia: SeriePunto[] = [...porDia.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([dia, valor]) => ({ label: String(dia), valor }));

  const fechas = rows
    .map((r) => r.fecha)
    .filter(Boolean)
    .sort();

  return {
    kpis: {
      ventaBruta,
      ventaNeta,
      ticketPromedio: facturas.size ? ventaNeta / facturas.size : 0,
      cantidadFacturas: facturas.size,
      unidadesVendidas: unidades,
      clientesActivos: clientes.size,
      productosDistintos: productos.size,
      notasCredito: notas.size,
      margenPorc: ventaNeta ? (ventaNeta - costo) / ventaNeta : 0,
    },
    ventasPorDia,
    ventasPorVendedor: ranking(rows, (r) => r.vendedor),
    ventasPorCiudad: ranking(rows, (r) => r.ciudad, 7),
    ventasPorCanal: ranking(rows, (r) => r.canal, 8),
    ventasPorMarca: ranking(rows, (r) => r.marca ?? "SIN MARCA", 10),
    topClientes: ranking(rows, (r) => r.razonSocial ?? "SIN CLIENTE", 5),
    topProductos: ranking(rows, (r) => r.producto ?? "SIN PRODUCTO", 8),
    periodo: { desde: fechas[0] ?? "", hasta: fechas[fechas.length - 1] ?? "" },
  };
}

export const fmtGs = (n: number | null | undefined) =>
  n === null || n === undefined
    ? ""
    : `Gs. ${new Intl.NumberFormat("es-PY", { maximumFractionDigits: 0 }).format(Math.round(n))}`;
export const fmtNum = (n: number | null | undefined) =>
  n === null || n === undefined
    ? ""
    : new Intl.NumberFormat("es-PY", { maximumFractionDigits: 0 }).format(Math.round(n));
export const fmtPct = (n: number) =>
  `${new Intl.NumberFormat("es-PY", { maximumFractionDigits: 1 }).format(n * 100)}%`;
export const fmtCompact = (n: number) => {
  const abs = Math.abs(n);
  if (abs >= 1e9) return `${(n / 1e9).toFixed(1)} MM`;
  if (abs >= 1e6) return `${(n / 1e6).toFixed(0)} M`;
  if (abs >= 1e3) return `${(n / 1e3).toFixed(0)} K`;
  return String(Math.round(n));
};
