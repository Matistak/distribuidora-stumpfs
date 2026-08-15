import type { LucideIcon } from "lucide-react";
import { AlertTriangle, Package, TrendingDown, TrendingUp, UserX } from "lucide-react";
import { cn } from "@/lib/utils";
import { fmtNum } from "@/lib/metrics";
import type { Alerta, AlertaTono } from "@/lib/types";

const ICONO: Record<string, LucideIcon> = {
  vendedoresEnCaida: TrendingDown,
  clientesSinCompras: UserX,
  productosEnCaida: Package,
  productosEnCrecimiento: TrendingUp,
};

/** Fondo, borde y color de acento por severidad. */
const TONO: Record<AlertaTono, { caja: string; icono: string; valor: string }> = {
  critico: {
    caja: "border-chart-4/25 bg-chart-4/[0.06]",
    icono: "text-chart-4",
    valor: "text-chart-4",
  },
  advertencia: {
    caja: "border-warning/30 bg-warning/[0.08]",
    icono: "text-warning",
    valor: "text-warning-foreground",
  },
  positivo: {
    caja: "border-success/25 bg-success/[0.07]",
    icono: "text-success",
    valor: "text-success",
  },
};

const CLAVES_PLACEHOLDER = Object.keys(ICONO);

function Tarjeta({ alerta }: { alerta: Alerta }) {
  const Icono = ICONO[alerta.clave] ?? AlertTriangle;
  const tono = TONO[alerta.tono];
  const sinDatos = alerta.valor === null || alerta.estado === "sin-datos";

  return (
    <div className={cn("rounded-xl border p-5 shadow-card", tono.caja)}>
      <div className="flex items-start gap-2.5">
        <Icono
          className={cn("size-4 shrink-0", sinDatos ? "text-muted-foreground/40" : tono.icono)}
          aria-hidden
        />
        <p className="text-[11px] font-bold uppercase leading-tight tracking-wider text-muted-foreground">
          {alerta.titulo}
        </p>
      </div>

      <p
        className={cn(
          "mt-3 font-display text-3xl font-bold leading-none tabular-nums",
          sinDatos ? "text-muted-foreground/60" : tono.valor,
        )}
      >
        {sinDatos ? "—" : fmtNum(alerta.valor ?? 0)}
      </p>

      <p className="mt-2 text-xs leading-tight text-muted-foreground">
        {sinDatos ? alerta.detalle : alerta.unidad}
      </p>
      {sinDatos ? null : (
        <p className="mt-0.5 text-xs leading-tight text-muted-foreground/80">{alerta.detalle}</p>
      )}
    </div>
  );
}

function TarjetaCargando({ clave }: { clave: string }) {
  const Icono = ICONO[clave] ?? AlertTriangle;
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-card" aria-busy="true">
      <div className="flex items-start gap-2.5">
        <Icono className="size-4 shrink-0 text-muted-foreground/40" aria-hidden />
        <div className="h-3 w-28 animate-pulse rounded bg-muted" />
      </div>
      <div className="mt-3 h-8 w-14 animate-pulse rounded bg-muted" />
      <div className="mt-2 h-3 w-24 animate-pulse rounded bg-muted" />
    </div>
  );
}

export function AlertasImportantes({
  alertas,
  cargando,
  error,
  onRetry,
}: {
  alertas: Alerta[];
  cargando?: boolean;
  error?: boolean;
  onRetry?: () => void;
}) {
  return (
    <div className="space-y-3">
      <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        Alertas importantes
      </h2>

      {error ? (
        <div className="rounded-xl border border-chart-4/30 bg-card p-5 shadow-card">
          <p className="text-sm font-semibold">No se pudieron cargar las alertas</p>
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="mt-1 text-xs font-semibold text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Reintentar
            </button>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-4 @md:grid-cols-2 @4xl:grid-cols-4">
          {cargando
            ? CLAVES_PLACEHOLDER.map((clave) => <TarjetaCargando key={clave} clave={clave} />)
            : alertas.map((alerta) => <Tarjeta key={alerta.clave} alerta={alerta} />)}
        </div>
      )}
    </div>
  );
}
