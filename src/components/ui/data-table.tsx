import type { Key, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
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
import { ChevronLeft, ChevronRight } from "lucide-react";

export type DataTableColumn<T> = {
  id: string;
  header: ReactNode;
  cell: (row: T, index: number) => ReactNode;
  width?: string;
  className?: string;
  headerClassName?: string;
};

export type DataTablePagination = {
  page: number;
  pages: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
};

type DataTableProps<T> = {
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: LucideIcon;
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowKey: (row: T, index: number) => Key;
  pagination?: DataTablePagination;
  loading?: boolean;
  loadingRows?: number;
  error?: ReactNode;
  emptyMessage?: ReactNode;
  minWidth?: string;
  stickyColumnId?: string;
  className?: string;
};

export function DataTable<T>({
  title,
  subtitle,
  icon: Icon,
  columns,
  rows,
  getRowKey,
  pagination,
  loading = false,
  loadingRows = 8,
  error,
  emptyMessage = "No hay resultados.",
  minWidth = "min-w-[1160px]",
  stickyColumnId,
  className,
}: DataTableProps<T>) {
  const stickyColumnIndex = stickyColumnId
    ? columns.findIndex((column) => column.id === stickyColumnId)
    : columns.length > 0
      ? 0
      : -1;
  const hasStickyColumn = stickyColumnIndex >= 0;

  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl border border-border/80 bg-card shadow-card",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/80 px-4 py-4 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          {Icon ? (
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
              <Icon className="size-4" />
            </span>
          ) : null}
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-foreground">{title}</h2>
            {subtitle ? <p className="truncate text-xs text-muted-foreground">{subtitle}</p> : null}
          </div>
        </div>

        {pagination ? (
          <div className="flex items-center gap-2 sm:ml-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-lg bg-background/60"
              disabled={pagination.disabled || pagination.page <= 1}
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              aria-label="Página anterior"
            >
              <ChevronLeft />
              <span className="hidden sm:inline">Anterior</span>
            </Button>
            <span className="min-w-16 rounded-full bg-muted/60 px-3 py-1.5 text-center text-xs font-semibold tabular-nums text-foreground">
              {pagination.page} / {pagination.pages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-lg bg-background/60"
              disabled={pagination.disabled || pagination.page >= pagination.pages}
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              aria-label="Página siguiente"
            >
              <span className="hidden sm:inline">Siguiente</span>
              <ChevronRight />
            </Button>
          </div>
        ) : null}
      </div>

      <div className="relative overflow-x-auto [scrollbar-color:var(--color-border)_transparent] [scrollbar-width:thin]">
        <Table className={cn(minWidth, "text-xs")}>
          <colgroup>
            {columns.map((column) => (
              <col key={column.id} className={column.width} />
            ))}
          </colgroup>
          <TableHeader>
            <TableRow className="border-border/80 bg-muted/35 hover:bg-muted/35">
              {columns.map((column, index) => (
                <TableHead
                  key={column.id}
                  className={cn(
                    "sticky top-0 z-10 bg-muted py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground",
                    hasStickyColumn &&
                      index === stickyColumnIndex &&
                      "left-0 z-20 border-r border-border/80 bg-muted",
                    column.headerClassName,
                    hasStickyColumn && index === stickyColumnIndex && "bg-muted",
                  )}
                >
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: loadingRows }, (_, rowIndex) => (
                <TableRow key={`loading-${rowIndex}`} aria-hidden className="border-border/70">
                  {columns.map((column, columnIndex) => (
                    <TableCell
                      key={column.id}
                      className={cn(
                        "py-3",
                        column.className,
                        hasStickyColumn &&
                          columnIndex === stickyColumnIndex &&
                          "sticky left-0 z-10 border-r border-border/80 bg-card",
                      )}
                    >
                      <Skeleton className={cn("h-4", columnIndex % 3 === 0 ? "w-24" : "w-16")} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : error ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-destructive">
                  {error}
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, rowIndex) => (
                <TableRow key={getRowKey(row, rowIndex)} className="group border-border/70">
                  {columns.map((column, columnIndex) => (
                    <TableCell
                      key={column.id}
                      className={cn(
                        "py-3",
                        column.className,
                        hasStickyColumn &&
                          columnIndex === stickyColumnIndex &&
                          "sticky left-0 z-10 border-r border-border/80 bg-card shadow-[4px_0_10px_-8px_var(--color-primary)] group-hover:bg-muted",
                      )}
                    >
                      {column.cell(row, rowIndex)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
