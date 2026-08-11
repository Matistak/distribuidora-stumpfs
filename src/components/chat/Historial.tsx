import { useEffect, useRef, useState } from "react";
import { Bot, Database, Loader2, MessageCircle, Send, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { nombreHerramienta, type ChatConversacionDetalle, type ChatMensaje } from "@/lib/chat";

const formatearHora = new Intl.DateTimeFormat("es", {
  hour: "2-digit",
  minute: "2-digit",
});

/** Chips con las consultas a herramientas de ventas, resumidas (Etapa 7). */
function ChipsHerramientas({
  herramientas,
  enVivo,
}: {
  /** Nombres legibles de las herramientas consultadas, en orden. */
  herramientas: string[];
  /** True mientras el modelo esta consultando (chip con animacion). */
  enVivo?: boolean;
}) {
  return (
    <div className={cn("mb-2 flex flex-wrap gap-1.5", enVivo && "animate-pulse")}>
      {herramientas.map((nombre, index) => (
        <span
          key={`${nombre}-${index}`}
          className="inline-flex items-center gap-1 rounded-md border border-border bg-background/70 px-2 py-0.5 text-[11px] text-muted-foreground"
        >
          <Database className="size-3" />
          {nombre}
          {enVivo ? "…" : ""}
        </span>
      ))}
    </div>
  );
}

export function HistorialMensajes({
  detalle,
  cargando,
  error,
  mensajes,
  enviando,
  turnoActivo,
  herramientasEnCurso,
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
  /** Nombres legibles de las herramientas que se estan consultando en vivo. */
  herramientasEnCurso: string[];
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
    <section className="flex h-[560px] min-h-0 flex-col rounded-xl border border-border bg-card shadow-card lg:h-[calc(100vh-245px)]">
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
          const herramientas =
            mensaje.toolCalls?.map((call) => {
              const nombre = nombreHerramienta(call.tool);
              return call.status === "failed" ? `${nombre} · falló` : nombre;
            }) ?? [];
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
              {mensaje.role === "assistant" && herramientas.length > 0 && (
                <ChipsHerramientas herramientas={herramientas} />
              )}
              {mensaje.role === "assistant" &&
                esUltimo &&
                enviando &&
                herramientasEnCurso.length > 0 && (
                  <ChipsHerramientas herramientas={herramientasEnCurso} enVivo />
                )}
              {mensaje.text && (
                <p>
                  {mensaje.text}
                  {mensaje.role === "assistant" && esUltimo && enviando && (
                    <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse rounded-sm bg-current align-middle" />
                  )}
                </p>
              )}
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
