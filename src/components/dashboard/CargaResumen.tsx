import { AlertCircle, CheckCircle2 } from "lucide-react";
import type { UploadResponse } from "@/lib/api";
import { cn } from "@/lib/utils";

export type ResumenCarga = {
  correcta: boolean;
  filasNuevas: number;
  filasOmitidas: number;
  filasErrores: number;
  sinErrores: boolean;
  errores: UploadResponse["errores"];
  /** Segundos que tardó la carga, si se midieron. */
  duracionSegundos?: number;
  detalleError?: string;
  aviso?: string;
};

export function ResumenCargaView({ resumen }: { resumen: ResumenCarga }) {
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
        {resumen.duracionSegundos === undefined ? null : (
          <ResumenDato
            label="Tiempo total"
            value={formatoDuracion(resumen.duracionSegundos)}
            positivo={undefined}
          />
        )}
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

      {resumen.aviso ? (
        <p className="mt-3 rounded-lg bg-warning/10 px-3 py-2 text-xs text-warning-foreground">
          {resumen.aviso}
        </p>
      ) : null}

      {resumen.detalleError ? (
        <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {resumen.detalleError}
        </p>
      ) : null}
    </section>
  );
}

/** `12 s`, `2 min 05 s` o `1 h 04 min`. */
export function formatoDuracion(segundos: number) {
  const total = Math.max(0, Math.round(segundos));
  if (total < 60) return `${total} s`;
  const minutos = Math.floor(total / 60);
  if (minutos < 60) return `${minutos} min ${`${total % 60}`.padStart(2, "0")} s`;
  return `${Math.floor(minutos / 60)} h ${`${minutos % 60}`.padStart(2, "0")} min`;
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
