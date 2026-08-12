import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList } from "lucide-react";

import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { aplicarFiltros, fmtGs, fmtNum } from "@/lib/metrics";
import { mensajeError } from "@/lib/api";
import { ventasQueryOptions } from "@/lib/queries";
import type { Filtros, VentaRow } from "@/lib/types";

const PAGE_SIZE = 10;

const columnas: DataTableColumn<VentaRow>[] = [
  {
    id: "venta-neta",
    header: "Venta neta",
    width: "w-[170px]",
    headerClassName: "bg-primary/10 text-right text-primary",
    className:
      "whitespace-nowrap bg-primary/[0.035] text-right font-semibold tabular-nums text-primary",
    cell: (row) => fmtGs(row.montoVtaNetaGua),
  },
  {
    id: "documento",
    header: "Documento",
    width: "w-[130px]",
    className: "whitespace-nowrap",
    cell: (row) => (
      <>
        <div className="font-semibold text-foreground">{row.nroDoc}</div>
        <div className="text-[11px] text-muted-foreground">{row.tipoDoc ?? "Sin tipo"}</div>
      </>
    ),
  },
  {
    id: "cliente",
    header: "Cliente",
    width: "w-[220px]",
    className: "max-w-56 truncate",
    cell: (row) => row.razonSocial ?? "Sin cliente",
  },
  {
    id: "producto",
    header: "Producto",
    width: "w-[240px]",
    className: "max-w-60 truncate",
    cell: (row) => row.producto ?? "Sin producto",
  },
  {
    id: "vendedor",
    header: "Vendedor",
    width: "w-[170px]",
    className: "whitespace-nowrap",
    cell: (row) => row.vendedor ?? "Sin vendedor",
  },
  {
    id: "canal",
    header: "Canal",
    width: "w-[120px]",
    cell: (row) => row.canal ?? "Sin canal",
  },
  {
    id: "ciudad",
    header: "Ciudad",
    width: "w-[140px]",
    cell: (row) => row.ciudad ?? "Sin ciudad",
  },
  {
    id: "unidades",
    header: "Unidades",
    width: "w-[100px]",
    headerClassName: "text-right",
    className: "text-right tabular-nums",
    cell: (row) => fmtNum(row.vtaUnit),
  },
  {
    id: "fecha",
    header: "Fecha",
    width: "w-[110px]",
    className: "whitespace-nowrap",
    cell: (row) => row.fecha,
  },
];

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

  const ventasQuery = useQuery({
    ...ventasQueryOptions(filtros, pagina, PAGE_SIZE),
    enabled: backend,
  });
  const resultado = ventasQuery.data ?? { data: [], total: 0 };
  const cargando = ventasQuery.isFetching;
  const error = ventasQuery.isError
    ? mensajeError(ventasQuery.error, "No fue posible obtener las ventas. Intentá nuevamente.")
    : undefined;

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
    filtros.cliente,
    filtros.vendedor,
    filtros.canal,
    filtros.ciudad,
    filtros.zona,
  ]);

  useEffect(() => {
    if (pagina > paginas) setPagina(paginas);
  }, [pagina, paginas]);

  const desde = total === 0 ? 0 : (pagina - 1) * PAGE_SIZE + 1;
  const hasta = Math.min(pagina * PAGE_SIZE, total);

  return (
    <DataTable
      title="Ventas detalladas"
      subtitle={
        total > 0
          ? `Mostrando ${fmtNum(desde)}–${fmtNum(hasta)} de ${fmtNum(total)} registros`
          : "No hay ventas para los filtros seleccionados"
      }
      icon={ClipboardList}
      columns={columnas}
      rows={filas}
      getRowKey={(row, index) => `${row.nroDoc}-${row.codProducto}-${row.nroComprobante}-${index}`}
      stickyColumnId="venta-neta"
      pagination={{
        page: pagina,
        pages: paginas,
        onPageChange: setPagina,
        disabled: cargando,
      }}
      loading={cargando}
      loadingRows={8}
      error={error}
      minWidth="min-w-[1300px]"
    />
  );
}
