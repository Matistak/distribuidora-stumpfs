import { useRef, useState } from "react";
import { FileSpreadsheet, Loader2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { backendConectado, subirExcel, type UploadResponse } from "@/lib/api";
import { parseExcel } from "@/lib/excel";
import type { VentaRow } from "@/lib/types";

export function UploadPanel({
  onDatos,
  onCarga,
  archivo,
  filas,
}: {
  onDatos?: (rows: VentaRow[], nombre: string) => void;
  onCarga?: (carga: UploadResponse) => void | Promise<void>;
  archivo?: string | undefined;
  filas?: number | undefined;
}) {
  const [cargando, setCargando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function procesar(file: File) {
    setCargando(true);
    try {
      if (backendConectado()) {
        const carga = await subirExcel(file);
        await onCarga?.(carga);
        toast.success(`${carga.filasNuevas.toLocaleString("es-PY")} filas nuevas procesadas`);
        return;
      }

      const rows = await parseExcel(file);
      if (!rows.length) throw new Error("El archivo no contiene filas");
      onDatos?.(rows, file.name);
      toast.success(`${rows.length.toLocaleString("es-PY")} filas procesadas`);
    } catch (e) {
      toast.error("No se pudo leer el Excel", { description: (e as Error).message });
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
      className="self-start rounded-xl border border-dashed border-border bg-card p-4 text-center shadow-card"
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
        <p className="text-xs text-muted-foreground">Arrastrá el archivo .xlsx o elegilo</p>
        <Button size="sm" disabled={cargando} onClick={() => inputRef.current?.click()}>
          {cargando ? "Procesando…" : "Seleccionar archivo"}
        </Button>
        {archivo ? (
          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <FileSpreadsheet className="size-3.5 text-success" />
            {archivo} · {filas?.toLocaleString("es-PY")} filas
          </p>
        ) : null}
      </div>
    </div>
  );
}
