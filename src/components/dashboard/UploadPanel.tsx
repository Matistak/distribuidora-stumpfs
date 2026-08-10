import { useRef, useState } from "react";
import { AlertCircle, CheckCircle2, FileSpreadsheet, Loader2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { backendConectado, mensajeError, subirExcel, type UploadResponse } from "@/lib/api";
import { parseExcel } from "@/lib/excel";
import type { VentaRow } from "@/lib/types";
import { cn } from "@/lib/utils";

type ResumenCarga = {
  correcta: boolean;
  filasNuevas: number;
  filasOmitidas: number;
  filasErrores: number;
  sinErrores: boolean;
  errores: UploadResponse["errores"];
  detalleError?: string;
};

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
        const estado = carga.estado.trim().toLowerCase();
        const tieneError = ["error", "fallido", "fallida", "rechazado", "rechazada"].some(
          (palabra) => estado.includes(palabra),
        );

        await onCarga?.(carga);
        setResumen({
          correcta: !tieneError,
          filasNuevas: carga.filasNuevas,
          filasOmitidas: carga.filasOmitidas,
          filasErrores: carga.filasErrores,
          sinErrores: !tieneError,
          errores: carga.errores,
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
        filasOmitidas: 0,
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
        filasOmitidas: 0,
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

function ResumenCargaView({ resumen }: { resumen: ResumenCarga }) {
  return (
    <section
      className={cn(
        "mt-4 w-full max-w-xl rounded-xl border p-4 text-left",
        resumen.correcta
          ? "border-success/30 bg-success/5"
          : "border-destructive/30 bg-destructive/5",
      )}
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        {resumen.correcta ? (
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" />
        ) : (
          <AlertCircle className="mt-0.5 size-5 shrink-0 text-destructive" />
        )}
        <div>
          <h3 className="text-sm font-semibold">
            {resumen.correcta ? "Carga correcta" : "La carga tuvo errores"}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {resumen.correcta
              ? "El archivo fue procesado y ya está disponible en el tablero."
              : resumen.errores.length > 0
                ? "El archivo fue procesado, pero algunas filas no se pudieron importar."
                : "El archivo no pudo procesarse correctamente."}
          </p>
        </div>
      </div>

      <dl className="mt-4 grid gap-2 sm:grid-cols-2">
        <ResumenDato
          label="Carga correcta"
          value={resumen.correcta ? "Sí" : "No"}
          positivo={resumen.correcta}
        />
        <ResumenDato
          label="Filas nuevas"
          value={resumen.filasNuevas.toLocaleString("es-PY")}
          positivo={undefined}
        />
        <ResumenDato
          label="Sin errores"
          value={resumen.sinErrores ? "Sí" : "No"}
          positivo={resumen.sinErrores}
        />
        <ResumenDato
          label="Filas omitidas"
          value={resumen.filasOmitidas.toLocaleString("es-PY")}
          positivo={undefined}
        />
        <ResumenDato
          label="Filas con errores"
          value={resumen.filasErrores.toLocaleString("es-PY")}
          positivo={resumen.filasErrores === 0}
        />
      </dl>

      {resumen.errores.length > 0 ? (
        <details className="mt-3 rounded-lg border border-destructive/20 bg-background/60" open>
          <summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-destructive">
            Ver filas con errores ({resumen.errores.length.toLocaleString("es-PY")})
          </summary>
          <ul className="max-h-64 space-y-1 overflow-y-auto border-t border-destructive/10 px-3 py-2 text-xs">
            {resumen.errores.map((error) => (
              <li key={error.fila} className="flex gap-2">
                <span className="shrink-0 font-semibold">Fila {error.fila}:</span>
                <span className="text-muted-foreground">{error.motivo}</span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      {resumen.detalleError ? (
        <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {resumen.detalleError}
        </p>
      ) : null}
    </section>
  );
}

function ResumenDato({
  label,
  value,
  positivo,
}: {
  label: string;
  value: string;
  positivo: boolean | undefined;
}) {
  return (
    <div className="rounded-lg border border-border/70 bg-background/70 px-3 py-2">
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "mt-0.5 text-sm font-semibold",
          positivo === true && "text-success",
          positivo === false && "text-destructive",
        )}
      >
        {value}
      </dd>
    </div>
  );
}
