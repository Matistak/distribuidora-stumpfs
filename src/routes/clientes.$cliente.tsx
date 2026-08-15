import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { ClienteDetalle } from "@/components/dashboard/ClienteDetalle";
import { TableSkeleton } from "@/components/dashboard/Loaders";
import { backendConectado, mensajeError } from "@/lib/api";
import { filtroAnioVigente } from "@/lib/filtros";
import { opcionesFiltro, resumenClientesLocal } from "@/lib/metrics";
import {
  clientesResumenQueryOptions,
  filtrosQueryOptions,
  useQueryErrorToast,
} from "@/lib/queries";
import type { Filtros, OpcionesFiltro } from "@/lib/types";
import { useUploadState } from "@/lib/use-upload-state";

export const Route = createFileRoute("/clientes/$cliente")({
  component: ClienteDetallePage,
});

const OPCIONES_VACIAS: OpcionesFiltro = {
  clientes: [],
  vendedores: [],
  canales: [],
  ciudades: [],
  zonas: [],
  tiposDoc: [],
};

function ClienteDetallePage() {
  const backend = backendConectado();
  const { rows } = useUploadState();
  const navigate = useNavigate({ from: Route.fullPath });
  const { cliente: nombreCliente } = Route.useParams();
  const [filtros, setFiltros] = useState<Filtros>(filtroAnioVigente);
  const [filtrosEdicion, setFiltrosEdicion] = useState<Filtros>(filtroAnioVigente);
  const filtrosCliente = useMemo(
    () => ({ ...filtros, cliente: nombreCliente }),
    [filtros, nombreCliente],
  );

  const clientesQuery = useQuery({
    ...clientesResumenQueryOptions(filtrosCliente),
    enabled: backend,
  });
  const filtrosQuery = useQuery({ ...filtrosQueryOptions(), enabled: backend });

  useQueryErrorToast(
    clientesQuery,
    "No se pudo cargar el detalle del cliente",
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
    () => resumenClientesLocal(rows, filtrosCliente),
    [rows, filtrosCliente],
  );
  const data = backend ? (clientesQuery.data ?? dataLocal) : dataLocal;
  const cliente = data.data.find((item) => item.cliente === nombreCliente);
  const cargando = backend && clientesQuery.isPending;
  const error = clientesQuery.isError
    ? mensajeError(clientesQuery.error, "No fue posible obtener los datos. Intentá nuevamente.")
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
          <TableSkeleton filas={8} columnas={10} />
        </main>
      ) : cliente ? (
        <ClienteDetalle
          cliente={cliente}
          filtros={filtros}
          filtrosEdicion={filtrosEdicion}
          opciones={opciones}
          backend={backend}
          rows={rows}
          errorFiltros={errorFiltros}
          onFilterChange={setFiltro}
          onApplyFilters={() => setFiltros(filtrosEdicion)}
          onResetFilters={limpiarFiltros}
          onBack={() => void navigate({ to: "/clientes" })}
        />
      ) : (
        <main className="mx-auto max-w-[1600px] px-4 py-8 lg:px-8">
          <div className="rounded-xl border border-border bg-card p-12 text-center shadow-card">
            <h1 className="text-base font-semibold">Cliente no encontrado</h1>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              {error ?? "No hay compras para el cliente y los filtros seleccionados."}
            </p>
            <button
              type="button"
              onClick={() => void navigate({ to: "/clientes" })}
              className="mt-5 inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Volver a clientes
            </button>
          </div>
        </main>
      )}
    </div>
  );
}
