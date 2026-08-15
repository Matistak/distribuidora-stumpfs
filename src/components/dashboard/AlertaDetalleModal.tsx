import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { fmtGs, fmtNum } from "@/lib/metrics";
import { detalleAlertaQueryOptions } from "@/lib/queries";
import type { Alerta, ColumnaDetalle, FilaDetalle, Filtros } from "@/lib/types";

/** Filas por página del listado. */
const TAMANHO_PAGINA = 10;

/** Columnas cuyo signo importa: se pintan verde/rojo segun el valor. */
const CON_SIGNO = new Set(["diferencia", "variacion"]);

function formatear(columna: ColumnaDetalle, valor: string | number | null): string {
  if (valor === null || valor === "") return "—";
  switch (columna.tipo) {
    case "moneda":
      return fmtGs(Number(valor));
    case "numero":
      return fmtNum(Number(valor));
    case "porcentaje": {
      const n = Number(valor);
      return `${n > 0 ? "+" : ""}${n.toFixed(1)}%`;
    }
    default:
      return String(valor);
  }
}

const esNumerica = (columna: ColumnaDetalle) =>
  columna.tipo === "moneda" || columna.tipo === "numero" || columna.tipo === "porcentaje";

export function AlertaDetalleModal({
  alerta,
  filtros,
  onOpenChange,
}: {
  /** Alerta abierta; null cierra el modal. */
  alerta: Alerta | null;
  filtros: Filtros;
  onOpenChange: (abierto: boolean) => void;
}) {
  const [busqueda, setBusqueda] = useState("");
  const [orden, setOrden] = useState<{ clave: string; asc: boolean } | null>(null);
  const [pagina, setPagina] = useState(1);

  const query = useQuery(detalleAlertaQueryOptions(alerta?.clave ?? null, filtros));
  const detalle = query.data;

  const filas = useMemo(() => {
    if (!detalle) return [] as FilaDetalle[];
    const texto = busqueda.trim().toLowerCase();
    const filtradas = texto
      ? detalle.filas.filter((fila) =>
          detalle.columnas.some(
            (c) =>
              c.tipo === "texto" &&
              String(fila[c.clave] ?? "")
                .toLowerCase()
                .includes(texto),
          ),
        )
      : detalle.filas;

    if (!orden) return filtradas;
    const columna = detalle.columnas.find((c) => c.clave === orden.clave);
    if (!columna) return filtradas;

    // El backend ya ordena por relevancia; esto solo reordena lo recibido.
    return [...filtradas].sort((a, b) => {
      const x = a[orden.clave];
      const y = b[orden.clave];
      if (x === null || x === undefined) return 1;
      if (y === null || y === undefined) return -1;
      const cmp = esNumerica(columna)
        ? Number(x) - Number(y)
        : String(x).localeCompare(String(y), "es");
      return orden.asc ? cmp : -cmp;
    });
  }, [detalle, busqueda, orden]);

  const paginas = Math.max(1, Math.ceil(filas.length / TAMANHO_PAGINA));
  // Filtrar u ordenar puede dejar la página fuera de rango: se acota al render.
  const paginaActual = Math.min(pagina, paginas);
  const visibles = filas.slice((paginaActual - 1) * TAMANHO_PAGINA, paginaActual * TAMANHO_PAGINA);

  const alternar = (clave: string) => {
    setOrden((prev) => (prev?.clave === clave ? { clave, asc: !prev.asc } : { clave, asc: false }));
    setPagina(1);
  };

  const truncado = detalle ? detalle.total > detalle.filas.length : false;

  return (
    <Dialog
      open={alerta !== null}
      onOpenChange={(abierto) => {
        if (!abierto) {
          setBusqueda("");
          setOrden(null);
          setPagina(1);
        }
        onOpenChange(abierto);
      }}
    >
      <DialogContent className="flex max-h-[85vh] w-[min(1200px,95vw)] max-w-none flex-col">
        <DialogHeader>
          <DialogTitle>{alerta?.titulo ?? ""}</DialogTitle>
          <DialogDescription>
            {detalle
              ? `${fmtNum(detalle.total)} ${alerta?.unidad ?? ""} · ${detalle.detalle}`
              : alerta?.detalle}
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value);
              setPagina(1);
            }}
            placeholder="Buscar…"
            className="bg-card pl-9"
          />
        </div>

        <div className="min-h-0 overflow-auto rounded-lg border bg-card">
          {query.isPending ? (
            <p className="p-6 text-sm text-muted-foreground">Cargando detalle…</p>
          ) : query.isError ? (
            <div className="p-6">
              <p className="text-sm font-semibold">No se pudo cargar el detalle</p>
              <button
                type="button"
                onClick={() => void query.refetch()}
                className="mt-1 text-xs font-semibold text-primary underline-offset-2 hover:underline"
              >
                Reintentar
              </button>
            </div>
          ) : filas.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">Sin filas para mostrar.</p>
          ) : (
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card">
                <TableRow>
                  {detalle?.columnas.map((columna) => (
                    <TableHead
                      key={columna.clave}
                      className={cn(esNumerica(columna) && "text-right")}
                    >
                      <button
                        type="button"
                        onClick={() => alternar(columna.clave)}
                        className={cn(
                          "inline-flex items-center gap-1 whitespace-nowrap font-semibold hover:text-foreground",
                          esNumerica(columna) && "flex-row-reverse",
                        )}
                      >
                        {columna.titulo}
                        {orden?.clave === columna.clave ? (
                          orden.asc ? (
                            <ArrowUp className="size-3" />
                          ) : (
                            <ArrowDown className="size-3" />
                          )
                        ) : null}
                      </button>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibles.map((fila, i) => (
                  <TableRow key={`${fila["nombre"] ?? ""}-${i}`} className="bg-card">
                    {detalle?.columnas.map((columna) => {
                      const valor = fila[columna.clave] ?? null;
                      const signo = CON_SIGNO.has(columna.clave) ? Number(valor) : 0;
                      return (
                        <TableCell
                          key={columna.clave}
                          className={cn(
                            esNumerica(columna) && "text-right tabular-nums",
                            columna.clave === "nombre" && "font-medium",
                            valor !== null && signo < 0 && "text-chart-4",
                            valor !== null && signo > 0 && "text-success",
                          )}
                        >
                          {formatear(columna, valor)}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {filas.length === 0
              ? null
              : `${fmtNum((paginaActual - 1) * TAMANHO_PAGINA + 1)}–${fmtNum(
                  (paginaActual - 1) * TAMANHO_PAGINA + visibles.length,
                )} de ${fmtNum(filas.length)}`}
            {truncado
              ? ` · las ${fmtNum(detalle?.filas.length ?? 0)} más relevantes de ${fmtNum(
                  detalle?.total ?? 0,
                )}`
              : ""}
          </p>

          {filas.length > 0 ? (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-lg bg-card"
                disabled={paginaActual <= 1}
                onClick={() => setPagina(paginaActual - 1)}
                aria-label="Página anterior"
              >
                <ChevronLeft />
                <span className="hidden sm:inline">Anterior</span>
              </Button>
              <span className="min-w-16 rounded-full bg-muted/60 px-3 py-1.5 text-center text-xs font-semibold tabular-nums">
                {paginaActual} / {paginas}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-lg bg-card"
                disabled={paginaActual >= paginas}
                onClick={() => setPagina(paginaActual + 1)}
                aria-label="Página siguiente"
              >
                <span className="hidden sm:inline">Siguiente</span>
                <ChevronRight />
              </Button>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
