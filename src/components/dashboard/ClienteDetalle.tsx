import { ArrowLeft } from "lucide-react";
import { FiltrosPanel } from "@/components/dashboard/FiltrosPanel";
import { ProductosClienteTable } from "@/components/dashboard/ProductosClienteTable";
import { fmtGs, fmtNum, fmtPct, partesCliente } from "@/lib/metrics";
import type { ClienteResumen, Filtros, OpcionesFiltro, VentaRow } from "@/lib/types";

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
        title={valor}
      >
        {valor}
      </p>
    </div>
  );
}

export function ClienteDetalle({
  cliente,
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
  cliente: ClienteResumen;
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
  const { nombre, ruc } = partesCliente(cliente.cliente);

  return (
    <div className="min-h-screen bg-background px-4 py-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <header className="flex items-start justify-between gap-4 border-b border-border pb-5">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Detalle de cliente
            </p>
            <h1 className="mt-1 truncate text-2xl font-bold tracking-tight" title={nombre}>
              {nombre}
            </h1>
            {ruc ? <p className="mt-0.5 text-sm text-muted-foreground">Ruc: {ruc}</p> : null}
            <p className="mt-1 text-sm text-muted-foreground">
              Compras filtradas por el período seleccionado.
            </p>
          </div>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex shrink-0 items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            <ArrowLeft className="size-4" />
            Volver a clientes
          </button>
        </header>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          <Dato label="Vendedor" valor={cliente.vendedor || "—"} />
          <Dato label="Ciudad" valor={cliente.ciudad || "—"} />
          <Dato label="Canal" valor={cliente.canal || "—"} />
          <Dato label="Última compra" valor={cliente.ultimaCompra || "—"} />
          <Dato label="Facturas" valor={fmtNum(cliente.facturas)} />
          <Dato label="Productos" valor={fmtNum(cliente.productos)} />
          <Dato label="Unidades" valor={fmtNum(cliente.unidades)} />
          <Dato label="Ticket promedio" valor={fmtGs(cliente.ticketPromedio)} />
          <Dato label="Venta bruta" valor={fmtGs(cliente.ventaBruta)} />
          <Dato label="Venta neta" valor={fmtGs(cliente.ventaNeta)} destacado />
          <Dato label="Margen" valor={fmtPct(cliente.margenPorc)} />
          <Dato label="Participación" valor={fmtPct(cliente.participacion)} />
        </div>

        <FiltrosPanel
          filtros={filtros}
          filtrosEdicion={filtrosEdicion}
          opciones={opciones}
          backend={backend}
          mostrarCliente={false}
          error={errorFiltros}
          onChange={onFilterChange}
          onApply={onApplyFilters}
          onReset={onResetFilters}
        />

        <ProductosClienteTable
          backend={backend}
          filtros={{ ...filtros, cliente: cliente.cliente }}
          rows={rows}
        />
      </div>
    </div>
  );
}
