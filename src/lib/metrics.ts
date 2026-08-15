import type {
  ClienteResumen,
  ClientesData,
  ComparativoMensual,
  DashboardData,
  Filtros,
  OpcionesFiltro,
  RankingItem,
  SerieAnual,
  SeriePunto,
  VentaRow,
  VendedorResumen,
  VendedoresData,
} from "./types";

const sum = (arr: Array<number | null>) => arr.reduce<number>((a, b) => a + (b ?? 0), 0);

export function etiquetaCliente(ruc: string | null, razonSocial: string | null): string | null {
  if (!razonSocial) return null;
  return ruc ? `${ruc} - ${razonSocial}` : razonSocial;
}

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
      (!f.cliente || etiquetaCliente(r.ruc, r.razonSocial) === f.cliente) &&
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
    clientes: uniq(rows.map((r) => etiquetaCliente(r.ruc, r.razonSocial))),
    vendedores: uniq(rows.map((r) => r.vendedor)),
    canales: uniq(rows.map((r) => r.canal)),
    ciudades: uniq(rows.map((r) => r.ciudad)),
    zonas: uniq(rows.map((r) => r.zona)),
  };
}

/**
 * Resumen agregado por cliente (modo local). Replica la logica del endpoint
 * GET /api/clientes/resumen del backend para que la vista funcione sin conexion.
 * Los KPIs (`dataKpis`) ignoran el filtro de cliente: responden al resto.
 */
export function resumenClientesLocal(rows: VentaRow[], f: Filtros): ClientesData {
  const agrupar = (filas: VentaRow[]) => {
    const porCliente = new Map<
      string,
      {
        vendedor: string;
        ciudad: string;
        canal: string;
        facturas: Set<string>;
        productos: Set<number>;
        unidades: number;
        ventaBruta: number;
        ventaNeta: number;
        costo: number;
        ultimaCompra: string;
      }
    >();

    for (const r of filas) {
      const nombre = etiquetaCliente(r.ruc, r.razonSocial) ?? "SIN DATO";
      let agg = porCliente.get(nombre);
      if (!agg) {
        agg = {
          vendedor: r.vendedor ?? "SIN DATO",
          ciudad: r.ciudad ?? "SIN DATO",
          canal: r.canal ?? "SIN DATO",
          facturas: new Set(),
          productos: new Set(),
          unidades: 0,
          ventaBruta: 0,
          ventaNeta: 0,
          costo: 0,
          ultimaCompra: "",
        };
        porCliente.set(nombre, agg);
      }
      agg.facturas.add(r.nroDoc);
      agg.productos.add(r.codProducto);
      agg.unidades += r.vtaUnit ?? 0;
      agg.ventaBruta += r.montoIvaBrutaGua ?? 0;
      agg.ventaNeta += r.montoVtaNetaGua ?? 0;
      agg.costo += r.costoVtaGua ?? 0;
      // El vendedor/ciudad/canal mostrados son los de la compra mas reciente.
      if (r.fecha > agg.ultimaCompra) {
        agg.ultimaCompra = r.fecha;
        agg.vendedor = r.vendedor ?? "SIN DATO";
        agg.ciudad = r.ciudad ?? "SIN DATO";
        agg.canal = r.canal ?? "SIN DATO";
      }
    }

    const ventaNeta = sum([...porCliente.values()].map((a) => a.ventaNeta));

    const data: ClienteResumen[] = [...porCliente.entries()]
      .map(([cliente, a]) => {
        const neta = a.ventaNeta;
        return {
          cliente,
          vendedor: a.vendedor,
          ciudad: a.ciudad,
          canal: a.canal,
          facturas: a.facturas.size,
          productos: a.productos.size,
          unidades: a.unidades,
          ventaBruta: a.ventaBruta,
          ventaNeta: neta,
          costo: a.costo,
          margenPorc: neta ? (neta - a.costo) / neta : 0,
          ticketPromedio: a.facturas.size ? neta / a.facturas.size : 0,
          participacion: ventaNeta ? neta / ventaNeta : 0,
          ultimaCompra: a.ultimaCompra,
        };
      })
      .sort((a, b) => b.ventaNeta - a.ventaNeta);

    return { data, ventaNeta };
  };

  const filtradas = aplicarFiltros(rows, f);
  const { cliente: _cliente, ...filtrosSinCliente } = f;
  const sinCliente = aplicarFiltros(rows, filtrosSinCliente);

  const resumen = agrupar(filtradas);
  const resumenKpis = agrupar(sinCliente);

  const facturas = new Set(sinCliente.map((r) => r.nroDoc)).size;
  const costoTotal = sum(sinCliente.map((r) => r.costoVtaGua));
  const ventaNeta = resumenKpis.ventaNeta;

  const concentracionTop10 = resumenKpis.data.slice(0, 10).reduce((acc, r) => acc + r.ventaNeta, 0);

  return {
    kpis: {
      clientesActivos: resumenKpis.data.length,
      ventaNeta,
      facturas,
      unidades: sum(sinCliente.map((r) => r.vtaUnit)),
      ticketPromedio: facturas ? ventaNeta / facturas : 0,
      margenPorc: ventaNeta ? (ventaNeta - costoTotal) / ventaNeta : 0,
      concentracionTop10: ventaNeta ? concentracionTop10 / ventaNeta : 0,
    },
    data: resumen.data,
    dataKpis: resumenKpis.data,
  };
}

