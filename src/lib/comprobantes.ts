import { aplicarFiltros } from "./metrics";
import type { ComprobanteDetalle, ComprobanteResumen, Filtros, VentaRow } from "./types";

function resumir(rows: VentaRow[]): ComprobanteResumen | null {
  const primera = rows[0];
  if (!primera) return null;
  return {
    nroDoc: primera.nroDoc,
    nroComprobante: primera.nroComprobante,
    tipoDoc: primera.tipoDoc,
    fecha: primera.fecha,
    razonSocial: primera.razonSocial,
    ruc: primera.ruc,
    vendedor: primera.vendedor,
    canal: primera.canal,
    ciudad: primera.ciudad,
    cantidadLineas: rows.length,
    unidades: rows.reduce((total, row) => total + (row.vtaUnit ?? 0), 0),
    ventaBruta: rows.reduce((total, row) => total + (row.montoIvaBrutaGua ?? 0), 0),
    ventaNeta: rows.reduce((total, row) => total + (row.montoVtaNetaGua ?? 0), 0),
    esNotaCredito: /CREDITO/i.test(primera.tipoDoc ?? ""),
  };
}

export function listarComprobantesLocal(rows: VentaRow[], filtros: Filtros): ComprobanteResumen[] {
  const grupos = new Map<string, VentaRow[]>();
  for (const row of aplicarFiltros(rows, filtros)) {
    const grupo = grupos.get(row.nroDoc);
    if (grupo) grupo.push(row);
    else grupos.set(row.nroDoc, [row]);
  }

  return [...grupos.values()]
    .map((grupo) => resumir(grupo))
    .filter((item): item is ComprobanteResumen => item !== null)
    .sort((a, b) => b.fecha.localeCompare(a.fecha) || a.nroDoc.localeCompare(b.nroDoc));
}

export function obtenerComprobanteLocal(
  rows: VentaRow[],
  nroDoc: string,
): ComprobanteDetalle | null {
  const lineas = rows.filter((row) => row.nroDoc === nroDoc);
  const resumen = resumir(lineas);
  return resumen ? { resumen, lineas } : null;
}
