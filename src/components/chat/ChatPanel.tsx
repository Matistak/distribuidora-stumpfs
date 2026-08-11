import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConversacionesPanel } from "@/components/chat/Conversaciones";
import { HistorialMensajes } from "@/components/chat/Historial";
import type { ChatConversacion, ChatConversacionDetalle, ChatMensaje, ChatModel } from "@/lib/chat";

/**
 * Panel principal del chat (Etapa 7).
 *
 * Layout de chat de dos columnas: a la izquierda el selector de modelo y las
 * conversaciones anteriores; a la derecha el historial con el editor de
 * mensajes. Todos los estados y acciones llegan desde la ruta `/chat`.
 */
export function ChatPanel({
  modelos,
  modeloElegido,
  modeloActual,
  onCambiarModelo,
  conversaciones,
  conversacionesCargando,
  conversacionesError,
  creando,
  onCrear,
  eliminandoId,
  eliminandoError,
  onEliminar,
  seleccionadoId,
  onSeleccionar,
  detalle,
  detalleCargando,
  detalleError,
  mensajes,
  enviando,
  turnoActivo,
  herramientasEnCurso,
  errorEnvio,
  onEnviar,
  onCancelar,
}: {
  modelos: ChatModel[];
  modeloElegido: string | null;
  modeloActual: ChatModel | null;
  onCambiarModelo: (id: string) => void;
  conversaciones: ChatConversacion[];
  conversacionesCargando: boolean;
  conversacionesError?: string | undefined;
  creando: boolean;
  onCrear: () => void;
  /** Id de la conversacion que se esta borrando (para mostrar el spinner). */
  eliminandoId: number | null;
  eliminandoError?: string | undefined;
  onEliminar: (id: number) => void;
  seleccionadoId: number | null;
  onSeleccionar: (id: number) => void;
  detalle: ChatConversacionDetalle | null;
  detalleCargando: boolean;
  detalleError?: string | undefined;
  mensajes: ChatMensaje[];
  enviando: boolean;
  turnoActivo: string | null;
  /** Nombres legibles de las herramientas que se estan consultando en vivo. */
  herramientasEnCurso: string[];
  errorEnvio?: string | undefined;
  onEnviar: (texto: string) => void;
  onCancelar: () => void;
}) {
  return (
    <div className="grid items-start gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
      <aside className="space-y-4 lg:sticky lg:top-5">
        <section className="rounded-xl border border-border bg-card p-4 shadow-card">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Modelo del asistente
          </p>
          <Select
            {...(modeloElegido ? { value: modeloElegido } : {})}
            onValueChange={onCambiarModelo}
            disabled={!modelos.length}
          >
            <SelectTrigger className="mt-2 w-full text-sm">
              <SelectValue placeholder="Seleccioná un modelo" />
            </SelectTrigger>
            <SelectContent>
              {modelos.map((modelo) => (
                <SelectItem key={modelo.id} value={modelo.id}>
                  {modelo.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {modeloActual ? (
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {modeloActual.description}
            </p>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">
              No hay modelos disponibles para la cuenta.
            </p>
          )}
        </section>

        {conversacionesError && (
          <section className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 shadow-card">
            <h2 className="text-xs font-semibold text-destructive">
              No se pudieron cargar las conversaciones
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">{conversacionesError}</p>
          </section>
        )}

        {eliminandoError && (
          <section className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 shadow-card">
            <h2 className="text-xs font-semibold text-destructive">
              No se pudo borrar la conversación
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">{eliminandoError}</p>
          </section>
        )}

        <ConversacionesPanel
          conversaciones={conversaciones}
          cargando={conversacionesCargando}
          creando={creando}
          eliminandoId={eliminandoId}
          onEliminar={onEliminar}
          seleccionadoId={seleccionadoId}
          onCrear={onCrear}
          onSeleccionar={onSeleccionar}
        />
      </aside>

      <HistorialMensajes
        detalle={detalle}
        cargando={detalleCargando}
        error={detalleError}
        mensajes={mensajes}
        enviando={enviando}
        turnoActivo={turnoActivo}
        herramientasEnCurso={herramientasEnCurso}
        errorEnvio={errorEnvio}
        onEnviar={onEnviar}
        onCancelar={onCancelar}
      />
    </div>
  );
}
