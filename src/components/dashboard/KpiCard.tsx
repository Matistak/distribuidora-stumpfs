import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "primary" | "success" | "warning" | "destructive" | "chart5" | "chart6";

const toneBorder: Record<Tone, string> = {
  primary: "border-t-primary",
  success: "border-t-success",
  warning: "border-t-warning",
  destructive: "border-t-chart-4",
  chart5: "border-t-chart-5",
  chart6: "border-t-chart-6",
};

const toneIcon: Record<Tone, string> = {
  primary: "text-primary",
  success: "text-success",
  warning: "text-warning",
  destructive: "text-chart-4",
  chart5: "text-chart-5",
  chart6: "text-chart-6",
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
        "rounded-xl border border-border border-t-4 bg-card p-5 shadow-card transition-shadow hover:shadow-lg",
        toneBorder[tone],
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          {titulo}
        </p>
        <Icon className={cn("size-4 shrink-0", toneIcon[tone])} />
      </div>
      <p className="mt-2 break-words font-display text-2xl font-bold leading-tight text-foreground">
        {valor}
      </p>
      {detalle ? (
        <p className="mt-1.5 break-words text-xs leading-tight text-muted-foreground">{detalle}</p>
      ) : null}
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
    <section
      className={cn("overflow-hidden rounded-xl border border-border bg-card shadow-card", className)}
    >
      <header className="flex items-center justify-between gap-2 border-b border-border px-5 py-3.5">
        <h2 className="font-display text-sm font-semibold text-foreground">{titulo}</h2>
        {accion}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}
