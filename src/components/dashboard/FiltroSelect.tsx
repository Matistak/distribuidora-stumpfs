import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TODOS = "__todos__";

export function FiltroSelect({
  placeholder,
  valor,
  opciones,
  onChange,
}: {
  placeholder: string;
  valor?: string;
  opciones: string[];
  onChange: (valor: string | undefined) => void;
}) {
  return (
    <Select
      value={valor ?? TODOS}
      onValueChange={(valor) => onChange(valor === TODOS ? undefined : valor)}
    >
      <SelectTrigger className="h-9 w-[190px] text-xs">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="max-h-72">
        <SelectItem value={TODOS}>{placeholder}</SelectItem>
        {opciones.map((opcion) => (
          <SelectItem key={opcion} value={opcion}>
            {opcion}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
