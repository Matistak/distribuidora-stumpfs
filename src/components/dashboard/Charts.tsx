import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { RankingItem, SeriePunto } from "@/lib/types";
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

export function EvolucionDiaria({ data }: { data: SeriePunto[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="gradVentas" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.02} />
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
          formatter={(v: number) => [fmtGs(v), "Venta neta"]}
          labelFormatter={(l) => `Día ${l}`}
        />
        <Area
          type="monotone"
          dataKey="valor"
          stroke="var(--chart-1)"
          strokeWidth={2.5}
          fill="url(#gradVentas)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function RankingBarras({ data, height = 300 }: { data: RankingItem[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
        <XAxis
          type="number"
          tickFormatter={fmtCompact}
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
        />
        <YAxis
          type="category"
          dataKey="nombre"
          width={140}
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(v: number) => [fmtGs(v), "Venta neta"]}
          cursor={{ fill: "var(--muted)" }}
        />
        <Bar dataKey="valor" fill="var(--chart-1)" radius={[0, 4, 4, 0]} maxBarSize={18} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DonaParticipacion({ data }: { data: RankingItem[] }) {
  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row">
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
      <ul className="w-full space-y-1.5 sm:w-44">
        {data.map((d, i) => (
          <li key={d.nombre} className="flex items-center gap-2 text-xs">
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: COLORS[i % COLORS.length] }}
            />
            <span className="truncate text-muted-foreground">{d.nombre}</span>
            <span className="ml-auto font-semibold text-foreground">
              {fmtPct(d.participacion)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TablaRanking({
  data,
  etiqueta,
}: {
  data: RankingItem[];
  etiqueta: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-xs text-muted-foreground">
            <th className="py-2 text-left font-semibold">{etiqueta}</th>
            <th className="py-2 text-right font-semibold">Venta neta</th>
            <th className="py-2 text-right font-semibold">Part.</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.nombre} className="border-b border-border/60 last:border-0">
              <td className="max-w-[220px] truncate py-2 pr-2">{d.nombre}</td>
              <td className="py-2 text-right tabular-nums">{fmtGs(d.valor)}</td>
              <td className="py-2 text-right tabular-nums text-muted-foreground">
                {fmtPct(d.participacion)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
