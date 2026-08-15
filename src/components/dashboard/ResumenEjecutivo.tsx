import type { LucideIcon } from "lucide-react";
import {
  Boxes,
  CalendarRange,
  FileText,
  Percent,
  Target,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";
import { KpiCard, type EstadoTarjeta, type Tone } from "./KpiCard";
import { fmtGs, fmtNum } from "@/lib/metrics";
import type { ResumenKpi } from "@/lib/types";

type Estilo = {
  icon: LucideIcon;
  tone: Tone;
  titulo: string;
};

const ESTILO: Record<string, Estilo> = {
  ventasDia: { icon: TrendingUp, tone: "primary", titulo: "Ventas del día" },
  ventasMes: { icon: CalendarRange, tone: "success", titulo: "Ventas del mes" },
  margen: { icon: Percent, tone: "chart6", titulo: "Margen bruto" },
  clientesActivos: { icon: Users, tone: "chart5", titulo: "Clientes activos" },
  clientesNuevos: { icon: UserPlus, tone: "success", titulo: "Clientes nuevos" },
  facturas: { icon: FileText, tone: "chart5", titulo: "Facturas" },
  unidades: { icon: Boxes, tone: "chart6", titulo: "Unidades" },
  cumplimientoObjetivo: { icon: Target, tone: "primary", titulo: "Cumpl. objetivo" },
};

const OCULTOS = new Set(["ticketPromedio"]);

const DEFECTO: Estilo = { icon: TrendingUp, tone: "primary", titulo: "" };

const nfPct = new Intl.NumberFormat("es-PY", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const formatear = (kpi: ResumenKpi) => {
  if (kpi.valor === null) return null;
  if (kpi.formato === "moneda") return fmtGs(kpi.valor);
  if (kpi.formato === "porcentaje") return `${nfPct.format(kpi.valor * 100)}%`;
  return fmtNum(kpi.valor);
};

const PLACEHOLDER = Object.keys(ESTILO);

export function ResumenEjecutivo({
  kpis,
  cargando,
  error,
  onRetry,
  onAccion,
}: {
  kpis: ResumenKpi[];
  cargando?: boolean;
  error?: boolean;
  onRetry?: () => void;
  onAccion?: (href: string) => void;
}) {
  const estadoCarga: EstadoTarjeta | null = cargando ? "cargando" : error ? "error" : null;

  const items = estadoCarga
    ? PLACEHOLDER.map((clave) => ({ clave, kpi: null as ResumenKpi | null }))
    : kpis
        .filter((kpi) => !OCULTOS.has(kpi.clave))
        .map((kpi) => ({ clave: kpi.clave, kpi }));

  return (
    <div className="grid gap-4 @md:grid-cols-2 @3xl:grid-cols-3 @5xl:grid-cols-5">
      {items.map(({ clave, kpi }) => {
        const estilo = ESTILO[clave] ?? DEFECTO;

        if (!kpi) {
          return (
            <KpiCard
              key={clave}
              titulo={estilo.titulo}
              icon={estilo.icon}
              tone={estilo.tone}
              estado={estadoCarga ?? "cargando"}
              onRetry={onRetry}
            />
          );
        }

        return (
          <KpiCard
            key={clave}
            titulo={kpi.titulo}
            valor={formatear(kpi)}
            icon={estilo.icon}
            tone={estilo.tone}
            estado={kpi.estado}
            periodo={kpi.periodo}
            comparativo={kpi.comparativo}
            accion={
              kpi.accion && onAccion
                ? { texto: kpi.accion.texto, onClick: () => onAccion(kpi.accion!.href) }
                : undefined
            }
          />
        );
      })}
    </div>
  );
}
