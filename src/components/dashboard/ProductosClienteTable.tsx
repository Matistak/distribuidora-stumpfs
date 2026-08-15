import { useEffect, useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Package } from "lucide-react";

import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { mensajeError } from "@/lib/api";
import { ventasQueryOptions } from "@/lib/queries";
import { fmtGs, fmtNum, fmtPct, resumenProductosLocal } from "@/lib/metrics";
import type { Filtros, ProductoResumen, VentaRow } from "@/lib/types";

const PAGE_SIZE = 10;
/**
 * El backend no expone un agregado por producto: se traen las lineas de venta
 * del cliente (ya filtradas) y se agrupan en el front. Si el cliente supera
 * este tope, se avisa en el subtitulo que el listado esta acotado.
 */
const MAX_FILAS_BACKEND = 1000;

const columnas: DataTableColumn<ProductoResumen>[] = [
  {
    id: "producto",
    header: "Producto",
    width: "w-[300px]",
    cell: (row) => (
      <div className="min-w-0">
        <div className="truncate font-medium text-foreground" title={row.producto}>
          {row.producto}
        </div>
        <div className="truncate text-[11px] text-muted-foreground">
          {row.codProducto} · {row.marca}
        </div>
      </div>
    ),
  },
  {
    id: "tipo",
    header: "Tipo",
    width: "w-[150px]",
    className: "truncate text-muted-foreground",
    cell: (row) => row.tipoProducto,
  },
  {
    id: "facturas",
    header: "Facturas",
    width: "w-[86px]",
    headerClassName: "text-right",
    className: "text-right tabular-nums",
    cell: (row) => fmtNum(row.facturas),
  },
  {
    id: "unidades",
    header: "Unidades",
    width: "w-[100px]",
    headerClassName: "text-right",
    className: "text-right tabular-nums",
    cell: (row) => fmtNum(row.unidades),
  },
  {
    id: "venta-bruta",
    header: "Venta bruta",
    width: "w-[160px]",
    headerClassName: "text-right",
    className: "whitespace-nowrap text-right tabular-nums text-muted-foreground",
    cell: (row) => fmtGs(row.ventaBruta),
  },
  {
    id: "venta-neta",
    header: "Venta neta",
    width: "w-[160px]",
    headerClassName: "bg-primary/10 text-right text-primary",
    className:
      "whitespace-nowrap bg-primary/[0.035] text-right font-semibold tabular-nums text-primary",
    cell: (row) => fmtGs(row.ventaNeta),
  },
  {
    id: "margen",
    header: "Margen",
    width: "w-[90px]",
    headerClassName: "text-right",
    className: "whitespace-nowrap text-right tabular-nums text-muted-foreground",
    cell: (row) => (
      <span className="inline-flex min-w-12 justify-center rounded-full bg-success/10 px-2 py-1 text-[11px] font-semibold text-success">
        {fmtPct(row.margenPorc)}
      </span>
    ),
  },
  {
    id: "precio-promedio",
    header: "Precio prom.",
    width: "w-[150px]",
    headerClassName: "text-right",
    className: "whitespace-nowrap text-right tabular-nums text-muted-foreground",
    cell: (row) => fmtGs(row.precioPromedio),
  },
  {
    id: "participacion",
    header: "Part. compra",
    width: "w-[110px]",
    headerClassName: "text-right",
    className: "whitespace-nowrap text-right tabular-nums text-muted-foreground",
    cell: (row) => (
      <span className="inline-flex min-w-12 justify-center rounded-full bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary">
        {fmtPct(row.participacion)}
      </span>
    ),
  },
  {
    id: "ultima-compra",
    header: "Última compra",
    width: "w-[125px]",
    headerClassName: "text-right",
    className: "whitespace-nowrap text-right text-muted-foreground",
    cell: (row) => row.ultimaCompra,
  },
];

export function ProductosClienteTable({
  backend,
  filtros,
  rows,
}: {
  backend: boolean;
  filtros: Filtros;
  rows: VentaRow[];
}) {
  const [pagina, setPagina] = useState(1);

  const ventasQuery = useQuery({
    ...ventasQueryOptions(filtros, 1, MAX_FILAS_BACKEND),
    enabled: backend,
    placeholderData: keepPreviousData,
  });
  const resultado = ventasQuery.data ?? { data: [], total: 0 };
  const cargando = backend && ventasQuery.isFetching;
  const error = ventasQuery.isError
    ? mensajeError(ventasQuery.error, "No fue posible obtener los productos. Intentá nuevamente.")
    : undefined;

  const productos = useMemo(
    () => (backend ? resumenProductosLocal(resultado.data) : resumenProductosLocal(rows, filtros)),
    [backend, resultado.data, rows, filtros],
  );

  const paginas = Math.max(1, Math.ceil(productos.length / PAGE_SIZE));
  const filas = productos.slice((pagina - 1) * PAGE_SIZE, pagina * PAGE_SIZE);

  useEffect(() => {
    setPagina(1);
  }, [
    backend,
    filtros.desde,
    filtros.hasta,
    filtros.cliente,
    filtros.vendedor,
    filtros.canal,
    filtros.ciudad,
    filtros.zona,
  ]);

  useEffect(() => {
    if (pagina > paginas) setPagina(paginas);
  }, [pagina, paginas]);

  const desde = productos.length === 0 ? 0 : (pagina - 1) * PAGE_SIZE + 1;
  const hasta = Math.min(pagina * PAGE_SIZE, productos.length);
  const truncado = backend && resultado.total > MAX_FILAS_BACKEND;

  return (
    <DataTable
      title="Productos comprados"
      subtitle={
        productos.length > 0
          ? `Mostrando ${fmtNum(desde)}–${fmtNum(hasta)} de ${fmtNum(productos.length)} productos · Ordenados por venta neta${
              truncado
                ? ` · Calculado sobre las últimas ${fmtNum(MAX_FILAS_BACKEND)} líneas de venta`
                : ""
            }`
          : "No hay productos para los filtros seleccionados"
      }
      icon={Package}
      columns={columnas}
      rows={filas}
      getRowKey={(row) => row.codProducto}
      pagination={{
        page: pagina,
        pages: paginas,
        onPageChange: setPagina,
        disabled: cargando,
      }}
      loading={cargando}
      loadingRows={8}
      error={error}
      minWidth="min-w-[1240px]"
    />
  );
}
