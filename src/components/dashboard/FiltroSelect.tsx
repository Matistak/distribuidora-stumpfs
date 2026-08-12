import { type MouseEvent, useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const TODOS = "__todos__";

export function FiltroSelect({
  placeholder,
  valor,
  opciones,
  onChange,
  className,
}: {
  placeholder: string;
  valor?: string | undefined;
  opciones: string[];
  onChange: (valor: string | undefined) => void;
  className?: string;
}) {
  const [abierto, setAbierto] = useState(false);

  const alLimpiar = (event: MouseEvent<HTMLSpanElement>) => {
    event.preventDefault();
    event.stopPropagation();
    onChange(undefined);
  };

  return (
    <Popover open={abierto} onOpenChange={setAbierto}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={abierto}
          className={cn("h-9 w-[190px] justify-between text-xs font-normal", className)}
        >
          <span className={cn("truncate", !valor && "text-muted-foreground")}>
            {valor ?? placeholder}
          </span>
          {valor ? (
            <span
              role="button"
              tabIndex={0}
              aria-label={`Quitar filtro de ${placeholder.toLowerCase()}`}
              onClick={alLimpiar}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onChange(undefined);
                }
              }}
              className="grid size-4 shrink-0 cursor-pointer place-items-center rounded-sm text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <X className="size-3.5" />
            </span>
          ) : (
            <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(320px,calc(100vw-2rem))] p-0" align="start">
        <Command>
          <CommandInput
            placeholder={`Buscar ${placeholder.toLowerCase().replace("todos los ", "")}...`}
          />
          <CommandList>
            <CommandEmpty>Sin resultados.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value={TODOS}
                onSelect={() => {
                  onChange(undefined);
                  setAbierto(false);
                }}
              >
                <Check className={cn("size-4", !valor ? "opacity-100" : "opacity-0")} />
                {placeholder}
              </CommandItem>
              {opciones.map((opcion) => (
                <CommandItem
                  key={opcion}
                  value={opcion}
                  onSelect={() => {
                    onChange(opcion === TODOS ? undefined : opcion);
                    setAbierto(false);
                  }}
                >
                  <Check className={cn("size-4", valor === opcion ? "opacity-100" : "opacity-0")} />
                  <span className="truncate">{opcion}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
