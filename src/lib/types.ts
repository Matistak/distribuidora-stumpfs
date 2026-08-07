/**
 * Modelo de datos: una fila = una linea de factura/nota de credito del Excel.
 * Las columnas del Excel siempre son las mismas (49 columnas).
 */
export type VentaRow = {
  codCompania: number;
  compania: string;
  codDistribuidora: number;
  distribuidora: string;
  codCliente: number;
  razonSocial: string;
  codProducto: number;
  producto: string;
  codMarca: number;
  marca: string;
  fecha: string; // ISO yyyy-mm-dd
  anhoMes: number;
  anho: number;
  mes: number;
  dia: number;
  vtaUnit: number;
  montoIvaBrutaGua: number;
  costoVtaGua: number;
  montoVtaNetaGua: number;
  codCanal: number;
  canal: string;
  codRamo: number;
  ramo: string;
  codVendedor: number;
  vendedor: string;
  tipoDoc: string;
  nroDoc: string;
  nroComprobante: number;
  codZona: number;
  zona: string;
  codTipoProducto: number;
  tipoProducto: string;
  precioConIva: number;
  precioSinIva: number;
  porcDescuento: number;
  precioLista: number;
  iva: number;
  ciudad: string;
  ruc: string;
  latitud: number;
  longitud: number;
};

export type Kpis = {
  ventaBruta: number;
  ventaNeta: number;
  ticketPromedio: number;
  cantidadFacturas: number;
  unidadesVendidas: number;
  clientesActivos: number;
  productosDistintos: number;
  notasCredito: number;
  margenPorc: number;
};

export type SeriePunto = { label: string; valor: number };
export type RankingItem = { nombre: string; valor: number; participacion: number };

export type DashboardData = {
  kpis: Kpis;
  ventasPorDia: SeriePunto[];
  ventasPorVendedor: RankingItem[];
  ventasPorCiudad: RankingItem[];
  ventasPorCanal: RankingItem[];
  ventasPorMarca: RankingItem[];
  topClientes: RankingItem[];
  topProductos: RankingItem[];
  periodo: { desde: string; hasta: string };
};

export type Filtros = {
  desde?: string;
  hasta?: string;
  vendedor?: string;
  canal?: string;
  ciudad?: string;
  zona?: string;
};

export type OpcionesFiltro = {
  vendedores: string[];
  canales: string[];
  ciudades: string[];
  zonas: string[];
};
