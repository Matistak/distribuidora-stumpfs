import { createFileRoute } from "@tanstack/react-router";
import { FileSpreadsheet } from "lucide-react";

import { UploadPanel } from "@/components/dashboard/UploadPanel";
import { useUploadState } from "@/lib/use-upload-state";
import { backendConectado } from "@/lib/api";

export const Route = createFileRoute("/carga")({
  component: CargaPage,
});

function CargaPage() {
  const backend = backendConectado();
  const { archivo, filasCargadas, registrarDatos, registrarCarga } = useUploadState();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-[1600px] items-center gap-3 px-4 py-5 lg:px-8">
          <span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
            <FileSpreadsheet className="size-5" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Importación
            </p>
            <h1 className="text-xl font-bold tracking-tight">Cargar Excel</h1>
            <p className="text-sm text-muted-foreground">
              Incorporá un archivo de ventas para actualizar el tablero comercial.
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 lg:px-8">
        <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
          <div className="border-b border-border px-6 py-5 sm:px-8">
            <h2 className="text-base font-semibold">Nueva carga de datos</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Arrastrá tu Excel a la zona indicada o seleccioná el archivo desde tu equipo.
            </p>
          </div>

          <div className="p-6 sm:p-8">
            <UploadPanel
              className="flex min-h-72 items-center justify-center p-8"
              {...(backend ? {} : { onDatos: registrarDatos })}
              onCarga={registrarCarga}
              archivo={archivo}
              filas={filasCargadas}
            />
          </div>
        </section>
      </main>
    </div>
  );
}
