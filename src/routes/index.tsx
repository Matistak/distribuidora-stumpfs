import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BarChart3, Boxes, FileText, Layers, Percent, Receipt, Users, Wallet } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { FiltrosPanel } from "@/components/dashboard/FiltrosPanel";
import {
  DonaParticipacion,
  EvolucionDiaria,
  RankingBarras,
  TablaRanking,
} from "@/components/dashboard/Charts";
import { KpiCard, Panel } from "@/components/dashboard/KpiCard";
import { DashboardSkeleton } from "@/components/dashboard/Loaders";
import {
  aplicarFiltros,
  calcularDashboard,
  fmtGs,
  fmtNum,
  fmtPct,
  opcionesFiltro,
} from "@/lib/metrics";
import { backendConectado } from "@/lib/api";
import { dashboardQueryOptions, filtrosQueryOptions, useQueryErrorToast } from "@/lib/queries";
import { filtroAnioVigente } from "@/lib/filtros";
import type { Filtros, OpcionesFiltro } from "@/lib/types";
import { useUploadState } from "@/lib/use-upload-state";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

const OPCIONES_VACIAS: OpcionesFiltro = {
  clientes: [],
  vendedores: [],
  canales: [],
  ciudades: [],
  zonas: [],
};

function Dashboard() {
  const backend = backendConectado();
  const queryClient = useQueryClient();
  const { rows } = useUploadState();
  const [filtros, setFiltros] = useState<Filtros>(() => filtroAnioVigente());
  const [filtrosEdicion, setFiltrosEdicion] = useState<Filtros>(() => filtroAnioVigente());

  const dashboardQuery = useQuery({ ...dashboardQueryOptions(filtros), enabled: backend });
  const filtrosQuery = useQuery({ ...filtrosQueryOptions(), enabled: backend });

  useQueryErrorToast(
    dashboardQuery,
    "No se pudo cargar el dashboard",
    "No fue posible obtener los datos. Intentá nuevamente.",
  );
  useQueryErrorToast(
    filtrosQuery,
    "No se pudieron cargar los filtros",
    "No fue posible obtener los filtros. Intentá nuevamente.",
  );

  const opcionesLocales = useMemo(() => opcionesFiltro(rows), [rows]);
  const filtradas = useMemo(() => aplicarFiltros(rows, filtros), [rows, filtros]);
  const dashboardLocal = useMemo(() => calcularDashboard(filtradas), [filtradas]);
  const opciones = backend ? (filtrosQuery.data ?? OPCIONES_VACIAS) : opcionesLocales;
  const d = backend ? (dashboardQuery.data ?? dashboardLocal) : dashboardLocal;
  const hayDatos = backend ? Boolean(dashboardQuery.data?.periodo.desde) : rows.length > 0;
  const cargandoBackend = backend && dashboardQuery.isPending;

  const setFiltro = (key: keyof Filtros, value: string | undefined) =>
    setFiltrosEdicion((prev) => ({ ...prev, [key]: value }));

  const limpiarFiltros = () => {
    const filtrosRestablecidos = filtroAnioVigente();

    setFiltrosEdicion(filtrosRestablecidos);
    setFiltros(filtrosRestablecidos);

    if (backend) {
      void queryClient.fetchQuery({
        ...dashboardQueryOptions(filtrosRestablecidos),
        staleTime: 0,
      });
    }
  };
  const filtrosModificados =
    filtros.desde !== filtrosEdicion.desde ||
    filtros.hasta !== filtrosEdicion.hasta ||
    filtros.cliente !== filtrosEdicion.cliente ||
    filtros.vendedor !== filtrosEdicion.vendedor;
  const aplicarFiltrosDashboard = () => {
    if (filtrosModificados) setFiltros(filtrosEdicion);
  };

  return (
    <div className="min-h-screen bg-background">
      <Toaster position="top-right" />

      {/* Encabezado */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-end justify-between gap-4 px-6 py-6 lg:px-10">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-warning">
              Distribuidora Stumpfs
            </p>
            <h1 className="mt-1 font-display text-2xl font-bold tracking-tight sm:text-3xl">
              Resumen Comercial
            </h1>
            <p className="mt-1 text-sm font-medium text-muted-foreground">
              {hayDatos
                ? `Período ${d?.periodo.desde} → ${d?.periodo.hasta}${backend ? "" : ` · ${fmtNum(filtradas.length)} líneas`}`
                : "Análisis de rendimiento comercial"}
            </p>
          </div>

          <span
            className={`rounded-md px-3 py-1.5 text-xs font-bold uppercase tracking-wide ${
              backend ? "bg-success/10 text-success" : "bg-warning/15 text-warning-foreground"
            }`}
          >
            {backend ? (cargandoBackend ? "Cargando datos..." : "Backend conectado") : "Modo local"}
          </span>
        </div>

        <div className="border-t border-border bg-secondary/35 px-6 py-5 lg:px-10">
          <div className="mx-auto max-w-[1600px]">
            <FiltrosPanel
              filtros={filtros}
              filtrosEdicion={filtrosEdicion}
              opciones={opciones}
              backend={backend}
              onChange={setFiltro}
              onApply={aplicarFiltrosDashboard}
              onReset={limpiarFiltros}
            />
          </div>
        </div>
      </header>

      <main className="@container mx-auto max-w-[1600px] space-y-6 px-6 py-7 lg:px-10">
        <section className="@container min-w-0 space-y-6">
          {cargandoBackend ? (
            <DashboardSkeleton />
          ) : (
            <>
              <div className="grid gap-5 @md:grid-cols-2 @4xl:grid-cols-4">
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

                  <div className="grid gap-4 @3xl:grid-cols-2 @6xl:grid-cols-3">
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
            </>
          )}
        </section>
      </main>
    </div>
  );
}
