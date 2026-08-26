import { useState } from "react";
import { AlertCircle, CheckCircle2, ChevronDown } from "lucide-react";
import type { UploadFilaOmitida, UploadResponse } from "@/lib/api";
import type { VentaRow } from "@/lib/types";
import { fmtFecha } from "@/lib/metrics";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type ResumenCarga = {
  correcta: boolean;
  filasNuevas: number;
  filasOmitidas: number;
  filasErrores: number;
  sinErrores: boolean;
  errores: UploadResponse["errores"];
  /** Detalle de las filas omitidas con la fila que ocasionó cada omisión. */
  omitidas?: UploadFilaOmitida[];
  /** true cuando el detalle de omisiones vino cortado desde el servidor. */
  omitidasTruncadas?: boolean;
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

      {resumen.omitidas && resumen.omitidas.length > 0 ? (
        <FilasOmitidas
          omitidas={resumen.omitidas}
          total={resumen.filasOmitidas}
          truncado={resumen.omitidasTruncadas === true}
        />
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

/** Todas las columnas de una fila de venta, con el título tal como viene del origen. */
const COLUMNAS_VENTA: { clave: keyof VentaRow; titulo: string }[] = [
  { clave: "codCompania", titulo: "cod compania" },
  { clave: "compania", titulo: "compania" },
  { clave: "codDistribuidora", titulo: "cod distribuidora" },
  { clave: "distribuidora", titulo: "distribuidora" },
  { clave: "codCliente", titulo: "cod cliente" },
  { clave: "razonSocial", titulo: "razon social" },
  { clave: "codProducto", titulo: "cod producto" },
  { clave: "producto", titulo: "producto" },
  { clave: "codMarca", titulo: "cod marca" },
  { clave: "marca", titulo: "marca" },
  { clave: "fecha", titulo: "fecha" },
  { clave: "anhoMes", titulo: "anho mes" },
  { clave: "anho", titulo: "anho" },
  { clave: "mes", titulo: "mes" },
  { clave: "dia", titulo: "dia" },
  { clave: "vtaUnit", titulo: "vta unit" },
  { clave: "montoIvaBrutaGua", titulo: "monto iva bruta gua" },
  { clave: "costoVtaGua", titulo: "costo vta gua" },
  { clave: "montoVtaNetaGua", titulo: "monto vta neta gua" },
  { clave: "codCanal", titulo: "cod canal" },
  { clave: "canal", titulo: "canal" },
  { clave: "codRamo", titulo: "cod ramo" },
  { clave: "ramo", titulo: "ramo" },
  { clave: "codVendedor", titulo: "cod vendedor" },
  { clave: "vendedor", titulo: "vendedor" },
  { clave: "tipoDoc", titulo: "tipo doc" },
  { clave: "nroDoc", titulo: "nro doc" },
  { clave: "nroComprobante", titulo: "nro comprobante" },
  { clave: "codZona", titulo: "cod zona" },
  { clave: "zona", titulo: "zona" },
  { clave: "codTipoProducto", titulo: "cod tipo producto" },
  { clave: "tipoProducto", titulo: "tipo producto" },
  { clave: "precioConIva", titulo: "precio con iva" },
  { clave: "precioSinIva", titulo: "precio sin iva" },
  { clave: "porcDescuento", titulo: "porc descuento" },
  { clave: "precioLista", titulo: "precio lista" },
  { clave: "iva", titulo: "iva" },
  { clave: "ciudad", titulo: "ciudad" },
  { clave: "ruc", titulo: "ruc" },
  { clave: "latitud", titulo: "latitud" },
  { clave: "longitud", titulo: "longitud" },
];

function valorCelda(fila: VentaRow, clave: keyof VentaRow): string {
  const valor = fila[clave];
  if (valor === null || valor === undefined || valor === "") return "—";
  if (clave === "fecha") return fmtFecha(String(valor));
  if (typeof valor === "number") {
    return Number.isInteger(valor)
      ? valor.toLocaleString("es-PY")
      : valor.toLocaleString("es-PY", { maximumFractionDigits: 2 });
  }
  return String(valor);
}

/** Cuántas omisiones se muestran por vez; el resto entra con "Mostrar más". */
const PASO_OMITIDAS = 20;

/**
 * Listado de filas omitidas: para cada una muestra la fila ya registrada que
 * ocasionó la omisión (arriba) y la fila descartada (abajo), ambas con todas
 * sus columnas. El contenido sólo se monta al abrir el listado.
 */
function FilasOmitidas({
  omitidas,
  total,
  truncado,
}: {
  omitidas: UploadFilaOmitida[];
  total: number;
  truncado: boolean;
}) {
  const [abierto, setAbierto] = useState(false);
  const [visibles, setVisibles] = useState(PASO_OMITIDAS);
  const mostradas = omitidas.slice(0, visibles);

  return (
    <div className="mt-3 rounded-lg border border-border bg-background/60">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs font-semibold text-warning-foreground"
      >
        <span>Ver filas omitidas ({total.toLocaleString("es-PY")})</span>
        <ChevronDown
          className={cn("size-4 shrink-0 transition-transform", abierto && "rotate-180")}
        />
      </button>

      {!abierto ? null : (
        <div className="space-y-3 border-t border-border px-3 py-3">
          {truncado || total > omitidas.length ? (
            <p className="rounded-md bg-warning/10 px-2 py-1.5 text-[11px] text-warning-foreground">
              Se muestran las primeras {omitidas.length.toLocaleString("es-PY")} de{" "}
              {total.toLocaleString("es-PY")} filas omitidas.
            </p>
          ) : null}

          {mostradas.map((omision) => (
            <ParOmitido
              key={`${omision.fila}-${omision.nueva.nroDoc}-${omision.nueva.codProducto}`}
              omision={omision}
            />
          ))}

          {visibles < omitidas.length ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setVisibles((v) => v + PASO_OMITIDAS)}
            >
              Mostrar más (
              {Math.min(PASO_OMITIDAS, omitidas.length - visibles).toLocaleString("es-PY")})
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
}

/** Un par de filas comparadas: la que ocasionó la omisión arriba, la omitida abajo. */
function ParOmitido({ omision }: { omision: UploadFilaOmitida }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <p className="border-b border-border bg-muted/40 px-3 py-1.5 text-[11px]">
        <span className="font-semibold">Fila {omision.fila}</span>
        <span className="text-muted-foreground">
          {omision.filaExistente === null
            ? ""
            : ` (idéntica a la fila ${omision.filaExistente})`}
          {" · "}
          {omision.motivo}
        </span>
      </p>
      <div className="table-scroll">
        <Table className="min-w-max text-xs">
          <TableHeader>
            <TableRow className="border-border/80 bg-muted/35 hover:bg-muted/35">
              <TableHead className="sticky left-0 z-10 min-w-28 bg-card py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                Origen
              </TableHead>
              {COLUMNAS_VENTA.map(({ clave, titulo }) => (
                <TableHead
                  key={clave}
                  className="whitespace-nowrap py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground"
                >
                  {titulo}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Primero la fila que ocasionó la omisión; debajo, la fila omitida. */}
            <TableRow className="border-border/70 bg-warning/[0.06] hover:bg-warning/10">
              <TableCell className="sticky left-0 z-10 bg-background py-2 align-middle">
                <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-warning-foreground">
                  <span className="size-1.5 shrink-0 rounded-full bg-warning" />
                  {omision.filaExistente === null
                    ? "Ocasionó la omisión (carga previa)"
                    : `Ocasionó la omisión · Fila ${omision.filaExistente}`}
                </span>
              </TableCell>
              {omision.existente ? (
                COLUMNAS_VENTA.map(({ clave }) => (
                  <TableCell key={clave} className="whitespace-nowrap py-2 tabular-nums">
                    {valorCelda(omision.existente!, clave)}
                  </TableCell>
                ))
              ) : (
                <TableCell colSpan={COLUMNAS_VENTA.length} className="py-2 text-muted-foreground">
                  No se pudo recuperar la fila existente.
                </TableCell>
              )}
            </TableRow>
            <TableRow className="border-border/70 bg-destructive/[0.05] hover:bg-destructive/10">
              <TableCell className="sticky left-0 z-10 bg-background py-2 align-middle">
                <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-destructive">
                  <span className="size-1.5 shrink-0 rounded-full bg-destructive" />
                  Fila omitida · Fila {omision.fila}
                </span>
              </TableCell>
              {COLUMNAS_VENTA.map(({ clave }) => (
                <TableCell key={clave} className="whitespace-nowrap py-2 tabular-nums">
                  {valorCelda(omision.nueva, clave)}
                </TableCell>
              ))}
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
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
