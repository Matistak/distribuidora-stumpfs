import { useEffect, useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { FileText } from "lucide-react";

import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { mensajeError } from "@/lib/api";
import { listarComprobantesLocal } from "@/lib/comprobantes";
import { comprobantesQueryOptions } from "@/lib/queries";
import { fmtGs, fmtNum, soloFecha } from "@/lib/metrics";
import type { ComprobanteResumen, Filtros, VentaRow } from "@/lib/types";

const PAGE_SIZE = 10;

const columnas: DataTableColumn<ComprobanteResumen>[] = [
  {
    id: "documento",
    header: "Documento",
    width: "w-[150px]",
    className: "whitespace-nowrap",
    cell: (row) => (
      <div>
        <div className="font-semibold text-foreground">{row.nroDoc}</div>
        <Badge
          variant={row.esNotaCredito ? "destructive" : "secondary"}
          className="mt-1 text-[10px]"
        >
          {row.tipoDoc ?? "Sin tipo"}
        </Badge>
      </div>
    ),
  },
  {
    id: "fecha",
    header: "Fecha",
    width: "w-[110px]",
    className: "whitespace-nowrap",
    cell: (row) => soloFecha(row.fecha),
  },
  {
    id: "cliente",
    header: "Cliente",
    width: "w-[240px]",
    className: "max-w-60 truncate",
    cell: (row) => row.razonSocial ?? "Sin cliente",
  },
  {
    id: "vendedor",
    header: "Vendedor",
    width: "w-[170px]",
    className: "max-w-44 truncate",
    cell: (row) => row.vendedor ?? "Sin vendedor",
  },
  {
    id: "lineas",
    header: "Líneas",
    width: "w-[85px]",
    headerClassName: "text-right",
    className: "text-right tabular-nums",
    cell: (row) => fmtNum(row.cantidadLineas),
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
    id: "venta-neta",
    header: "Venta neta",
    width: "w-[170px]",
    headerClassName: "bg-primary/10 text-right text-primary",
    className:
      "whitespace-nowrap bg-primary/[0.035] text-right font-semibold tabular-nums text-primary",
    cell: (row) => fmtGs(row.ventaNeta),
  },
];

export function ComprobantesTable({
  backend,
  filtros,
  rows,
  onSelect,
}: {
  backend: boolean;
  filtros: Filtros;
  rows: VentaRow[];
  onSelect: (comprobante: ComprobanteResumen) => void;
}) {
  const [pagina, setPagina] = useState(1);
  const comprobantesQuery = useQuery({
    ...comprobantesQueryOptions(filtros, pagina, PAGE_SIZE),
    enabled: backend,
    placeholderData: keepPreviousData,
  });
  const locales = useMemo(() => listarComprobantesLocal(rows, filtros), [rows, filtros]);
  const resultado = comprobantesQuery.data ?? { data: [], total: 0 };
  const total = backend ? resultado.total : locales.length;
  const paginas = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const filas = backend
    ? resultado.data
    : locales.slice((pagina - 1) * PAGE_SIZE, pagina * PAGE_SIZE);
  const error = comprobantesQuery.isError
    ? mensajeError(comprobantesQuery.error, "No fue posible obtener los comprobantes.")
    : undefined;

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
    filtros.tipoDoc,
  ]);

  useEffect(() => {
    if (pagina > paginas) setPagina(paginas);
  }, [pagina, paginas]);

  const desde = total === 0 ? 0 : (pagina - 1) * PAGE_SIZE + 1;
  const hasta = Math.min(pagina * PAGE_SIZE, total);

  return (
    <DataTable
      title="Facturas y comprobantes"
      subtitle={
        total > 0
          ? `Mostrando ${fmtNum(desde)}–${fmtNum(hasta)} de ${fmtNum(total)} documentos`
          : "No hay comprobantes para los filtros seleccionados"
      }
      icon={FileText}
      columns={columnas}
      rows={filas}
      getRowKey={(row) => row.nroDoc}
      onRowClick={(row) => onSelect(row)}
      stickyColumnId="documento"
      pagination={{
        page: pagina,
        pages: paginas,
        onPageChange: setPagina,
        disabled: comprobantesQuery.isFetching,
      }}
      loading={comprobantesQuery.isFetching}
      loadingRows={8}
      error={error}
      minWidth="min-w-[1050px]"
    />
  );
}
