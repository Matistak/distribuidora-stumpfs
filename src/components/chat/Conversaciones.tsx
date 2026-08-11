import { Loader2, MessageSquarePlus, MessagesSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ChatConversacion } from "@/lib/chat";

const formatearFecha = new Intl.DateTimeFormat("es", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export function ConversacionesPanel({
  conversaciones,
  cargando,
  creando,
  seleccionadoId,
  onCrear,
  onSeleccionar,
}: {
  conversaciones: ChatConversacion[];
  cargando: boolean;
  creando: boolean;
  seleccionadoId: number | null;
  onCrear: () => void;
  onSeleccionar: (id: number) => void;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Conversaciones</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Se guardan en esta computadora y se pueden continuar al volver a abrir la aplicación.
          </p>
        </div>
        <Button type="button" size="sm" onClick={onCrear} disabled={creando}>
          {creando ? <Loader2 className="size-4 animate-spin" /> : <MessageSquarePlus />}
          Nueva conversación
        </Button>
      </div>

      <div className="mt-4 space-y-2">
        {cargando && (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" /> Cargando conversaciones...
          </p>
        )}

        {!cargando && conversaciones.length === 0 && (
          <div className="flex items-center gap-3 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            <MessagesSquare className="size-4 shrink-0" />
            Todavía no hay conversaciones. Creá una nueva para empezar.
          </div>
        )}

        {!cargando &&
          conversaciones.map((conversacion) => (
            <button
              key={conversacion.id}
              type="button"
              onClick={() => onSeleccionar(conversacion.id)}
              className={cn(
                "flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors",
                conversacion.id === seleccionadoId
                  ? "border-primary/40 bg-primary/5"
                  : "border-transparent hover:bg-accent",
              )}
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{conversacion.title}</span>
                <span className="block text-xs text-muted-foreground">
                  {formatearFecha.format(new Date(conversacion.updatedAt))}
                </span>
              </span>
              <Badge variant="secondary" className="shrink-0">
                {conversacion.selectedModel}
              </Badge>
            </button>
          ))}
      </div>
    </section>
  );
}
