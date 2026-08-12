import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { VendedorDetalle } from "@/components/dashboard/VendedorDetalle";
import { TableSkeleton } from "@/components/dashboard/Loaders";
import { backendConectado, mensajeError } from "@/lib/api";
import { filtroAnioVigente } from "@/lib/filtros";
import { opcionesFiltro, resumenVendedoresLocal } from "@/lib/metrics";
import { filtrosQueryOptions, useQueryErrorToast, vendedoresQueryOptions } from "@/lib/queries";
import type { Filtros, OpcionesFiltro } from "@/lib/types";
import { useUploadState } from "@/lib/use-upload-state";

export const Route = createFileRoute("/vendedores/$vendedor")({
  component: VendedorDetallePage,
});

const OPCIONES_VACIAS: OpcionesFiltro = {
  clientes: [],
  vendedores: [],
  canales: [],
  ciudades: [],
  zonas: [],
};

function VendedorDetallePage() {
  const backend = backendConectado();
  const { rows } = useUploadState();
  const navigate = useNavigate({ from: Route.fullPath });
  const { vendedor: nombreVendedor } = Route.useParams();
  const [filtros, setFiltros] = useState<Filtros>(filtroAnioVigente);
  const [filtrosEdicion, setFiltrosEdicion] = useState<Filtros>(filtroAnioVigente);
  const filtrosVendedor = useMemo(() => ({ vendedor: nombreVendedor }), [nombreVendedor]);
  const vendedoresQuery = useQuery({
    ...vendedoresQueryOptions(filtrosVendedor),
    enabled: backend,
  });
  const filtrosQuery = useQuery({ ...filtrosQueryOptions(), enabled: backend });

  useQueryErrorToast(
    vendedoresQuery,
    "No se pudo cargar el resumen del vendedor",
    "No fue posible obtener los datos. Intentá nuevamente.",
  );
  useQueryErrorToast(
    filtrosQuery,
    "No se pudieron cargar los filtros",
    "No fue posible obtener los filtros. Intentá nuevamente.",
  );

  const opcionesLocales = useMemo(() => opcionesFiltro(rows), [rows]);
  const opciones = backend ? (filtrosQuery.data ?? OPCIONES_VACIAS) : opcionesLocales;
  const dataLocal = useMemo(
    () => resumenVendedoresLocal(rows, filtrosVendedor),
    [rows, filtrosVendedor],
  );
  const data = backend ? (vendedoresQuery.data ?? dataLocal) : dataLocal;
  const vendedor = data.data.find((item) => item.vendedor === nombreVendedor);
  const cargando = backend && vendedoresQuery.isPending;
  const error = vendedoresQuery.isError
    ? mensajeError(vendedoresQuery.error, "No fue posible obtener los datos. Intentá nuevamente.")
    : undefined;
  const errorFiltros = filtrosQuery.isError
    ? mensajeError(filtrosQuery.error, "No fue posible obtener los filtros. Intentá nuevamente.")
    : undefined;
  const setFiltro = (key: keyof Filtros, value: string | undefined) =>
    setFiltrosEdicion((prev) => ({ ...prev, [key]: value }));
  const limpiarFiltros = () => {
    const filtrosRestablecidos = filtroAnioVigente();
    setFiltrosEdicion(filtrosRestablecidos);
    setFiltros(filtrosRestablecidos);
  };

  return (
    <div className="min-h-screen bg-background">
      <Toaster position="top-right" />
      {cargando ? (
        <main className="mx-auto max-w-[1600px] space-y-4 px-4 py-5 lg:px-8">
          <TableSkeleton filas={8} columnas={9} />
        </main>
      ) : vendedor ? (
        <VendedorDetalle
          vendedor={vendedor}
          filtros={filtros}
          filtrosEdicion={filtrosEdicion}
          opciones={opciones}
          backend={backend}
          rows={rows}
          errorFiltros={errorFiltros}
          onFilterChange={setFiltro}
          onApplyFilters={() => setFiltros(filtrosEdicion)}
          onResetFilters={limpiarFiltros}
          onBack={() => void navigate({ to: "/vendedores" })}
        />
      ) : (
        <main className="mx-auto max-w-[1600px] px-4 py-8 lg:px-8">
          <div className="rounded-xl border border-border bg-card p-12 text-center shadow-card">
            <h1 className="text-base font-semibold">Vendedor no encontrado</h1>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              {error ?? "No hay ventas para el vendedor y los filtros seleccionados."}
            </p>
            <button
              type="button"
              onClick={() => void navigate({ to: "/vendedores" })}
              className="mt-5 inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Volver a vendedores
            </button>
          </div>
        </main>
      )}
    </div>
  );
}
