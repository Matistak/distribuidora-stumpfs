import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "primary" | "success" | "warning" | "destructive" | "chart5" | "chart6";

const toneBg: Record<Tone, string> = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/15 text-warning",
  destructive: "bg-destructive/10 text-destructive",
  chart5: "bg-chart-5/10 text-chart-5",
  chart6: "bg-chart-6/10 text-chart-6",
};

export function KpiCard({
  titulo,
  valor,
  detalle,
  icon: Icon,
  tone = "primary",
  className,
}: {
  titulo: string;
  valor: string;
  detalle?: string;
  icon: LucideIcon;
  tone?: Tone;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-4 shadow-card transition-shadow hover:shadow-lg",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span className={cn("grid size-10 shrink-0 place-items-center rounded-full", toneBg[tone])}>
          <Icon className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
            {titulo}
          </p>
          <p className="mt-1 break-words text-lg font-bold leading-tight text-foreground sm:text-xl">
            {valor}
          </p>
          {detalle ? (
            <p className="mt-0.5 break-words text-xs leading-tight text-muted-foreground">
              {detalle}
            </p>
          ) : null}
        </div>
      </div>
    </div>
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
    <section className={cn("rounded-xl border border-border bg-card p-4 shadow-card", className)}>
      <header className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-xs font-bold tracking-wide text-foreground uppercase">{titulo}</h2>
        {accion}
      </header>
      {children}
    </section>
  );
}