/**
 * Resumen agregado por vendedor (modo local). Replica la logica del endpoint
 * GET /api/vendedores del backend para que la vista funcione sin conexion.
 * Los KPIs (`dataKpis`) ignoran el filtro de vendedor: solo responden a fechas.
 */
export function resumenVendedoresLocal(rows: VentaRow[], f: Filtros): VendedoresData {
  const agrupar = (filas: VentaRow[]) => {
    const porVendedor = new Map<
      string,
      {
        facturas: Set<string>;
        clientes: Set<number>;
        unidades: number;
        ventaBruta: number;
        ventaNeta: number;
        costo: number;
        ultimaVenta: string;
      }
    >();

    for (const r of filas) {
      const nombre = r.vendedor ?? "SIN DATO";
      let agg = porVendedor.get(nombre);
      if (!agg) {
        agg = {
          facturas: new Set(),
          clientes: new Set(),
          unidades: 0,
          ventaBruta: 0,
          ventaNeta: 0,
          costo: 0,
          ultimaVenta: "",
        };
        porVendedor.set(nombre, agg);
      }
      agg.facturas.add(r.nroDoc);
      if (r.codCliente !== null) agg.clientes.add(r.codCliente);
      agg.unidades += r.vtaUnit ?? 0;
      agg.ventaBruta += r.montoIvaBrutaGua ?? 0;
      agg.ventaNeta += r.montoVtaNetaGua ?? 0;
      agg.costo += r.costoVtaGua ?? 0;
      if (r.fecha > agg.ultimaVenta) agg.ultimaVenta = r.fecha;
    }

    const ventaNeta = sum([...porVendedor.values()].map((a) => a.ventaNeta));

    const data: VendedorResumen[] = [...porVendedor.entries()]
      .map(([vendedor, a]) => {
        const neta = a.ventaNeta;
        return {
          vendedor,
          facturas: a.facturas.size,
          clientes: a.clientes.size,
          unidades: a.unidades,
          ventaBruta: a.ventaBruta,
          ventaNeta: neta,
          costo: a.costo,
          margenPorc: neta ? (neta - a.costo) / neta : 0,
          ticketPromedio: a.facturas.size ? neta / a.facturas.size : 0,
          participacion: ventaNeta ? neta / ventaNeta : 0,
          ultimaVenta: a.ultimaVenta,
        };
      })
      .sort((a, b) => b.ventaNeta - a.ventaNeta);

    return { data, ventaNeta };
  };

  const filtradas = aplicarFiltros(rows, f);
  const soloFechas = aplicarFiltros(rows, {
    ...(f.desde ? { desde: f.desde } : {}),
    ...(f.hasta ? { hasta: f.hasta } : {}),
  });

  const resumen = agrupar(filtradas);
  const resumenKpis = agrupar(soloFechas);

  const facturas = new Set(soloFechas.map((r) => r.nroDoc)).size;
  const costoTotal = sum(soloFechas.map((r) => r.costoVtaGua));
  const ventaNeta = resumenKpis.ventaNeta;

  const concentracionTop10 = resumenKpis.data.slice(0, 10).reduce((acc, r) => acc + r.ventaNeta, 0);

  return {
    kpis: {
      vendedoresActivos: resumenKpis.data.length,
      ventaNeta,
      facturas,
      unidades: sum(soloFechas.map((r) => r.vtaUnit)),
      ticketPromedio: facturas ? ventaNeta / facturas : 0,
      margenPorc: ventaNeta ? (ventaNeta - costoTotal) / ventaNeta : 0,
      concentracionTop10: ventaNeta ? concentracionTop10 / ventaNeta : 0,
    },
    data: resumen.data,
    dataKpis: resumenKpis.data,
  };
}

