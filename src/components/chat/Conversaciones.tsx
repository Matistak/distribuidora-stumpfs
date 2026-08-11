import { useState } from "react";
import { Loader2, MessageSquarePlus, MessagesSquare, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  eliminandoId,
  onEliminar,
  seleccionadoId,
  onCrear,
  onSeleccionar,
}: {
  conversaciones: ChatConversacion[];
  cargando: boolean;
  creando: boolean;
  /** Id de la conversacion que se esta borrando (muestra spinner en el boton). */
  eliminandoId: number | null;
  onEliminar: (id: number) => void;
  seleccionadoId: number | null;
  onCrear: () => void;
  onSeleccionar: (id: number) => void;
}) {
  const [confirmandoId, setConfirmandoId] = useState<number | null>(null);
  const conversacionAEliminar = conversaciones.find(({ id }) => id === confirmandoId);

  return (
    <AlertDialog
      open={confirmandoId !== null}
      onOpenChange={(open) => !open && setConfirmandoId(null)}
    >
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

        <div className="mt-4 max-h-[45vh] space-y-2 overflow-y-auto lg:max-h-[calc(100vh-420px)]">
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
            conversaciones.map((conversacion) => {
              const eliminando = eliminandoId === conversacion.id;
              return (
                <div
                  key={conversacion.id}
                  className={cn(
                    "group flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-left transition-colors",
                    conversacion.id === seleccionadoId
                      ? "border-primary/40 bg-primary/5"
                      : "border-transparent hover:bg-accent",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => onSeleccionar(conversacion.id)}
                    className="min-w-0 flex-1 text-left"
                    disabled={eliminando}
                  >
                    <span className="block truncate text-sm font-medium">{conversacion.title}</span>
                    <span className="block text-xs text-muted-foreground">
                      {formatearFecha.format(new Date(conversacion.updatedAt))}
                    </span>
                  </button>
                  <Badge variant="secondary" className="shrink-0">
                    {conversacion.selectedModel}
                  </Badge>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7 shrink-0 text-muted-foreground hover:text-destructive"
                    title="Borrar conversación"
                    disabled={eliminando || creando}
                    onClick={() => setConfirmandoId(conversacion.id)}
                  >
                    {eliminando ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="size-3.5" />
                    )}
                  </Button>
                </div>
              );
            })}
        </div>
      </section>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar conversación?</AlertDialogTitle>
          <AlertDialogDescription>
            Se eliminará definitivamente
            {conversacionAEliminar ? ` «${conversacionAEliminar.title}»` : " esta conversación"}.
            Esta acción no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => {
              if (confirmandoId !== null) onEliminar(confirmandoId);
              setConfirmandoId(null);
            }}
          >
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
