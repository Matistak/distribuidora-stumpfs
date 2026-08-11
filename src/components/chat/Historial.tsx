import { useEffect, useRef, useState } from "react";
import { Bot, Loader2, MessageCircle, Send, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { ChatConversacionDetalle, ChatMensaje } from "@/lib/chat";

const formatearHora = new Intl.DateTimeFormat("es", {
  hour: "2-digit",
  minute: "2-digit",
});

export function HistorialMensajes({
  detalle,
  cargando,
  error,
  mensajes,
  enviando,
  turnoActivo,
  errorEnvio,
  onEnviar,
  onCancelar,
}: {
  detalle: ChatConversacionDetalle | null;
  cargando: boolean;
  error?: string | undefined;
  mensajes: ChatMensaje[];
  enviando: boolean;
  /** Id del turno en curso; `null` cuando no hay generacion activa. */
  turnoActivo: string | null;
  errorEnvio?: string | undefined;
  onEnviar: (texto: string) => void;
  onCancelar: () => void;
}) {
  const [texto, setTexto] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const ultimoTexto = mensajes.at(-1)?.text ?? "";
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [mensajes.length, ultimoTexto]);

  const enviar = () => {
    const limpio = texto.trim();
    if (!limpio || enviando) return;
    onEnviar(limpio);
    setTexto("");
  };

  if (cargando) {
    return (
      <section className="flex items-center gap-3 rounded-xl border border-border bg-card p-6 shadow-card">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Leyendo el historial de la conversación...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 shadow-card">
        <h2 className="text-sm font-semibold text-destructive">No se pudo leer la conversación</h2>
        <p className="mt-1 text-sm text-muted-foreground">{error}</p>
      </section>
    );
  }

  if (!detalle) {
    return (
      <section className="flex items-center justify-center gap-3 rounded-xl border border-dashed p-10 text-muted-foreground">
        <MessageCircle className="size-5" />
        <p className="text-sm">Seleccioná una conversación para ver su historial.</p>
      </section>
    );
  }

  const { conversation } = detalle;

  return (
    <section className="flex h-[560px] flex-col rounded-xl border border-border bg-card shadow-card">
      <header className="flex items-center gap-3 border-b border-border px-5 py-4">
        <span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
          <Bot className="size-4" />
        </span>
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold">{conversation.title}</h2>
          <p className="text-xs text-muted-foreground">Modelo: {conversation.selectedModel}</p>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-5">
        {mensajes.length === 0 && !enviando && (
          <p className="text-center text-sm text-muted-foreground">
            Esta conversación todavía no tiene mensajes. Escribí tu primera consulta.
          </p>
        )}

        {mensajes.map((mensaje, index) => {
          const esUltimo = index === mensajes.length - 1;
          return (
            <div
              key={mensaje.id}
              className={cn(
                "max-w-[85%] whitespace-pre-wrap rounded-xl px-4 py-3 text-sm",
                mensaje.role === "user"
                  ? "ml-auto rounded-br-sm bg-primary text-primary-foreground"
                  : "mr-auto rounded-bl-sm bg-muted",
              )}
            >
              <p>
                {mensaje.text}
                {mensaje.role === "assistant" && esUltimo && enviando && (
                  <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse rounded-sm bg-current align-middle" />
                )}
              </p>
              {typeof mensaje.createdAt === "number" && (
                <p
                  className={cn(
                    "mt-1 text-right text-[10px]",
                    mensaje.role === "user"
                      ? "text-primary-foreground/70"
                      : "text-muted-foreground",
                  )}
                >
                  {formatearHora.format(new Date(mensaje.createdAt))}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {errorEnvio && (
        <p className="mx-5 mb-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {errorEnvio}
        </p>
      )}

      <footer className="border-t border-border p-4">
        <div className="flex items-end gap-2">
          <Textarea
            value={texto}
            onChange={(event) => setTexto(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                enviar();
              }
            }}
            placeholder="Escribí tu consulta sobre las ventas..."
            disabled={enviando}
            rows={2}
            className="min-h-12 resize-none"
          />
          {enviando ? (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={onCancelar}
              disabled={!turnoActivo}
              title={turnoActivo ? "Detener generación" : "El turno aún no arrancó"}
            >
              <Square className="size-4" />
            </Button>
          ) : (
            <Button
              type="button"
              size="icon"
              onClick={enviar}
              disabled={!texto.trim()}
              title="Enviar mensaje"
            >
              <Send className="size-4" />
            </Button>
          )}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Enter para enviar · Shift+Enter para un salto de línea. Las respuestas pueden consultar
          los datos de ventas de la base local.
        </p>
      </footer>
    </section>
  );
}
