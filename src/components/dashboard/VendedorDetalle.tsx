import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { VentasTable } from "@/components/dashboard/VentasTable";
import { fmtGs, fmtNum, fmtPct } from "@/lib/metrics";
import type { Filtros, VendedorResumen, VentaRow } from "@/lib/types";

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
      >
        {valor}
      </p>
    </div>
  );
}

export function VendedorDetalle({
  vendedor,
  filtros,
  backend,
  rows,
  onClose,
}: {
  vendedor: VendedorResumen | null;
  filtros: Filtros;
  backend: boolean;
  rows: VentaRow[];
  onClose: () => void;
}) {
  return (
    <Dialog open={vendedor !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
        {vendedor ? (
          <>
            <DialogHeader>
              <DialogTitle>{vendedor.vendedor}</DialogTitle>
              <DialogDescription>
                Detalle del vendedor y ventas filtradas por el período seleccionado.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              <Dato label="Facturas" valor={fmtNum(vendedor.facturas)} />
              <Dato label="Clientes" valor={fmtNum(vendedor.clientes)} />
              <Dato label="Unidades" valor={fmtNum(vendedor.unidades)} />
              <Dato label="Última venta" valor={vendedor.ultimaVenta || "—"} />
              <Dato label="Venta bruta" valor={fmtGs(vendedor.ventaBruta)} />
              <Dato label="Venta neta" valor={fmtGs(vendedor.ventaNeta)} destacado />
              <Dato label="Ticket promedio" valor={fmtGs(vendedor.ticketPromedio)} />
              <Dato label="Margen" valor={fmtPct(vendedor.margenPorc)} />
              <Dato label="Participación" valor={fmtPct(vendedor.participacion)} />
            </div>

            <VentasTable
              backend={backend}
              filtros={{ ...filtros, vendedor: vendedor.vendedor }}
              rows={rows}
              mostrarVendedor={false}
            />
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
