import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  BarChart3,
  Boxes,
  FileText,
  Layers,
  Percent,
  Receipt,
  Truck,
  Users,
  Wallet,
} from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { KpiCard, Panel } from "@/components/dashboard/KpiCard";
import {
  DonaParticipacion,
  EvolucionDiaria,
  RankingBarras,
  TablaRanking,
} from "@/components/dashboard/Charts";
import { UploadPanel } from "@/components/dashboard/UploadPanel";
import { aplicarFiltros, calcularDashboard, fmtGs, fmtNum, fmtPct, opcionesFiltro } from "@/lib/metrics";
import { backendConectado } from "@/lib/api";
import type { Filtros, VentaRow } from "@/lib/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tablero de Control Comercial | Ventas desde Excel" },
      {
        name: "description",
        content:
          "Cargá tu Excel de ventas y visualizá KPIs, evolución diaria, ranking de vendedores, ciudades y clientes en un dashboard interactivo.",
      },
      { property: "og:title", content: "Tablero de Control Comercial" },
      {
        property: "og:description",
        content: "Dashboard de ventas actualizado automáticamente con los datos de tu Excel.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

const TODOS = "__todos__";

function Dashboard() {
  const [rows, setRows] = useState<VentaRow[]>([]);
  const [archivo, setArchivo] = useState<string>();
  const [filtros, setFiltros] = useState<Filtros>({});

  const opciones = useMemo(() => opcionesFiltro(rows), [rows]);
  const filtradas = useMemo(() => aplicarFiltros(rows, filtros), [rows, filtros]);
  const d = useMemo(() => calcularDashboard(filtradas), [filtradas]);
  const hayDatos = rows.length > 0;

  const setFiltro = (k: keyof Filtros) => (v: string) =>
    setFiltros((prev) => ({ ...prev, [k]: v === TODOS ? undefined : v }));

  return (
    <div className="min-h-screen bg-background">
      <Toaster position="top-right" />

      {/* Encabezado */}
      <header className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-4 px-4 py-3 lg:px-8">
          <div className="flex items-center gap-3">
            <span
              className="grid size-10 place-items-center rounded-lg text-primary-foreground"
              style={{ backgroundImage: "var(--gradient-brand)" }}
            >
              <Truck className="size-5" />
            </span>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Tablero de Control Comercial</h1>
              <p className="text-xs text-muted-foreground">
                {hayDatos
                  ? `Período ${d.periodo.desde} → ${d.periodo.hasta} · ${fmtNum(filtradas.length)} líneas`
                  : "Visión general del negocio"}
              </p>
            </div>
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <FiltroSelect
              placeholder="Todos los vendedores"
              valor={filtros.vendedor}
              opciones={opciones.vendedores}
              onChange={setFiltro("vendedor")}
            />
            <FiltroSelect
              placeholder="Todos los canales"
              valor={filtros.canal}
              opciones={opciones.canales}
              onChange={setFiltro("canal")}
            />
            <FiltroSelect
              placeholder="Todas las ciudades"
              valor={filtros.ciudad}
              opciones={opciones.ciudades}
              onChange={setFiltro("ciudad")}
            />
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                backendConectado()
                  ? "bg-success/10 text-success"
                  : "bg-warning/15 text-warning-foreground"
              }`}
            >
              {backendConectado() ? "Backend conectado" : "Modo local (sin backend)"}
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] space-y-4 px-4 py-5 lg:px-8">
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              titulo="Venta neta"
              valor={fmtGs(d.kpis.ventaNeta)}
              detalle={`Bruta: ${fmtGs(d.kpis.ventaBruta)}`}
              icon={Wallet}
            />
            <KpiCard
              titulo="Facturas"
              valor={fmtNum(d.kpis.cantidadFacturas)}
              detalle={`${fmtNum(d.kpis.notasCredito)} notas de crédito`}
              icon={FileText}
              tone="chart5"
            />
            <KpiCard
              titulo="Ticket promedio"
              valor={fmtGs(d.kpis.ticketPromedio)}
              icon={Receipt}
              tone="warning"
            />
            <KpiCard
              titulo="Clientes activos"
              valor={fmtNum(d.kpis.clientesActivos)}
              icon={Users}
              tone="success"
            />
            <KpiCard
              titulo="Unidades vendidas"
              valor={fmtNum(d.kpis.unidadesVendidas)}
              icon={Boxes}
              tone="chart6"
            />
            <KpiCard
              titulo="Productos distintos"
              valor={fmtNum(d.kpis.productosDistintos)}
              icon={Layers}
              tone="primary"
            />
            <KpiCard
              titulo="Margen bruto"
              valor={fmtPct(d.kpis.margenPorc)}
              detalle="Sobre venta neta"
              icon={Percent}
              tone="success"
            />
            <KpiCard
              titulo="Vendedores activos"
              valor={fmtNum(opciones.vendedores.length)}
              icon={BarChart3}
              tone="destructive"
            />
          </div>

          <UploadPanel
            onDatos={(r, nombre) => {
              setRows(r);
              setArchivo(nombre);
              setFiltros({});
            }}
            archivo={archivo}
            filas={rows.length}
          />
        </div>

        {hayDatos ? (
          <>
            <div className="grid gap-4 xl:grid-cols-3">
              <Panel titulo="Evolución de ventas diarias" className="xl:col-span-2">
                <EvolucionDiaria data={d.ventasPorDia} />
              </Panel>
              <Panel titulo="Ventas por ciudad">
                <DonaParticipacion data={d.ventasPorCiudad} />
              </Panel>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <Panel titulo="Ventas por vendedor (top 10)">
                <RankingBarras data={d.ventasPorVendedor} />
              </Panel>
              <Panel titulo="Ventas por marca (top 10)">
                <RankingBarras data={d.ventasPorMarca} />
              </Panel>
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
              <Panel titulo="Ventas por canal">
                <TablaRanking data={d.ventasPorCanal} etiqueta="Canal" />
              </Panel>
              <Panel titulo="Top 5 clientes">
                <TablaRanking data={d.topClientes} etiqueta="Cliente" />
              </Panel>
              <Panel titulo="Top productos">
                <TablaRanking data={d.topProductos} etiqueta="Producto" />
              </Panel>
            </div>
          </>
        ) : (
          <div className="rounded-xl border border-border bg-card p-12 text-center shadow-card">
            <h2 className="text-base font-semibold">Todavía no hay datos cargados</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Subí un Excel de ventas con las columnas habituales (cliente, producto, marca,
              vendedor, canal, zona, ciudad, montos) y el tablero se genera automáticamente.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

function FiltroSelect({
  placeholder,
  valor,
  opciones,
  onChange,
}: {
  placeholder: string;
  valor?: string | undefined;
  opciones: string[];
  onChange: (v: string) => void;
}) {
  return (
    <Select value={valor ?? TODOS} onValueChange={onChange}>
      <SelectTrigger className="h-9 w-[190px] text-xs">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="max-h-72">
        <SelectItem value={TODOS}>{placeholder}</SelectItem>
        {opciones.map((o) => (
          <SelectItem key={o} value={o}>
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
