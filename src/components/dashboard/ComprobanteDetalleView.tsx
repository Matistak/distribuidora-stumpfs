import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fmtFecha, fmtGs, fmtNum } from "@/lib/metrics";
import type { ComprobanteDetalle } from "@/lib/types";

function Dato({ label, valor, destacado }: { label: string; valor: string; destacado?: boolean }) {
  return (
    <div
      className={
        destacado
          ? "rounded-lg border border-primary/20 bg-card px-3 py-2.5"
          : "rounded-lg border border-border bg-card px-3 py-2.5"
      }
    >
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p
        className={
          destacado
            ? "mt-0.5 font-display text-lg font-bold text-primary"
            : "mt-0.5 truncate font-display text-base font-semibold text-foreground"
        }
        title={valor}
      >
        {valor}
      </p>
    </div>
  );
}

function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background px-4 py-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-6">{children}</div>
    </div>
  );
}

export function ComprobanteDetalleView({
  detalle,
  cargando,
  error,
  onBack,
}: {
  detalle: ComprobanteDetalle | null;
  cargando: boolean;
  error?: string | undefined;
  onBack: () => void;
}) {
  if (cargando) {
    return (
      <Layout>
        <section className="rounded-2xl border border-border/80 bg-card p-6 shadow-card">
          <p className="text-sm text-muted-foreground">Cargando detalle del comprobante...</p>
        </section>
      </Layout>
    );
  }

  if (error || !detalle) {
    return (
      <Layout>
        <section className="rounded-2xl border border-destructive/30 bg-card p-6 shadow-card">
          <p className="text-sm text-destructive">{error ?? "No se encontró el comprobante."}</p>
          <button
            type="button"
            onClick={onBack}
            className="mt-4 inline-flex shrink-0 items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            <ArrowLeft className="size-4" />
            Volver a facturas
          </button>
        </section>
      </Layout>
    );
  }

  const { resumen, lineas } = detalle;
  return (
    <Layout>
      <header className="flex items-start justify-between gap-4 border-b border-border pb-5">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Detalle de comprobante
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h1 className="truncate text-2xl font-bold tracking-tight" title={resumen.nroDoc}>
              {resumen.nroDoc}
            </h1>
            <Badge variant={resumen.esNotaCredito ? "destructive" : "secondary"}>
              {resumen.tipoDoc ?? "Sin tipo"}
            </Badge>
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {resumen.razonSocial ?? "Sin cliente"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Productos incluidos en el comprobante.
          </p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex shrink-0 items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
        >
          <ArrowLeft className="size-4" />
          Volver a facturas
        </button>
      </header>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        <Dato label="Fecha" valor={fmtFecha(resumen.fecha)} />
        <Dato label="RUC" valor={resumen.ruc ?? "—"} />
        <Dato label="Vendedor" valor={resumen.vendedor ?? "—"} />
        <Dato label="Canal" valor={resumen.canal ?? "—"} />
        <Dato label="Ciudad" valor={resumen.ciudad ?? "—"} />
        <Dato label="Líneas" valor={fmtNum(resumen.cantidadLineas)} />
        <Dato label="Unidades" valor={fmtNum(resumen.unidades)} />
        <Dato label="Venta bruta" valor={fmtGs(resumen.ventaBruta)} />
        <Dato label="Venta neta" valor={fmtGs(resumen.ventaNeta)} destacado />
      </div>

      <section className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-card">
        <div className="border-b border-border/80 px-4 py-4 sm:px-5">
          <h2 className="text-sm font-semibold">Productos del comprobante</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Detalle de las líneas incluidas en el documento.
          </p>
        </div>
        <div className="table-scroll">
          <Table className="min-w-[900px] text-xs">
            <TableHeader>
              <TableRow className="border-border/80 bg-muted/35 hover:bg-muted/35">
                <TableHead className="py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  Producto
                </TableHead>
                <TableHead className="py-3 text-right text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  Unidades
                </TableHead>
                <TableHead className="py-3 text-right text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  Precio s/IVA
                </TableHead>
                <TableHead className="py-3 text-right text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  Descuento
                </TableHead>
                <TableHead className="py-3 text-right text-[10px] font-bold uppercase tracking-[0.12em] text-primary">
                  Venta neta
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lineas.map((linea, index) => (
                <TableRow
                  key={`${linea.nroDoc}-${linea.codProducto}-${linea.nroComprobante}-${index}`}
                  className="border-border/70"
                >
                  <TableCell className="max-w-[420px] py-3">
                    <div className="font-medium text-foreground">
                      {linea.producto ?? "Sin producto"}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Código {linea.codProducto}
                    </div>
                  </TableCell>
                  <TableCell className="py-3 text-right tabular-nums">
                    {fmtNum(linea.vtaUnit)}
                  </TableCell>
                  <TableCell className="py-3 text-right tabular-nums">
                    {fmtGs(linea.precioSinIva ?? linea.precioConIva)}
                  </TableCell>
                  <TableCell className="py-3 text-right tabular-nums">
                    {linea.porcDescuento === null ? "—" : `${fmtNum(linea.porcDescuento)}%`}
                  </TableCell>
                  <TableCell className="py-3 text-right font-semibold tabular-nums text-primary">
                    {fmtGs(linea.montoVtaNetaGua)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    </Layout>
  );
}
