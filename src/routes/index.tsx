import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
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
import { backendConectado, mensajeError, obtenerDashboard, obtenerFiltros } from "@/lib/api";
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
  // El primer arranque del sidecar puede tardar en estar listo; la primera
  // carga se reintenta para no mostrar la app vacia.
  const primeraCargaRef = useRef(true);
  useEffect(() => {
    if (!backend) return;

    let activo = true;
    const intentos = primeraCargaRef.current ? 8 : 1;
    setCargandoBackend(true);

    const cargar = async () => {
      let error: unknown;
      for (let intento = 0; intento < intentos; intento++) {
        if (!activo) return;
        try {
          const data = await obtenerDashboard(filtros);
          if (!activo) return;
          primeraCargaRef.current = false;
          setDashboardBackend(data);
          setCargandoBackend(false);
          return;
        } catch (cause) {
          error = cause;
          if (intento < intentos - 1) await new Promise((r) => setTimeout(r, 800));
        }
      }
      if (!activo) return;
      primeraCargaRef.current = false;
      setCargandoBackend(false);
      toast.error("No se pudo cargar el dashboard", {
        description: mensajeError(
          error,
          "No fue posible obtener los datos. Intentá nuevamente.",
        ),
      });
    };

    void cargar();

    return () => {
      activo = false;
    };
  }, [backend, filtros, actualizacion]);

  useEffect(() => {
    if (!backend) return;

    let activo = true;
    const cargarFiltros = async (intento: number) => {
      if (!activo) return;
      try {
        const data = await obtenerFiltros();
        if (activo) setOpcionesBackend(data);
      } catch (error: unknown) {
        if (intento < 3) {
          await new Promise((r) => setTimeout(r, 800));
          void cargarFiltros(intento + 1);
        } else if (activo) {
          toast.error("No se pudieron cargar los filtros", {
            description: mensajeError(
              error,
              "No fue posible obtener los filtros. Intentá nuevamente.",
            ),
          });
        }
      }
    };

    void cargarFiltros(0);

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
            {backend
              ? cargandoBackend
                ? "Cargando datos..."
                : "Backend conectado"
              : "Modo local"}
          </span>
        </div>

        <div className="border-t border-border bg-secondary/60">
          <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-2 px-6 py-3 lg:px-10">
            <span className="mr-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Filtros
            </span>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              Desde
              <Input
                type="date"
                value={filtros.desde ?? ""}
                onChange={setFecha("desde")}
                className="h-9 w-[140px] bg-card text-xs"
                aria-label="Fecha desde"
              />
            </label>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              Hasta
              <Input
                type="date"
                value={filtros.hasta ?? ""}
                onChange={setFecha("hasta")}
                className="h-9 w-[140px] bg-card text-xs"
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
          </div>
        </div>
      </header>

      <main className="@container mx-auto max-w-[1600px] space-y-6 px-6 py-7 lg:px-10">
        <section className="@container min-w-0 space-y-6">
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
        </section>
      </main>
    </div>
  );
}
