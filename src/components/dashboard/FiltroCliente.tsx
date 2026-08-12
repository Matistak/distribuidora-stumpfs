import { useEffect, useRef, useState } from "react";
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
import { cn } from "@/lib/utils";

const DEBOUNCE_MS = 300;

type EventoClick = {
  preventDefault: () => void;
  stopPropagation: () => void;
};

export function FiltroCliente({
  placeholder,
  valor,
  buscar,
  onChange,
}: {
  placeholder: string;
  valor?: string | undefined;
  /** Fuente de sugerencias; se consulta con el texto filtrado. */
  buscar: (q: string) => Promise<string[]>;
  onChange: (valor: string | undefined) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState(valor ?? "");
  const [resultados, setResultados] = useState<string[]>([]);
  const [buscando, setBuscando] = useState(false);
  const onChangeRef = useRef(onChange);
  const buscarRef = useRef(buscar);
  const timerRef = useRef<number | undefined>(undefined);
  const requestRef = useRef(0);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    buscarRef.current = buscar;
  }, [buscar]);

  useEffect(() => {
    setTexto(valor ?? "");
  }, [valor]);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  const cargarResultados = (q: string) => {
    const id = ++requestRef.current;
    setBuscando(true);
    buscarRef
      .current(q)
      .then((r) => {
        if (requestRef.current === id) setResultados(r);
      })
      .catch(() => {
        if (requestRef.current === id) setResultados([]);
      })
      .finally(() => {
        if (requestRef.current === id) setBuscando(false);
      });
  };

  const cancelarPendientes = () => {
    window.clearTimeout(timerRef.current);
    timerRef.current = undefined;
    requestRef.current++;
  };

  const alEscribir = (q: string) => {
    setTexto(q);
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = undefined;
      const qFinal = q.trim();
      onChangeRef.current(qFinal || undefined);
      void cargarResultados(qFinal);
    }, DEBOUNCE_MS);
  };

  const alSeleccionar = (cliente: string) => {
    cancelarPendientes();
    setTexto(cliente);
    onChangeRef.current(cliente);
    setAbierto(false);
  };

  const alLimpiar = (event?: EventoClick) => {
    event?.preventDefault();
    event?.stopPropagation();
    cancelarPendientes();
    setTexto("");
    onChangeRef.current(undefined);
  };

  return (
    <Popover
      open={abierto}
      onOpenChange={(abrir) => {
        setAbierto(abrir);
        if (abrir) void cargarResultados(texto.trim());
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={abierto}
          className="h-9 w-[220px] justify-between text-xs font-normal"
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
                  alLimpiar();
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
      <PopoverContent className="w-[260px] p-0" align="start">
        <Command>
          <CommandInput value={texto} onValueChange={alEscribir} placeholder="Buscar cliente…" />
          <CommandList>
            {buscando ? (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Buscando...
              </div>
            ) : (
              <>
                <CommandEmpty>Sin resultados para «{texto.trim()}»</CommandEmpty>
                <CommandGroup>
                  {resultados.map((cliente) => (
                    <CommandItem
                      key={cliente}
                      value={cliente}
                      onSelect={() => alSeleccionar(cliente)}
                    >
                      <Check
                        className={cn("size-4", valor === cliente ? "opacity-100" : "opacity-0")}
                      />
                      <span className="truncate">{cliente}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
