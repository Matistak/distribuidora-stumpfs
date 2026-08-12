import { type ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ClipboardList, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FiltroCliente } from "@/components/dashboard/FiltroCliente";
import { FiltroSelect } from "@/components/dashboard/FiltroSelect";
import { VentasTable } from "@/components/dashboard/VentasTable";
import { backendConectado, buscarClientes, mensajeError, obtenerFiltros } from "@/lib/api";
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
  const [filtros, setFiltros] = useState<Filtros>({});
  const [opciones, setOpciones] = useState<OpcionesFiltro>(OPCIONES_VACIAS);
  const [errorFiltros, setErrorFiltros] = useState<string>();
  const opcionesLocales = useMemo(() => opcionesFiltro(rows), [rows]);
  const opcionesDisponibles = backend ? opciones : opcionesLocales;

  const buscarCliente = useCallback(
    (q: string) =>
      backend
        ? buscarClientes(q)
        : Promise.resolve(
            opcionesLocales.clientes
              .filter((c) => c.toLowerCase().includes(q.toLowerCase()))
              .slice(0, 50),
          ),
    [backend, opcionesLocales],
  );

  useEffect(() => {
    if (!backend) return;

    let activo = true;
    obtenerFiltros()
      .then((data) => {
        if (activo) setOpciones(data);
      })
      .catch((cause: unknown) => {
        if (activo) {
          setErrorFiltros(
            mensajeError(cause, "No fue posible obtener los filtros. Intentá nuevamente."),
          );
        }
      });

    return () => {
      activo = false;
    };
  }, [backend]);

  const setFiltro = (key: keyof Filtros) => (valor: string | undefined) =>
    setFiltros((prev) => ({ ...prev, [key]: valor }));

  const setFecha = (key: "desde" | "hasta") => (event: ChangeEvent<HTMLInputElement>) =>
    setFiltros((prev) => ({ ...prev, [key]: event.target.value || undefined }));

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
        <section className="rounded-xl border border-border bg-card p-4 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">Filtros de consulta</h2>
              <p className="text-xs text-muted-foreground">
                Refiná los registros antes de recorrer las páginas.
              </p>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => setFiltros({})}>
              <RotateCcw />
              Limpiar filtros
            </Button>
          </div>

          <div className="mt-4 flex flex-wrap items-end gap-2">
            <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
              Desde
              <Input
                type="date"
                value={filtros.desde ?? ""}
                onChange={setFecha("desde")}
                className="h-9 w-[150px] text-xs"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
              Hasta
              <Input
                type="date"
                value={filtros.hasta ?? ""}
                onChange={setFecha("hasta")}
                className="h-9 w-[150px] text-xs"
              />
            </label>
            <FiltroCliente
              placeholder="Todos los clientes"
              valor={filtros.cliente}
              buscar={buscarCliente}
              onChange={setFiltro("cliente")}
            />
            <FiltroSelect
              placeholder="Todos los vendedores"
              valor={filtros.vendedor}
              opciones={opcionesDisponibles.vendedores}
              onChange={setFiltro("vendedor")}
            />
          </div>
          {errorFiltros ? <p className="mt-3 text-xs text-destructive">{errorFiltros}</p> : null}
        </section>

        <VentasTable backend={backend} filtros={filtros} rows={rows} />
      </main>
    </div>
  );
}
