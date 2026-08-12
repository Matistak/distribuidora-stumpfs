import { type MouseEvent, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { clientesQueryOptions } from "@/lib/queries";
import { cn } from "@/lib/utils";

function separarCliente(cliente: string) {
  const separador = cliente.indexOf(" - ");

  if (separador === -1) return { razonSocial: cliente, ruc: undefined };

  return {
    razonSocial: cliente.slice(separador + 3),
    ruc: cliente.slice(0, separador),
  };
}

export function FiltroCliente({
  placeholder,
  valor,
  onChange,
  opciones,
  backend,
  className,
}: {
  placeholder: string;
  valor?: string | undefined;
  onChange: (valor: string | undefined) => void;
  opciones: string[];
  backend: boolean;
  className?: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [busquedaDebounced, setBusquedaDebounced] = useState("");

  useEffect(() => {
    const timeout = window.setTimeout(() => setBusquedaDebounced(busqueda.trim()), 300);
    return () => window.clearTimeout(timeout);
  }, [busqueda]);

  const clientesQuery = useQuery({
    ...clientesQueryOptions(busquedaDebounced),
    enabled: backend,
  });
  const buscando = backend && (busqueda.trim() !== busquedaDebounced || clientesQuery.isFetching);
  const opcionesVisibles = backend ? (buscando ? [] : (clientesQuery.data ?? [])) : opciones;

  const alSeleccionar = (cliente: string) => {
    onChange(cliente);
    setAbierto(false);
    setBusqueda("");
  };

  const alLimpiar = (event: MouseEvent<HTMLSpanElement>) => {
    event.preventDefault();
    event.stopPropagation();
    onChange(undefined);
  };

  return (
    <Popover
      open={abierto}
      onOpenChange={(siguiente) => {
        setAbierto(siguiente);
        if (siguiente) setBusqueda("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={abierto}
          className={cn("h-9 w-[220px] justify-between text-xs font-normal", className)}
        >
          <span className={cn("truncate", !valor && "text-muted-foreground")}>
            {valor ? valor : placeholder}
          </span>
          {valor ? (
            <span
              role="button"
              tabIndex={0}
              aria-label="Quitar filtro de cliente"
              onClick={alLimpiar}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onChange(undefined);
                }
              }}
              className="grid size-4 shrink-0 cursor-pointer place-items-center rounded-sm text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <X className="size-3.5" />
            </span>
          ) : (
            <ChevronsUpDown className="size-3.5 shrink-0 opacity-50" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(360px,calc(100vw-2rem))] p-0" align="start">
        <Command shouldFilter={!backend} aria-busy={buscando}>
          <CommandInput
            placeholder="Buscar cliente…"
            value={busqueda}
            onValueChange={setBusqueda}
          />
          <CommandList>
            <CommandEmpty>
              {buscando ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  Buscando...
                </span>
              ) : (
                "Sin resultados."
              )}
            </CommandEmpty>
            <CommandGroup>
              {opcionesVisibles.map((cliente) => {
                const clientePresentado = separarCliente(cliente);

                return (
                  <CommandItem
                    key={cliente}
                    value={cliente}
                    onSelect={() => alSeleccionar(cliente)}
                    className="items-start"
                  >
                    <Check
                      className={cn(
                        "mt-0.5 size-4",
                        valor === cliente ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">
                        {clientePresentado.razonSocial}
                      </span>
                      {clientePresentado.ruc ? (
                        <span className="block truncate text-xs font-normal text-muted-foreground">
                          Ruc: {clientePresentado.ruc}
                        </span>
                      ) : null}
                    </span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
