import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ComparativoMensual, RankingItem, SerieAnual } from "@/lib/types";
import { fmtCompact, fmtGs, fmtPct } from "@/lib/metrics";

const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
];

const tooltipStyle = {
  backgroundColor: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: "0.5rem",
  fontSize: 12,
  color: "var(--foreground)",
} as const;

const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const MESES_CORTOS = MESES.map((m) => m.slice(0, 3));

/** "2026-08" -> "Agosto 2026" */
const nombreMes = (clave: string) => {
  if (!clave) return "";
  const [anho, mes] = clave.split("-");
  return `${MESES[Number(mes) - 1] ?? clave} ${anho}`;
};

export function EvolucionDiaria({ data }: { data: ComparativoMensual }) {
  const etiquetaActual = nombreMes(data.mesActual) || "Mes vigente";
  const etiquetaAnterior = nombreMes(data.mesAnterior) || "Mes anterior";

  if (data.puntos.length === 0) {
    return (
      <div className="flex h-full min-h-60 items-center justify-center text-sm text-muted-foreground">
        Sin datos para mostrar
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <ResponsiveContainer width="100%" height={300} minWidth={0}>
        <AreaChart data={data.puntos} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="gradVentas" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="gradVentasPrev" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-4)" stopOpacity={0.2} />
              <stop offset="100%" stopColor="var(--chart-4)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
          <YAxis
            tickFormatter={fmtCompact}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            width={52}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(v: number, name) => [fmtGs(v), name as string]}
            labelFormatter={(l) => `Día ${l}`}
          />
          <Legend
            wrapperStyle={{ fontSize: 12 }}
            iconType="plainline"
            formatter={(value) => <span style={{ color: "var(--muted-foreground)" }}>{value}</span>}
          />
          <Area
            type="monotone"
            dataKey="anterior"
            name={etiquetaAnterior}
            stroke="var(--chart-4)"
            strokeWidth={2}
            strokeDasharray="5 4"
            fill="url(#gradVentasPrev)"
            connectNulls
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="actual"
            name={etiquetaActual}
            stroke="var(--chart-1)"
            strokeWidth={2.5}
            fill="url(#gradVentas)"
            connectNulls
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Linea unica con el total vendido en cada uno de los 12 meses del anho. */
export function EvolucionMensual({ data }: { data: SerieAnual }) {
  // Siempre 12 puntos: los meses sin ventas van en 0.
  const puntos = MESES_CORTOS.map((label, i) => ({
    label,
    valor: data.puntos[i]?.valor ?? 0,
  }));

  return (
    <div className="min-w-0">
      <ResponsiveContainer width="100%" height={300} minWidth={0}>
        <LineChart data={puntos} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
          <YAxis
            tickFormatter={fmtCompact}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            width={52}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(v: number) => [fmtGs(v), "Venta neta"]}
            labelFormatter={(l) => (data.anho ? `${l} ${data.anho}` : String(l))}
          />
          <Line
            type="monotone"
            dataKey="valor"
            name="Venta neta"
            stroke="var(--chart-1)"
            strokeWidth={2.5}
            dot={{ r: 3, fill: "var(--chart-1)", strokeWidth: 0 }}
            activeDot={{ r: 5 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function RankingBarras({
  data,
  height = 300,
  horizontal = true,
}: {
  data: RankingItem[];
  height?: number;
  /** true: barras horizontales; false: barras verticales */
  horizontal?: boolean;
}) {
  return (
    <div className="min-w-0">
      <ResponsiveContainer width="100%" height={height} minWidth={0}>
        <BarChart
          data={data}
          layout={horizontal ? "vertical" : "horizontal"}
          margin={
            horizontal
              ? { top: 0, right: 16, left: 8, bottom: 0 }
              : { top: 0, right: 8, left: 0, bottom: 52 }
          }
          barCategoryGap={horizontal ? 8 : "10%"}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--border)"
            horizontal={!horizontal}
            vertical={horizontal}
          />
          {horizontal ? (
            <XAxis
              type="number"
              domain={[0, "dataMax"]}
              tickFormatter={fmtCompact}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            />
          ) : (
            <XAxis
              dataKey="nombre"
              interval={0}
              height={52}
              angle={-35}
              textAnchor="end"
              tickMargin={8}
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              tickFormatter={(nombre: string) =>
                nombre.length > 14 ? `${nombre.slice(0, 13)}…` : nombre
              }
            />
          )}
          {horizontal ? (
            <YAxis
              type="category"
              dataKey="nombre"
              interval={0}
              width={155}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            />
          ) : (
            <YAxis
              tickFormatter={fmtCompact}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              width={52}
            />
          )}
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(v: number) => [fmtGs(v), "Venta neta"]}
            labelFormatter={(label, payload) => payload?.[0]?.payload?.nombre ?? label}
            cursor={false}
          />
          <Bar
            dataKey="valor"
            fill="var(--chart-1)"
            radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]}
            maxBarSize={horizontal ? 18 : 28}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DonaParticipacion({ data }: { data: RankingItem[] }) {
  return (
    <div className="@container min-w-0">
      <div className="flex min-w-0 flex-col items-center gap-3 @md:flex-row">
        <div className="w-full shrink-0 @md:w-[200px]">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={data}
                dataKey="valor"
                nameKey="nombre"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={2}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => fmtGs(v)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className="w-full min-w-0 flex-1 space-y-1.5">
          {data.map((d, i) => (
            <li key={d.nombre} className="flex items-start gap-2 text-xs">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: COLORS[i % COLORS.length] }}
              />
              <span className="min-w-0 flex-1 break-words leading-tight text-muted-foreground">
                {d.nombre}
              </span>
              <span className="shrink-0 whitespace-nowrap font-semibold text-foreground">
                {fmtPct(d.participacion)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function TablaRanking({ data, etiqueta }: { data: RankingItem[]; etiqueta: string }) {
  return (
    <div className="table-scroll">
      <table className="w-full min-w-[430px] table-fixed text-sm">
        <thead>
          <tr className="border-b border-border text-xs text-muted-foreground">
            <th className="w-[45%] py-2 text-left font-semibold">{etiqueta}</th>
            <th className="w-[38%] whitespace-nowrap py-2 text-right font-semibold">Venta neta</th>
            <th className="w-[17%] whitespace-nowrap py-2 text-right font-semibold">Part.</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.nombre} className="border-b border-border/60 last:border-0">
              <td className="w-[45%] break-words py-2 pr-3 align-top leading-snug">{d.nombre}</td>
              <td className="w-[38%] whitespace-nowrap py-2 text-right tabular-nums align-top">
                {fmtGs(d.valor)}
              </td>
              <td className="w-[17%] whitespace-nowrap py-2 text-right tabular-nums text-muted-foreground align-top">
                {fmtPct(d.participacion)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
