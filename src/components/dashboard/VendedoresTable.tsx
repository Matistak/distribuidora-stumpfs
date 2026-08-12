import { useEffect, useState } from "react";
import { BarChart3 } from "lucide-react";

import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { fmtGs, fmtNum, fmtPct } from "@/lib/metrics";
import type { VendedorResumen } from "@/lib/types";

const PAGE_SIZE = 10;

function iniciales(nombre: string) {
  return nombre
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0])
    .join("");
}

const columnas: DataTableColumn<VendedorResumen>[] = [
  {
    id: "vendedor",
    header: "Vendedor",
    width: "w-[220px]",
    cell: (row) => (
      <div className="flex items-center gap-2.5">
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 text-[10px] font-bold uppercase text-primary">
          {iniciales(row.vendedor)}
        </span>
        <span className="truncate">{row.vendedor}</span>
      </div>
    ),
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
    id: "clientes",
    header: "Clientes",
    width: "w-[86px]",
    headerClassName: "text-right",
    className: "text-right tabular-nums",
    cell: (row) => fmtNum(row.clientes),
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
    id: "ticket-promedio",
    header: "Ticket prom.",
    width: "w-[150px]",
    headerClassName: "text-right",
    className: "whitespace-nowrap text-right tabular-nums text-muted-foreground",
    cell: (row) => fmtGs(row.ticketPromedio),
  },
  {
    id: "participacion",
    header: "Part. venta",
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
    id: "ultima-venta",
    header: "Última venta",
    width: "w-[120px]",
    headerClassName: "text-right",
    className: "whitespace-nowrap text-right text-muted-foreground",
    cell: (row) => row.ultimaVenta,
  },
];

export function VendedoresTable({ data }: { data: VendedorResumen[] }) {
  const [pagina, setPagina] = useState(1);

  const paginas = Math.max(1, Math.ceil(data.length / PAGE_SIZE));
  const filas = data.slice((pagina - 1) * PAGE_SIZE, pagina * PAGE_SIZE);

  useEffect(() => {
    if (pagina > paginas) setPagina(paginas);
  }, [pagina, paginas]);

  const desde = data.length === 0 ? 0 : (pagina - 1) * PAGE_SIZE + 1;
  const hasta = Math.min(pagina * PAGE_SIZE, data.length);

  return (
    <DataTable
      title="Rendimiento por vendedor"
      subtitle={
        data.length > 0
          ? `Mostrando ${fmtNum(desde)}–${fmtNum(hasta)} de ${fmtNum(data.length)} vendedores · Ordenados por venta neta`
          : "No hay vendedores para los filtros seleccionados"
      }
      icon={BarChart3}
      columns={columnas}
      rows={filas}
      getRowKey={(row) => row.vendedor}
      pagination={{
        page: pagina,
        pages: paginas,
        onPageChange: setPagina,
      }}
    />
  );
}
