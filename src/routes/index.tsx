import { type ChangeEvent, useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
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
import { FiltroSelect } from "@/components/dashboard/FiltroSelect";
import {
  DonaParticipacion,
  EvolucionDiaria,
  RankingBarras,
  TablaRanking,
} from "@/components/dashboard/Charts";
import { KpiCard, Panel } from "@/components/dashboard/KpiCard";
import { Input } from "@/components/ui/input";
import {
  aplicarFiltros,
  calcularDashboard,
  fmtGs,
  fmtNum,
  fmtPct,
  opcionesFiltro,
} from "@/lib/metrics";
import { backendConectado, obtenerDashboard, obtenerFiltros } from "@/lib/api";
import type { DashboardData, Filtros, OpcionesFiltro } from "@/lib/types";
import { useUploadState } from "@/lib/use-upload-state";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

const OPCIONES_VACIAS: OpcionesFiltro = {
  vendedores: [],
  canales: [],
  ciudades: [],
  zonas: [],
};

function Dashboard() {
  const backend = backendConectado();
  const { rows, actualizacion } = useUploadState();
  const [filtros, setFiltros] = useState<Filtros>({});
  const [dashboardBackend, setDashboardBackend] = useState<DashboardData | null>(null);
  const [opcionesBackend, setOpcionesBackend] = useState<OpcionesFiltro>(OPCIONES_VACIAS);
  const [cargandoBackend, setCargandoBackend] = useState(backend);
  useEffect(() => {
    if (!backend) return;

    let activo = true;
    setCargandoBackend(true);

    obtenerDashboard(filtros)
      .then((data) => {
        if (activo) setDashboardBackend(data);
      })
      .catch((error: unknown) => {
        if (activo) {
          toast.error("No se pudo cargar el dashboard", {
            description: error instanceof Error ? error.message : "Error de conexión",
          });
        }
      })
      .finally(() => {
        if (activo) setCargandoBackend(false);
      });

    return () => {
      activo = false;
    };
  }, [backend, filtros, actualizacion]);

  useEffect(() => {
    if (!backend) return;

    let activo = true;
    obtenerFiltros()
      .then((data) => {
        if (activo) setOpcionesBackend(data);
      })
      .catch((error: unknown) => {
        if (activo) {
          toast.error("No se pudieron cargar los filtros", {
            description: error instanceof Error ? error.message : "Error de conexión",
          });
        }
      });

    return () => {
      activo = false;
    };
  }, [backend, actualizacion]);

  const opcionesLocales = useMemo(() => opcionesFiltro(rows), [rows]);
  const filtradas = useMemo(() => aplicarFiltros(rows, filtros), [rows, filtros]);
  const dashboardLocal = useMemo(() => calcularDashboard(filtradas), [filtradas]);
  const opciones = backend ? opcionesBackend : opcionesLocales;
  const d = backend ? (dashboardBackend ?? dashboardLocal) : dashboardLocal;
  const hayDatos = backend ? Boolean(dashboardBackend?.periodo.desde) : rows.length > 0;

  const setFiltro = (k: keyof Filtros) => (v: string | undefined) =>
    setFiltros((prev) => ({ ...prev, [k]: v }));

  const setFecha = (k: "desde" | "hasta") => (e: ChangeEvent<HTMLInputElement>) =>
    setFiltros((prev) => ({ ...prev, [k]: e.target.value || undefined }));

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
                  ? `Período ${d?.periodo.desde} → ${d?.periodo.hasta}${backend ? "" : ` · ${fmtNum(filtradas.length)} líneas`}`
                  : "Visión general del negocio"}
              </p>
            </div>
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              Desde
              <Input
                type="date"
                value={filtros.desde ?? ""}
                onChange={setFecha("desde")}
                className="h-9 w-[140px] text-xs"
                aria-label="Fecha desde"
              />
            </label>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              Hasta
              <Input
                type="date"
                value={filtros.hasta ?? ""}
                onChange={setFecha("hasta")}
                className="h-9 w-[140px] text-xs"
                aria-label="Fecha hasta"
              />
            </label>
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
            <FiltroSelect
              placeholder="Todas las zonas"
              valor={filtros.zona}
              opciones={opciones.zonas}
              onChange={setFiltro("zona")}
            />
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                backend ? "bg-success/10 text-success" : "bg-warning/15 text-warning-foreground"
              }`}
            >
              {backend
                ? cargandoBackend
                  ? "Cargando datos..."
                  : "Backend conectado"
                : "Modo local (sin backend)"}
            </span>
          </div>
        </div>
      </header>

      <main className="@container mx-auto max-w-[1600px] space-y-4 px-4 py-5 lg:px-8">
        <section className="@container min-w-0 space-y-4">
          <div className="grid gap-4 @md:grid-cols-2 @4xl:grid-cols-3 @6xl:grid-cols-4">
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

          {hayDatos && d ? (
            <>
              <div className="grid gap-4 @5xl:grid-cols-3">
                <Panel titulo="Evolución de ventas diarias" className="@5xl:col-span-2">
                  <EvolucionDiaria data={d.ventasPorDia} />
                </Panel>
                <Panel titulo="Ventas por ciudad">
                  <DonaParticipacion data={d.ventasPorCiudad} />
                </Panel>
              </div>

              <div className="grid gap-4 @3xl:grid-cols-2">
                <Panel titulo="Ventas por vendedor (top 10)">
                  <RankingBarras data={d.ventasPorVendedor} />
                </Panel>
                <Panel titulo="Ventas por marca (top 10)">
                  <RankingBarras data={d.ventasPorMarca} />
                </Panel>
              </div>

              <div className="grid gap-4 @5xl:grid-cols-3">
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
        </section>
      </main>
    </div>
  );
}
