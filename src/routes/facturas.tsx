import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FileText } from "lucide-react";

import { ComprobanteDetalleView } from "@/components/dashboard/ComprobanteDetalleView";
import { ComprobantesTable } from "@/components/dashboard/ComprobantesTable";
import { FiltrosPanel } from "@/components/dashboard/FiltrosPanel";
import { backendConectado, mensajeError } from "@/lib/api";
import { obtenerComprobanteLocal } from "@/lib/comprobantes";
import { filtroAnioVigente } from "@/lib/filtros";
import { comprobanteDetalleQueryOptions, filtrosQueryOptions } from "@/lib/queries";
import { opcionesFiltro } from "@/lib/metrics";
import type { ComprobanteResumen, Filtros, OpcionesFiltro } from "@/lib/types";
import { useUploadState } from "@/lib/use-upload-state";

export const Route = createFileRoute("/facturas")({
  component: FacturasPage,
});

const OPCIONES_VACIAS: OpcionesFiltro = {
  clientes: [],
  vendedores: [],
  canales: [],
  ciudades: [],
  zonas: [],
  tiposDoc: [],
};

function FacturasPage() {
  const backend = backendConectado();
  const { rows } = useUploadState();
  const [filtros, setFiltros] = useState<Filtros>(filtroAnioVigente);
  const [filtrosEdicion, setFiltrosEdicion] = useState<Filtros>(filtroAnioVigente);
  const [seleccionado, setSeleccionado] = useState<ComprobanteResumen | null>(null);

  const filtrosQuery = useQuery({ ...filtrosQueryOptions(), enabled: backend });
  const detalleQuery = useQuery({
    ...comprobanteDetalleQueryOptions(seleccionado?.nroDoc ?? null),
    enabled: backend && seleccionado !== null,
  });
  const opcionesLocales = useMemo(() => opcionesFiltro(rows), [rows]);
  const opcionesDisponibles = backend ? (filtrosQuery.data ?? OPCIONES_VACIAS) : opcionesLocales;
  const detalleLocal = useMemo(
    () => (seleccionado ? obtenerComprobanteLocal(rows, seleccionado.nroDoc) : null),
    [rows, seleccionado],
  );
  const errorFiltros = filtrosQuery.isError
    ? mensajeError(filtrosQuery.error, "No fue posible obtener los filtros. Intentá nuevamente.")
    : undefined;
  const errorDetalle = detalleQuery.isError
    ? mensajeError(detalleQuery.error, "No fue posible obtener el detalle del comprobante.")
    : undefined;

  const setFiltro = (key: keyof Filtros, value: string | undefined) =>
    setFiltrosEdicion((prev) => ({ ...prev, [key]: value }));

  const limpiarFiltros = () => {
    const filtrosRestablecidos = filtroAnioVigente();
    setFiltrosEdicion(filtrosRestablecidos);
    setFiltros(filtrosRestablecidos);
  };

  if (seleccionado) {
    return (
      <div className="min-h-screen bg-background">
        <ComprobanteDetalleView
          detalle={backend ? (detalleQuery.data ?? null) : detalleLocal}
          cargando={backend && detalleQuery.isFetching}
          error={errorDetalle}
          onBack={() => setSeleccionado(null)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-[1600px] items-center gap-3 px-4 py-5 lg:px-8">
          <span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
            <FileText className="size-5" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Operación
            </p>
            <h1 className="text-xl font-bold tracking-tight">Facturas</h1>
            <p className="text-sm text-muted-foreground">
              Consultá cada comprobante y el detalle de sus productos.
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
          mostrarTipoDoc
          error={errorFiltros}
          onChange={setFiltro}
          onApply={() => setFiltros(filtrosEdicion)}
          onReset={limpiarFiltros}
        />
        <ComprobantesTable
          backend={backend}
          filtros={filtros}
          rows={rows}
          onSelect={setSeleccionado}
        />
      </main>
    </div>
  );
}
