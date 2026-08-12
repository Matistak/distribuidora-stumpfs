import { ArrowLeft } from "lucide-react";
import { FiltrosPanel } from "@/components/dashboard/FiltrosPanel";
import { VentasTable } from "@/components/dashboard/VentasTable";
import { fmtGs, fmtNum, fmtPct } from "@/lib/metrics";
import type { Filtros, OpcionesFiltro, VendedorResumen, VentaRow } from "@/lib/types";

function Dato({ label, valor, destacado }: { label: string; valor: string; destacado?: boolean }) {
  return (
    <div
      className={
        destacado
          ? "rounded-lg border border-primary/20 bg-card px-3 py-2.5"
          : "rounded-lg border border-border bg-card px-3 py-2.5"
      }
    >
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p
        className={
          destacado
            ? "mt-0.5 font-display text-lg font-bold text-primary"
            : "mt-0.5 truncate font-display text-base font-semibold text-foreground"
        }
      >
        {valor}
      </p>
    </div>
  );
}

export function VendedorDetalle({
  vendedor,
  filtros,
  filtrosEdicion,
  opciones,
  backend,
  rows,
  errorFiltros,
  onFilterChange,
  onApplyFilters,
  onResetFilters,
  onBack,
}: {
  vendedor: VendedorResumen;
  filtros: Filtros;
  filtrosEdicion: Filtros;
  opciones: OpcionesFiltro;
  backend: boolean;
  rows: VentaRow[];
  errorFiltros?: string | undefined;
  onFilterChange: (key: keyof Filtros, value: string | undefined) => void;
  onApplyFilters: () => void;
  onResetFilters: () => void;
  onBack: () => void;
}) {
  return (
    <div className="min-h-screen bg-background px-4 py-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <header className="flex items-start justify-between gap-4 border-b border-border pb-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Detalle de vendedor
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">{vendedor.vendedor}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Ventas filtradas por el período seleccionado.
            </p>
          </div>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex shrink-0 items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            <ArrowLeft className="size-4" />
            Volver a vendedores
          </button>
        </header>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          <Dato label="Facturas" valor={fmtNum(vendedor.facturas)} />
          <Dato label="Clientes" valor={fmtNum(vendedor.clientes)} />
          <Dato label="Unidades" valor={fmtNum(vendedor.unidades)} />
          <Dato label="Última venta" valor={vendedor.ultimaVenta || "—"} />
          <Dato label="Venta bruta" valor={fmtGs(vendedor.ventaBruta)} />
          <Dato label="Venta neta" valor={fmtGs(vendedor.ventaNeta)} destacado />
          <Dato label="Ticket promedio" valor={fmtGs(vendedor.ticketPromedio)} />
          <Dato label="Margen" valor={fmtPct(vendedor.margenPorc)} />
          <Dato label="Participación" valor={fmtPct(vendedor.participacion)} />
        </div>

        <FiltrosPanel
          filtros={filtros}
          filtrosEdicion={filtrosEdicion}
          opciones={opciones}
          backend={backend}
          mostrarVendedor={false}
          error={errorFiltros}
          onChange={onFilterChange}
          onApply={onApplyFilters}
          onReset={onResetFilters}
        />

        <VentasTable
          backend={backend}
          filtros={{ ...filtros, vendedor: vendedor.vendedor }}
          rows={rows}
          mostrarVendedor={false}
        />
      </div>
    </div>
  );
}
