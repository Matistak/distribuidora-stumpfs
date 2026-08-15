import type { LucideIcon } from "lucide-react";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Comparativo, EstadoKpi } from "@/lib/types";

export type Tone = "primary" | "success" | "warning" | "destructive" | "chart5" | "chart6";

const toneIcon: Record<Tone, string> = {
  primary: "text-primary",
  success: "text-success",
  warning: "text-warning",
  destructive: "text-chart-4",
  chart5: "text-chart-5",
  chart6: "text-chart-6",
};

export type EstadoCarga = "cargando" | "error";
export type EstadoTarjeta = EstadoKpi | EstadoCarga;

const SIN_VALOR = "—";

const CLASE_VALOR =
  "mt-2 whitespace-nowrap font-display text-[clamp(1.05rem,7.5cqi,1.5rem)] font-bold leading-tight tabular-nums";

type Sentido = "positivo" | "negativo" | "neutro";

const nfDelta = new Intl.NumberFormat("es-PY", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const fmtDelta = (c: Extract<Comparativo, { tipo: "delta" }>) => {
  const abs = nfDelta.format(Math.abs(c.pct) * 100);
  return c.unidad === "pp" ? `${abs} pp` : `${abs}%`;
};

function PieComparativo({ comparativo, sentido }: { comparativo: Comparativo; sentido: Sentido }) {
  if (comparativo.tipo === "no-disponible") {
    return (
      <p className="mt-1.5 break-words text-xs leading-tight text-muted-foreground">
        {comparativo.motivo}
      </p>
    );
  }

  const sinCambio = comparativo.pct === 0;
  const subio = comparativo.pct > 0;
  const bueno = sentido === "positivo" ? subio : !subio;
  const Flecha = sinCambio ? Minus : subio ? ArrowUp : ArrowDown;

  const color =
    sinCambio || sentido === "neutro"
      ? "text-muted-foreground"
      : bueno
        ? "text-success"
        : "text-chart-4";

  return (
    <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs leading-tight">
      <span className={cn("inline-flex items-center gap-0.5 font-semibold", color)}>
        <Flecha className="size-3 shrink-0" aria-hidden />
        {sinCambio ? "sin cambios" : fmtDelta(comparativo)}
      </span>
      <span className="text-muted-foreground">vs. {comparativo.base}</span>
    </p>
  );
}

export function KpiCard({
  titulo,
  valor,
  detalle,
  icon: Icon,
  tone = "primary",
  estado = "ok",
  periodo,
  comparativo,
  sentido = "positivo",
  accion,
  onRetry,
  className,
  onClick,
}: {
  titulo: string;
  valor?: string | null;
  detalle?: string;
  icon: LucideIcon;
  tone?: Tone;
  estado?: EstadoTarjeta;
  periodo?: string;
  comparativo?: Comparativo;
  sentido?: Sentido;
  accion?: { texto: string; onClick: () => void } | undefined;
  onRetry?: (() => void) | undefined;
  className?: string | undefined;
  onClick?: (() => void) | undefined;
}) {
  const apagada = estado === "sin-datos" || estado === "sin-configurar";
  const clicable = Boolean(onClick) && estado !== "cargando" && !apagada;

  const contenedor = (contenido: React.ReactNode, extra?: string) => (
    <div
      role={clicable ? "button" : undefined}
      tabIndex={clicable ? 0 : undefined}
      onClick={clicable ? onClick : undefined}
      onKeyDown={
        clicable
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      className={cn(
        "@container rounded-xl border border-border bg-card p-5 shadow-card transition-shadow",
        clicable &&
          "cursor-pointer hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        extra,
        className,
      )}
    >
      {contenido}
    </div>
  );

  if (estado === "cargando") {
    return contenedor(
      <div aria-busy="true" aria-label={`${titulo}: cargando`}>
        <div className="flex items-start justify-between gap-3">
          <div className="h-3 w-24 animate-pulse rounded bg-muted" />
          <Icon className="size-4 shrink-0 text-muted-foreground/40" aria-hidden />
        </div>
        <div className="mt-2.5 h-7 w-32 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-3 w-28 animate-pulse rounded bg-muted" />
      </div>,
    );
  }

  const encabezado = (
    <div className={cn("flex items-start justify-between gap-3", periodo && "min-h-[2.4rem]")}>
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase leading-tight tracking-wider text-muted-foreground">
          {titulo}
        </p>
        {periodo ? (
          <p className="mt-0.5 text-[11px] font-medium text-muted-foreground/80">{periodo}</p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {estado === "parcial" ? (
          <span className="rounded bg-warning/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-warning-foreground">
            parcial
          </span>
        ) : null}
        <Icon
          className={cn("size-4 shrink-0", apagada ? "text-muted-foreground/40" : toneIcon[tone])}
          aria-hidden
        />
      </div>
    </div>
  );

  if (estado === "error") {
    return contenedor(
      <>
        {encabezado}
        <p className={cn(CLASE_VALOR, "text-muted-foreground")}>{SIN_VALOR}</p>
        <p className="mt-1.5 text-xs leading-tight text-chart-4">No se pudo cargar</p>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="mt-1 text-xs font-semibold text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Reintentar
          </button>
        ) : null}
      </>,
      "border-chart-4/30",
    );
  }

  if (apagada) {
    return contenedor(
      <>
        {encabezado}
        <p className={cn(CLASE_VALOR, "text-muted-foreground/60")}>{SIN_VALOR}</p>
        {comparativo ? (
          <PieComparativo comparativo={comparativo} sentido={sentido} />
        ) : detalle ? (
          <p className="mt-1.5 break-words text-xs leading-tight text-muted-foreground">
            {detalle}
          </p>
        ) : null}
        {accion ? (
          <button
            type="button"
            onClick={accion.onClick}
            className="mt-1 text-xs font-semibold text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {accion.texto} →
          </button>
        ) : null}
      </>,
      "bg-card/60",
    );
  }

  return contenedor(
    <>
      {encabezado}
      <p className={cn(CLASE_VALOR, "text-foreground")}>{valor ?? SIN_VALOR}</p>
      {comparativo ? (
        <PieComparativo comparativo={comparativo} sentido={sentido} />
      ) : detalle ? (
        <p className="mt-1.5 break-words text-xs leading-tight text-muted-foreground">{detalle}</p>
      ) : null}
    </>,
  );
}

export function Panel({
  titulo,
  accion,
  children,
  className,
}: {
  titulo: string;
  accion?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card shadow-card",
        className,
      )}
    >
      <header className="flex items-center justify-between gap-2 border-b border-border px-5 py-3.5">
        <h2 className="font-display text-sm font-semibold text-foreground">{titulo}</h2>
        {accion}
      </header>
      <div className="flex min-h-0 flex-1 flex-col p-5">{children}</div>
    </section>
  );
}