const diasDelMes = (anho: number, mes: number) => new Date(anho, mes, 0).getDate();
const claveMes = (anho: number, mes: number) => `${anho}-${String(mes).padStart(2, "0")}`;

/**
 * Serie diaria del mes vigente vs el mes anterior.
 * El mes vigente es el del ultimo dia con datos; los dias sin ventas van en 0
 * en ambas series para que las lineas nunca se corten.
 * `rows` debe venir sin filtro de fechas (si no, el mes anterior queda vacio).
 */
export function comparativoMensual(rows: VentaRow[], referencia?: string): ComparativoMensual {
  const fechas = rows.map((r) => r.fecha).filter(Boolean);
  const ultima = referencia || fechas.reduce((a, b) => (b > a ? b : a), "");
  if (!ultima) return { mesActual: "", mesAnterior: "", puntos: [] };

  const anho = Number(ultima.slice(0, 4));
  const mes = Number(ultima.slice(5, 7));
  const anhoPrev = mes === 1 ? anho - 1 : anho;
  const mesPrev = mes === 1 ? 12 : mes - 1;

  const acumular = (a: number, m: number) => {
    const map = new Map<number, number>();
    for (const r of rows) {
      if (r.anho !== a || r.mes !== m) continue;
      map.set(r.dia, (map.get(r.dia) ?? 0) + (r.montoVtaNetaGua ?? 0));
    }
    return map;
  };

  const actual = acumular(anho, mes);
  const anterior = acumular(anhoPrev, mesPrev);
  const dias = Math.max(diasDelMes(anho, mes), diasDelMes(anhoPrev, mesPrev));

  return {
    mesActual: claveMes(anho, mes),
    mesAnterior: claveMes(anhoPrev, mesPrev),
    puntos: Array.from({ length: dias }, (_, i) => {
      const dia = i + 1;
      return {
        dia,
        label: String(dia),
        actual: actual.get(dia) ?? 0,
        anterior: anterior.get(dia) ?? 0,
      };
    }),
  };
}

const MESES_CORTOS = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

/**
 * Serie de los 12 meses del anho de referencia; los meses sin ventas van en 0.
 * `rows` debe venir sin filtro de fechas para que el anho completo se vea
 * aunque el rango filtrado sea parcial.
 */
export function serieAnual(rows: VentaRow[], referencia?: string): SerieAnual {
  const fechas = rows.map((r) => r.fecha).filter(Boolean);
  const ultima = referencia || fechas.reduce((a, b) => (b > a ? b : a), "");
  const puntosVacios = MESES_CORTOS.map((label) => ({ label, valor: 0 }));
  if (!ultima) return { anho: 0, puntos: puntosVacios };

  const anho = Number(ultima.slice(0, 4));
  const porMes = new Map<number, number>();
  for (const r of rows) {
    if (r.anho !== anho) continue;
    porMes.set(r.mes, (porMes.get(r.mes) ?? 0) + (r.montoVtaNetaGua ?? 0));
  }

  return {
    anho,
    puntos: MESES_CORTOS.map((label, i) => ({ label, valor: porMes.get(i + 1) ?? 0 })),
  };
}

/**
 * Calculo de metricas. Esta misma logica debe existir en el backend
 * (endpoint GET /api/dashboard) cuando se conecte la base de datos.
 * `rowsComparativo` son las filas sin filtro de fechas, usadas solo para la
 * serie mes vigente vs mes anterior.
 */
export function calcularDashboard(
  rows: VentaRow[],
  rowsComparativo: VentaRow[] = rows,
): DashboardData {
  const facturas = new Set(rows.map((r) => r.nroDoc));
  const clientes = new Set(rows.map((r) => r.codCliente).filter((c): c is number => c !== null));
  const productos = new Set(rows.map((r) => r.codProducto));
  const ventaNeta = sum(rows.map((r) => r.montoVtaNetaGua));
  const ventaBruta = sum(rows.map((r) => r.montoIvaBrutaGua));
  const costo = sum(rows.map((r) => r.costoVtaGua));
  const unidades = sum(rows.map((r) => r.vtaUnit));
  const notas = new Set(rows.filter((r) => /CREDITO/i.test(r.tipoDoc ?? "")).map((r) => r.nroDoc));

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
    ventasComparativoMensual: comparativoMensual(rowsComparativo, fechas[fechas.length - 1] ?? ""),
    ventasPorMes: serieAnual(rowsComparativo, fechas[fechas.length - 1] ?? ""),
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
