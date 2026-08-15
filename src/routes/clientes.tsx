import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Building2, Crown, Users } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { FiltrosPanel } from "@/components/dashboard/FiltrosPanel";
import { RankingBarras } from "@/components/dashboard/Charts";
import { KpiCard, Panel } from "@/components/dashboard/KpiCard";
import { KpiSkeleton, PanelSkeleton, TableSkeleton } from "@/components/dashboard/Loaders";
import { ClientesTable } from "@/components/dashboard/ClientesTable";
import { backendConectado, mensajeError } from "@/lib/api";
import {
  clientesResumenQueryOptions,
  filtrosQueryOptions,
  useQueryErrorToast,
} from "@/lib/queries";
import { filtroAnioVigente, parseFiltrosSearch } from "@/lib/filtros";
import { fmtGs, fmtNum, opcionesFiltro, resumenClientesLocal } from "@/lib/metrics";
import type { ClienteResumen, Filtros, OpcionesFiltro } from "@/lib/types";
import { useUploadState } from "@/lib/use-upload-state";

export const Route = createFileRoute("/clientes")({
  validateSearch: parseFiltrosSearch,
  component: ClientesPage,
});

const OPCIONES_VACIAS: OpcionesFiltro = {
  clientes: [],
  vendedores: [],
  canales: [],
  ciudades: [],
  zonas: [],
};

function ClientesPage() {
  const backend = backendConectado();
  const { rows } = useUploadState();
  const navigate = useNavigate({ from: Route.fullPath });
  const search = Route.useSearch();
  const filtrosIniciales = Object.keys(search).length > 0 ? search : filtroAnioVigente();
  const [filtros, setFiltros] = useState<Filtros>(filtrosIniciales);
  const [filtrosEdicion, setFiltrosEdicion] = useState<Filtros>(filtrosIniciales);

  const clientesQuery = useQuery({ ...clientesResumenQueryOptions(filtros), enabled: backend });
  const filtrosQuery = useQuery({ ...filtrosQueryOptions(), enabled: backend });

  useQueryErrorToast(
    clientesQuery,
    "No se pudo cargar el resumen de clientes",
    "No fue posible obtener los datos. Intentá nuevamente.",
  );
  useQueryErrorToast(
    filtrosQuery,
    "No se pudieron cargar los filtros",
    "No fue posible obtener los filtros. Intentá nuevamente.",
  );

  const opcionesLocales = useMemo(() => opcionesFiltro(rows), [rows]);
  const opcionesDisponibles = backend ? (filtrosQuery.data ?? OPCIONES_VACIAS) : opcionesLocales;
  const dataLocal = useMemo(() => resumenClientesLocal(rows, filtros), [rows, filtros]);
  const data = backend ? (clientesQuery.data ?? dataLocal) : dataLocal;
  const hayDatos = backend
    ? Boolean(clientesQuery.data?.data.length || clientesQuery.data?.dataKpis.length)
    : rows.length > 0;
  const cargando = backend && clientesQuery.isPending;
  const errorFiltros = filtrosQuery.isError
    ? mensajeError(filtrosQuery.error, "No fue posible obtener los filtros. Intentá nuevamente.")
    : undefined;

  const setFiltro = (key: keyof Filtros, value: string | undefined) =>
    setFiltrosEdicion((prev) => ({ ...prev, [key]: value }));

  const aplicar = (nuevos: Filtros) => {
    setFiltrosEdicion(nuevos);
    setFiltros(nuevos);
    void navigate({ search: nuevos, replace: true });
  };

  const limpiarFiltros = () => aplicar(filtroAnioVigente());

  /** Acota el análisis a un cliente puntual (desde el KPI de cabecera). */
  const filtrarPorCliente = (cliente: ClienteResumen) =>
    aplicar({ ...filtros, cliente: cliente.cliente });

  const top10 = data.data.slice(0, 10).map((r) => ({
    nombre: r.cliente,
    valor: r.ventaNeta,
    participacion: r.participacion,
  }));

  const mejorCliente = data.dataKpis[0];

  return (
    <div className="min-h-screen bg-background">
      <Toaster position="top-right" />

      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-[1600px] items-center gap-3 px-4 py-5 lg:px-8">
          <span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
            <Building2 className="size-5" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Operación
            </p>
            <h1 className="text-xl font-bold tracking-tight">Clientes</h1>
            <p className="text-sm text-muted-foreground">
              Rendimiento agregado de la cartera de clientes según la base de ventas.
            </p>
          </div>
        </div>
      </header>

      <main className="@container mx-auto max-w-[1600px] space-y-6 px-4 py-5 lg:px-8">
        <FiltrosPanel
          filtros={filtros}
          filtrosEdicion={filtrosEdicion}
          opciones={opcionesDisponibles}
          backend={backend}
          error={errorFiltros}
          onChange={setFiltro}
          onApply={() => {
            setFiltros(filtrosEdicion);
            void navigate({ search: filtrosEdicion, replace: true });
          }}
          onReset={limpiarFiltros}
        />

        {cargando ? (
          <>
            <div className="grid gap-4 @md:grid-cols-2">
              <KpiSkeleton />
              <KpiSkeleton />
            </div>
            <TableSkeleton filas={10} columnas={12} />
            <PanelSkeleton />
          </>
        ) : hayDatos ? (
          <>
            <div className="grid gap-4 @md:grid-cols-2">
              <KpiCard
                titulo="Cliente con más compras"
                valor={mejorCliente?.cliente ?? "—"}
                detalle={
                  mejorCliente
                    ? `Venta neta: ${fmtGs(mejorCliente.ventaNeta)}`
                    : "Sin ventas en el período"
                }
                icon={Crown}
                {...(mejorCliente ? { onClick: () => filtrarPorCliente(mejorCliente) } : {})}
              />
              <KpiCard
                titulo="Clientes activos"
                valor={fmtNum(data.kpis.clientesActivos)}
                detalle={`Top 10 concentra ${(data.kpis.concentracionTop10 * 100).toFixed(1)}% de la venta neta`}
                icon={Users}
              />
            </div>

            <ClientesTable data={data.data} />

            <Panel titulo="Top 10 clientes por venta neta">
              <RankingBarras data={top10} height={360} horizontal />
            </Panel>
          </>
        ) : (
          <div className="rounded-xl border border-border bg-card p-12 text-center shadow-card">
            <h2 className="text-base font-semibold">No hay ventas para mostrar</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              {rows.length === 0 && !backend
                ? "Subí un Excel de ventas y acá vas a ver el resumen de cada cliente."
                : "Probá ampliar el rango de fechas o quitar filtros para ver el resumen."}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
