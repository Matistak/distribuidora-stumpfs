import { Button } from "@/components/ui/button";
import { FiltroCliente } from "@/components/dashboard/FiltroCliente";
import { FiltroSelect } from "@/components/dashboard/FiltroSelect";
import { Input } from "@/components/ui/input";
import { RotateCcw, SlidersHorizontal } from "lucide-react";
import { type Filtros, type OpcionesFiltro } from "@/lib/types";

export function FiltrosPanel({
  filtros,
  filtrosEdicion,
  opciones,
  backend,
  mostrarCliente = true,
  mostrarVendedor = true,
  error,
  onChange,
  onApply,
  onReset,
}: {
  filtros: Filtros;
  filtrosEdicion: Filtros;
  opciones: OpcionesFiltro;
  backend: boolean;
  mostrarCliente?: boolean;
  mostrarVendedor?: boolean;
  error?: string | undefined;
  onChange: (key: keyof Filtros, value: string | undefined) => void;
  onApply: () => void;
  onReset: () => void;
}) {
  const filtrosModificados =
    filtros.desde !== filtrosEdicion.desde ||
    filtros.hasta !== filtrosEdicion.hasta ||
    filtros.cliente !== filtrosEdicion.cliente ||
    filtros.vendedor !== filtrosEdicion.vendedor;

  return (
    <section className="rounded-xl border border-border/80 bg-card p-4 shadow-card sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <SlidersHorizontal className="size-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold">Filtros del análisis</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Ajustá los criterios y aplicalos cuando estés listo.
            </p>
          </div>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onReset}>
          <RotateCcw />
          Restablecer
        </Button>
      </div>

      <div
        className={`mt-5 grid gap-3 sm:grid-cols-2 ${mostrarCliente && mostrarVendedor ? "xl:grid-cols-4" : "xl:grid-cols-3"}`}
      >
        <label className="flex min-w-0 flex-col gap-1.5 text-xs font-semibold text-foreground">
          <span className="text-muted-foreground">Fecha desde</span>
          <Input
            type="date"
            value={filtrosEdicion.desde ?? ""}
            onChange={(event) => onChange("desde", event.target.value || filtrosEdicion.desde)}
            className="h-10 w-full bg-background text-sm"
            aria-label="Fecha desde"
          />
        </label>
        <label className="flex min-w-0 flex-col gap-1.5 text-xs font-semibold text-foreground">
          <span className="text-muted-foreground">Fecha hasta</span>
          <Input
            type="date"
            value={filtrosEdicion.hasta ?? ""}
            onChange={(event) => onChange("hasta", event.target.value || filtrosEdicion.hasta)}
            className="h-10 w-full bg-background text-sm"
            aria-label="Fecha hasta"
          />
        </label>
        {mostrarCliente ? (
          <div className="flex min-w-0 flex-col gap-1.5 text-xs font-semibold text-foreground">
            <span className="text-muted-foreground">Cliente</span>
            <FiltroCliente
              placeholder="Todos los clientes"
              valor={filtrosEdicion.cliente}
              opciones={opciones.clientes}
              backend={backend}
              onChange={(value) => onChange("cliente", value)}
              className="h-10 w-full text-sm"
            />
          </div>
        ) : null}
        {mostrarVendedor ? (
          <div className="flex min-w-0 flex-col gap-1.5 text-xs font-semibold text-foreground">
            <span className="text-muted-foreground">Vendedor</span>
            <FiltroSelect
              placeholder="Todos los vendedores"
              valor={filtrosEdicion.vendedor}
              opciones={opciones.vendedores}
              onChange={(value) => onChange("vendedor", value)}
              className="h-10 w-full text-sm"
            />
          </div>
        ) : null}
      </div>

      {error ? <p className="mt-3 text-xs text-destructive">{error}</p> : null}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <p className="text-xs text-muted-foreground">
          {filtrosModificados
            ? "Hay cambios pendientes de aplicar."
            : "La vista muestra los filtros actuales."}
        </p>
        <Button
          type="button"
          onClick={(event) => {
            onApply();
            event.currentTarget.blur();
          }}
          className="w-full sm:w-auto"
        >
          Aplicar filtros
        </Button>
      </div>
    </section>
  );
}
