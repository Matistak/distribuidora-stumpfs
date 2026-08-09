import { type ChangeEvent, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ClipboardList, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FiltroSelect } from "@/components/dashboard/FiltroSelect";
import { VentasTable } from "@/components/dashboard/VentasTable";
import { backendConectado, mensajeError, obtenerFiltros } from "@/lib/api";
import type { Filtros, OpcionesFiltro } from "@/lib/types";

export const Route = createFileRoute("/ventas")({
  component: VentasPage,
});

const OPCIONES_VACIAS: OpcionesFiltro = {
  vendedores: [],
  canales: [],
  ciudades: [],
  zonas: [],
};

function VentasPage() {
  const backend = backendConectado();
  const [filtros, setFiltros] = useState<Filtros>({});
  const [opciones, setOpciones] = useState<OpcionesFiltro>(OPCIONES_VACIAS);
  const [errorFiltros, setErrorFiltros] = useState<string>();

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
        {backend ? (
          <>
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
              {errorFiltros ? (
                <p className="mt-3 text-xs text-destructive">{errorFiltros}</p>
              ) : null}
            </section>

            <VentasTable backend filtros={filtros} rows={[]} />
          </>
        ) : (
          <section className="rounded-xl border border-border bg-card p-12 text-center shadow-card">
            <h2 className="text-base font-semibold">Backend no conectado</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
              La vista de ventas necesita el backend local para consultar SQLite de forma paginada.
              Configurá `VITE_API_URL` o iniciá el sidecar para usarla.
            </p>
          </section>
        )}
      </main>
    </div>
  );
}
