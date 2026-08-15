import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

const ANCHOS_CELDA = ["w-20", "w-28", "w-36", "w-24", "w-32", "w-16"];

export function KpiSkeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("rounded-xl border border-border bg-card p-5 shadow-card", className)}
    >
      <div className="flex items-start justify-between gap-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="size-4 rounded-md" />
      </div>
      <Skeleton className="mt-4 h-7 w-28" />
      <Skeleton className="mt-3 h-3 w-20" />
    </div>
  );
}

export function PanelSkeleton({ className }: { className?: string }) {
  return (
    <section
      aria-hidden
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-card shadow-card",
        className,
      )}
    >
      <header className="border-b border-border px-5 py-3.5">
        <Skeleton className="h-4 w-44" />
      </header>
      <div className="p-5">
        <Skeleton className="h-48 w-full" />
      </div>
    </section>
  );
}

export function TableRowsSkeleton({
  filas = 8,
  columnas = 6,
}: {
  filas?: number;
  columnas?: number;
}) {
  return (
    <>
      {Array.from({ length: filas }, (_, f) => (
        <TableRow key={f} aria-hidden>
          {Array.from({ length: columnas }, (_, c) => (
            <TableCell key={c} className="py-3.5">
              <Skeleton className={cn("h-4", ANCHOS_CELDA[(f + c) % ANCHOS_CELDA.length])} />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

export function TableSkeleton({
  filas = 8,
  columnas = 6,
  tituloAncho = "w-48",
  subtituloAncho = "w-64",
  className,
}: {
  filas?: number;
  columnas?: number;
  tituloAncho?: string;
  subtituloAncho?: string;
  className?: string;
}) {
  return (
    <section
      aria-busy
      aria-label="Cargando tabla"
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-card shadow-card",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <Skeleton className={cn("h-4", tituloAncho)} />
          <Skeleton className={cn("mt-2 h-3", subtituloAncho)} />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-4 w-14" />
          <Skeleton className="h-8 w-24" />
        </div>
      </div>
      <div className="table-scroll">
        <Table>
          <TableHeader>
            <TableRow aria-hidden>
              {Array.from({ length: columnas }, (_, i) => (
                <TableHead key={i}>
                  <Skeleton className="h-3 w-14" />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRowsSkeleton filas={filas} columnas={columnas} />
          </TableBody>
        </Table>
      </div>
    </section>
  );
}

export function DashboardSkeleton() {
  return (
    <section className="@container min-w-0 space-y-6" aria-busy aria-label="Cargando dashboard">
      <div className="grid gap-5 @md:grid-cols-2 @4xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <KpiSkeleton key={i} />
        ))}
      </div>
      <PanelSkeleton />
      <div className="grid gap-4 @3xl:grid-cols-2">
        <PanelSkeleton />
        <PanelSkeleton />
      </div>
      <div className="grid gap-4 @3xl:grid-cols-2">
        <PanelSkeleton />
        <PanelSkeleton />
      </div>
    </section>
  );
}
