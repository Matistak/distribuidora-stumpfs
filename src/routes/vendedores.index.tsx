import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Medal, Trophy, UserRound } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { FiltrosPanel } from "@/components/dashboard/FiltrosPanel";
import { RankingBarras } from "@/components/dashboard/Charts";
import { KpiCard, Panel } from "@/components/dashboard/KpiCard";
import { KpiSkeleton, PanelSkeleton, TableSkeleton } from "@/components/dashboard/Loaders";
import { VendedoresTable } from "@/components/dashboard/VendedoresTable";
import { backendConectado, mensajeError } from "@/lib/api";
import { filtrosQueryOptions, useQueryErrorToast, vendedoresQueryOptions } from "@/lib/queries";
import { filtroAnioVigente, parseFiltrosSearch } from "@/lib/filtros";
import { fmtGs, opcionesFiltro, resumenVendedoresLocal } from "@/lib/metrics";
import type { Filtros, OpcionesFiltro, VendedorResumen } from "@/lib/types";
import { useUploadState } from "@/lib/use-upload-state";

export const Route = createFileRoute("/vendedores/")({
  validateSearch: parseFiltrosSearch,
  component: VendedoresPage,
});

const OPCIONES_VACIAS: OpcionesFiltro = {
  clientes: [],
  vendedores: [],
  canales: [],
  ciudades: [],
  zonas: [],
  tiposDoc: [],
};

function VendedoresPage() {
  const backend = backendConectado();
  const { rows } = useUploadState();
  const navigate = useNavigate({ from: Route.fullPath });
  const search = Route.useSearch();
  const filtrosIniciales = Object.keys(search).length > 0 ? search : filtroAnioVigente();
  const [filtros, setFiltros] = useState<Filtros>(filtrosIniciales);
  const [filtrosEdicion, setFiltrosEdicion] = useState<Filtros>(filtrosIniciales);

  const vendedoresQuery = useQuery({ ...vendedoresQueryOptions(filtros), enabled: backend });
  const filtrosQuery = useQuery({ ...filtrosQueryOptions(), enabled: backend });

  useQueryErrorToast(
    vendedoresQuery,
    "No se pudo cargar el resumen de vendedores",
    "No fue posible obtener los datos. Intentá nuevamente.",
  );
  useQueryErrorToast(
    filtrosQuery,
    "No se pudieron cargar los filtros",
    "No fue posible obtener los filtros. Intentá nuevamente.",
  );

  const opcionesLocales = useMemo(() => opcionesFiltro(rows), [rows]);
  const opcionesDisponibles = backend ? (filtrosQuery.data ?? OPCIONES_VACIAS) : opcionesLocales;
  const dataLocal = useMemo(() => resumenVendedoresLocal(rows, filtros), [rows, filtros]);
  const data = backend ? (vendedoresQuery.data ?? dataLocal) : dataLocal;
  const hayDatos = backend
    ? Boolean(vendedoresQuery.data?.data.length || vendedoresQuery.data?.dataKpis.length)
    : rows.length > 0;
  const cargando = backend && vendedoresQuery.isPending;
  const errorFiltros = filtrosQuery.isError
    ? mensajeError(filtrosQuery.error, "No fue posible obtener los filtros. Intentá nuevamente.")
    : undefined;

  const setFiltro = (key: keyof Filtros, value: string | undefined) =>
    setFiltrosEdicion((prev) => ({ ...prev, [key]: value }));

  const limpiarFiltros = () => {
    const filtrosRestablecidos = filtroAnioVigente();
    setFiltrosEdicion(filtrosRestablecidos);
    setFiltros(filtrosRestablecidos);
    void navigate({ search: filtrosRestablecidos, replace: true });
  };

  const abrirDetalle = (vendedor: VendedorResumen) => {
    void navigate({
      to: "/vendedores/$vendedor",
      params: { vendedor: vendedor.vendedor },
    });
  };

  const top10 = data.data.slice(0, 10).map((r) => ({
    nombre: r.vendedor,
    valor: r.ventaNeta,
    participacion: r.participacion,
  }));

  const mejorVendedor = data.dataKpis[0];
  const peorVendedor = data.dataKpis[data.dataKpis.length - 1];

  return (
    <div className="min-h-screen bg-background">
      <Toaster position="top-right" />

      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-[1600px] items-center gap-3 px-4 py-5 lg:px-8">
          <span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
            <UserRound className="size-5" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Operación
            </p>
            <h1 className="text-xl font-bold tracking-tight">Vendedores</h1>
            <p className="text-sm text-muted-foreground">
              Rendimiento agregado de la fuerza de ventas según la base de ventas.
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
          mostrarCliente={false}
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
            <TableSkeleton filas={10} columnas={10} />
            <PanelSkeleton />
          </>
        ) : hayDatos ? (
          <>
            <div className="grid gap-4 @md:grid-cols-2">
              <KpiCard
                titulo="Vendedor con más ventas"
                valor={mejorVendedor?.vendedor ?? "—"}
                detalle={
                  mejorVendedor
                    ? `Venta neta: ${fmtGs(mejorVendedor.ventaNeta)}`
                    : "Sin ventas en el período"
                }
                icon={Trophy}
                {...(mejorVendedor ? { onClick: () => abrirDetalle(mejorVendedor) } : {})}
              />
              <KpiCard
                titulo="Vendedor con menos ventas"
                valor={peorVendedor?.vendedor ?? "—"}
                detalle={
                  peorVendedor
                    ? `Venta neta: ${fmtGs(peorVendedor.ventaNeta)}`
                    : "Sin ventas en el período"
                }
                icon={Medal}
                tone="warning"
                {...(peorVendedor ? { onClick: () => abrirDetalle(peorVendedor) } : {})}
              />
            </div>

            <VendedoresTable data={data.data} onSelect={abrirDetalle} />

            <Panel titulo="Top 10 vendedores por venta neta">
              <RankingBarras data={top10} height={360} horizontal={false} />
            </Panel>
          </>
        ) : (
          <div className="rounded-xl border border-border bg-card p-12 text-center shadow-card">
            <h2 className="text-base font-semibold">No hay ventas para mostrar</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              {rows.length === 0 && !backend
                ? "Subí un Excel de ventas con la columna de vendedor y acá vas a ver el resumen de rendimiento de cada uno."
                : "Probá ampliar el rango de fechas o quitar el filtro de vendedor para ver el resumen."}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
