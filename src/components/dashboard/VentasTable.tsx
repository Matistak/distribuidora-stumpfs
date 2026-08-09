import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { aplicarFiltros, fmtGs, fmtNum } from "@/lib/metrics";
import { listarVentas, mensajeError } from "@/lib/api";
import type { Filtros, VentaRow } from "@/lib/types";

const PAGE_SIZE = 25;

type ResultadoVentas = {
  data: VentaRow[];
  total: number;
};

export function VentasTable({
  backend,
  filtros,
  rows,
}: {
  backend: boolean;
  filtros: Filtros;
  rows: VentaRow[];
}) {
  const [pagina, setPagina] = useState(1);
  const [resultado, setResultado] = useState<ResultadoVentas>({ data: [], total: 0 });
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string>();

  const filasLocales = useMemo(() => aplicarFiltros(rows, filtros), [rows, filtros]);
  const total = backend ? resultado.total : filasLocales.length;
  const paginas = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const filas = backend
    ? resultado.data
    : filasLocales.slice((pagina - 1) * PAGE_SIZE, pagina * PAGE_SIZE);

  useEffect(() => {
    setPagina(1);
  }, [
    backend,
    filtros.desde,
    filtros.hasta,
    filtros.vendedor,
    filtros.canal,
    filtros.ciudad,
    filtros.zona,
  ]);

  useEffect(() => {
    if (!backend) return;

    let activo = true;
    setCargando(true);
    setError(undefined);

    listarVentas({ ...filtros, page: pagina, pageSize: PAGE_SIZE })
      .then((data) => {
        if (activo) setResultado(data);
      })
      .catch((cause: unknown) => {
        if (activo) {
          setError(mensajeError(cause, "No fue posible obtener las ventas. Intentá nuevamente."));
        }
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, [backend, filtros, pagina]);

  useEffect(() => {
    if (pagina > paginas) setPagina(paginas);
  }, [pagina, paginas]);

  const desde = total === 0 ? 0 : (pagina - 1) * PAGE_SIZE + 1;
  const hasta = Math.min(pagina * PAGE_SIZE, total);

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold">Ventas detalladas</h2>
          <p className="text-xs text-muted-foreground">
            {total > 0
              ? `Mostrando ${fmtNum(desde)}–${fmtNum(hasta)} de ${fmtNum(total)} registros`
              : "No hay ventas para los filtros seleccionados"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pagina <= 1 || cargando}
            onClick={() => setPagina((actual) => actual - 1)}
            aria-label="Página anterior"
          >
            <ChevronLeft />
            Anterior
          </Button>
          <span className="min-w-20 text-center text-xs text-muted-foreground">
            {pagina} / {paginas}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pagina >= paginas || cargando}
            onClick={() => setPagina((actual) => actual + 1)}
            aria-label="Página siguiente"
          >
            Siguiente
            <ChevronRight />
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Documento</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Producto</TableHead>
              <TableHead>Vendedor</TableHead>
              <TableHead>Canal</TableHead>
              <TableHead>Ciudad</TableHead>
              <TableHead className="text-right">Unidades</TableHead>
              <TableHead className="text-right">Venta neta</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cargando ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin" /> Cargando ventas...
                  </span>
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center text-destructive">
                  {error}
                </TableCell>
              </TableRow>
            ) : filas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                  No hay resultados.
                </TableCell>
              </TableRow>
            ) : (
              filas.map((row, index) => (
                <TableRow key={`${row.nroDoc}-${row.codProducto}-${row.nroComprobante}-${index}`}>
                  <TableCell className="whitespace-nowrap">{row.fecha}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    <div className="font-medium">{row.nroDoc}</div>
                    <div className="text-xs text-muted-foreground">{row.tipoDoc}</div>
                  </TableCell>
                  <TableCell className="max-w-48 truncate">{row.razonSocial}</TableCell>
                  <TableCell className="max-w-56 truncate">{row.producto}</TableCell>
                  <TableCell className="whitespace-nowrap">{row.vendedor}</TableCell>
                  <TableCell>{row.canal}</TableCell>
                  <TableCell>{row.ciudad}</TableCell>
                  <TableCell className="text-right">{fmtNum(row.vtaUnit)}</TableCell>
                  <TableCell className="whitespace-nowrap text-right font-medium">
                    {fmtGs(row.montoVtaNetaGua)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
