import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList } from "lucide-react";
import { FiltrosPanel } from "@/components/dashboard/FiltrosPanel";
import { VentasTable } from "@/components/dashboard/VentasTable";
import { backendConectado, mensajeError } from "@/lib/api";
import { filtrosQueryOptions } from "@/lib/queries";
import { filtroAnioVigente } from "@/lib/filtros";
import { opcionesFiltro } from "@/lib/metrics";
import type { Filtros, OpcionesFiltro } from "@/lib/types";
import { useUploadState } from "@/lib/use-upload-state";

export const Route = createFileRoute("/ventas")({
  component: VentasPage,
});

const OPCIONES_VACIAS: OpcionesFiltro = {
  clientes: [],
  vendedores: [],
  canales: [],
  ciudades: [],
  zonas: [],
};

function VentasPage() {
  const backend = backendConectado();
  const { rows } = useUploadState();
  const [filtros, setFiltros] = useState<Filtros>(filtroAnioVigente);
  const [filtrosEdicion, setFiltrosEdicion] = useState<Filtros>(filtroAnioVigente);

  const filtrosQuery = useQuery({ ...filtrosQueryOptions(), enabled: backend });

  const opcionesLocales = useMemo(() => opcionesFiltro(rows), [rows]);
  const opcionesDisponibles = backend ? (filtrosQuery.data ?? OPCIONES_VACIAS) : opcionesLocales;
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
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-[1600px] items-center gap-3 px-4 py-5 lg:px-8">
          <span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
            <ClipboardList className="size-5" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Operación
            </p>
            <h1 className="text-xl font-bold tracking-tight">Ventas</h1>
            <p className="text-sm text-muted-foreground">
              Consultá el detalle de ventas sin cargar toda la base en el navegador.
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] space-y-4 px-4 py-5 lg:px-8">
        <FiltrosPanel
          filtros={filtros}
          filtrosEdicion={filtrosEdicion}
          opciones={opcionesDisponibles}
          backend={backend}
          error={errorFiltros}
          onChange={setFiltro}
          onApply={() => setFiltros(filtrosEdicion)}
          onReset={limpiarFiltros}
        />

        <VentasTable backend={backend} filtros={filtros} rows={rows} />
      </main>
    </div>
  );
}
