import { useRef, useState } from "react";
import { FileSpreadsheet, Loader2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { backendConectado, mensajeError, subirExcel, type UploadResponse } from "@/lib/api";
import { parseExcel } from "@/lib/excel";
import type { VentaRow } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ResumenCargaView, type ResumenCarga } from "./CargaResumen";

export function UploadPanel({
  onDatos,
  onCarga,
  archivo,
  filas,
  className,
}: {
  onDatos?: (rows: VentaRow[], nombre: string) => void;
  onCarga?: (carga: UploadResponse) => void | Promise<void>;
  archivo?: string | undefined;
  filas?: number | undefined;
  className?: string;
}) {
  const [cargando, setCargando] = useState(false);
  const [resumen, setResumen] = useState<ResumenCarga>();
  const inputRef = useRef<HTMLInputElement>(null);

  async function procesar(file: File) {
    setCargando(true);
    setResumen(undefined);
    try {
      if (backendConectado()) {
        const carga = await subirExcel(file);
        // Evita que una respuesta de un backend anterior rompa el resumen.
        const errores = Array.isArray(carga.errores) ? carga.errores : [];
        const estado = carga.estado.trim().toLowerCase();
        const tieneError = ["error", "fallido", "fallida", "rechazado", "rechazada"].some(
          (palabra) => estado.includes(palabra),
        );

        await onCarga?.(carga);
        setResumen({
          correcta: !tieneError,
          filasNuevas: carga.filasNuevas,
          filasReemplazadas: carga.filasReemplazadas ?? 0,
          ...(carga.rango ? { rango: carga.rango } : {}),
          filasErrores: carga.filasErrores,
          sinErrores: !tieneError,
          errores,
          ...(carga.erroresTruncados ? { erroresTruncados: true } : {}),
          ...(tieneError ? { detalleError: `Estado recibido: ${carga.estado}` } : {}),
        });
        if (tieneError) {
          toast.error("La carga terminó con errores", {
            description: `${carga.filasErrores.toLocaleString("es-PY")} filas no válidas`,
          });
        } else {
          toast.success(`${carga.filasNuevas.toLocaleString("es-PY")} filas nuevas procesadas`);
        }
        return;
      }

      const rows = await parseExcel(file);
      if (!rows.length) throw new Error("El archivo no contiene filas");
      onDatos?.(rows, file.name);
      setResumen({
        correcta: true,
        filasNuevas: rows.length,
        filasReemplazadas: 0,
        filasErrores: 0,
        sinErrores: true,
        errores: [],
      });
      toast.success(`${rows.length.toLocaleString("es-PY")} filas procesadas`);
    } catch (e) {
      const detalleError = mensajeError(
        e,
        "No se pudo procesar el archivo. Revisá que sea un Excel válido e intentá nuevamente.",
      );
      setResumen({
        correcta: false,
        filasNuevas: 0,
        filasReemplazadas: 0,
        filasErrores: 0,
        sinErrores: false,
        errores: [],
        detalleError,
      });
      toast.error("No se pudo leer el Excel", { description: detalleError });
    } finally {
      setCargando(false);
    }
  }

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (file) void procesar(file);
      }}
      className={cn(
        "self-start rounded-xl border border-dashed border-border bg-card p-4 text-center shadow-card",
        className,
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void procesar(file);
        }}
      />
      <div className="flex flex-col items-center gap-2">
        <span className="grid size-10 place-items-center rounded-full bg-primary/10 text-primary">
          {cargando ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <UploadCloud className="size-5" />
          )}
        </span>
        <p className="text-sm font-semibold">Cargar Excel de ventas</p>
        <p className="text-xs text-muted-foreground">
          Arrastrá y soltá tu archivo .xlsx o .xls aquí
        </p>
        <Button size="sm" disabled={cargando} onClick={() => inputRef.current?.click()}>
          {cargando ? "Procesando…" : "Seleccionar archivo"}
        </Button>
        {archivo ? (
          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <FileSpreadsheet className="size-3.5 text-success" />
            {archivo} · {filas?.toLocaleString("es-PY")} filas
          </p>
        ) : null}
        {resumen ? <ResumenCargaView resumen={resumen} /> : null}
      </div>
    </div>
  );
}
