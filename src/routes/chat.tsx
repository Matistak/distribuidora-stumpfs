import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, Loader2, RefreshCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { APP_MODE, backendConectado, mensajeError } from "@/lib/api";
import {
  CHAT_MODEL_KEY,
  cancelarTurnoChat,
  crearConversacionChat,
  eliminarConversacionChat,
  enviarMensajeChat,
  nombreHerramienta,
  obtenerConversacionChat,
  reiniciarCodex,
  type ChatConversacion,
  type ChatMensaje,
  type ChatSseEvent,
  type ChatStatus,
} from "@/lib/chat";
import {
  chatEstadoQueryOptions,
  conversacionQueryOptions,
  conversacionesQueryOptions,
} from "@/lib/queries";

export const Route = createFileRoute("/chat")({
  beforeLoad: () => {
    if (APP_MODE !== "back") throw redirect({ to: "/" });
  },
  component: ChatPage,
});

function ChatPage() {
  const backend = backendConectado();
  const queryClient = useQueryClient();
  const [seleccionado, setSeleccionado] = useState<string | null>(() =>
    localStorage.getItem(CHAT_MODEL_KEY),
  );
  const [seleccionadoId, setSeleccionadoId] = useState<number | null>(null);

  // Etapa 5: envio y streaming de mensajes.
  const [mensajes, setMensajes] = useState<ChatMensaje[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [turnoId, setTurnoId] = useState<string | null>(null);
  const [errorEnvio, setErrorEnvio] = useState<string>();
  // Etapa 7: consultas a herramientas (MCP de ventas) vistas en vivo.
  const [herramientasEnCurso, setHerramientasEnCurso] = useState<string[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const canceladoRef = useRef(false);
  // Ref del id seleccionado: el refresco post-turno usa el id vigente en el
  // momento del cierre, no el del render donde arranco el envio.
  const seleccionadoRef = useRef<number | null>(null);
  useEffect(() => {
    seleccionadoRef.current = seleccionadoId;
  }, [seleccionadoId]);

  const estadoQuery = useQuery({ ...chatEstadoQueryOptions(), enabled: backend });
  const status = estadoQuery.data?.status ?? null;
  const modelos = useMemo(() => estadoQuery.data?.modelos ?? [], [estadoQuery.data]);
  const defaultModel = estadoQuery.data?.defaultModel ?? null;
  const cargando = estadoQuery.isPending;

  const reiniciarMutation = useMutation({
    mutationFn: () => reiniciarCodex(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["chat", "estado"] });
    },
  });
  const reiniciando = reiniciarMutation.isPending;
  const error = estadoQuery.isError
    ? mensajeError(estadoQuery.error, "No se pudo conectar con el chat.")
    : reiniciarMutation.isError
      ? mensajeError(reiniciarMutation.error, "No se pudo reiniciar Codex.")
      : undefined;

  const crearMutation = useMutation({
    mutationFn: (model: string) => crearConversacionChat({ model }),
    onSuccess: async ({ conversation }) => {
      await queryClient.invalidateQueries({ queryKey: ["chat", "conversaciones"] });
      setSeleccionadoId(conversation.id);
    },
  });
  const creando = crearMutation.isPending;

  const conversacionesQuery = useQuery({
    ...conversacionesQueryOptions(),
    enabled: backend && Boolean(status?.authenticated),
  });
  const conversaciones = conversacionesQuery.data ?? [];
  const conversacionesCargando = conversacionesQuery.isFetching;
  const conversacionesError = conversacionesQuery.isError
    ? mensajeError(conversacionesQuery.error, "No se pudieron cargar las conversaciones.")
    : crearMutation.isError
      ? mensajeError(crearMutation.error, "No se pudo crear la conversación.")
      : undefined;

  const detalleQuery = useQuery(conversacionQueryOptions(seleccionadoId));
  const detalle = detalleQuery.data ?? null;
  const detalleCargando = detalleQuery.isFetching;
  const detalleError = detalleQuery.isError
    ? mensajeError(detalleQuery.error, "No se pudo leer la conversación.")
    : undefined;

  const eliminarMutation = useMutation({
    mutationFn: (id: number) => eliminarConversacionChat(id),
    onSuccess: (_, id) => {
      queryClient.setQueryData(
        conversacionesQueryOptions().queryKey,
        (prev?: ChatConversacion[]) => prev?.filter((c) => c.id !== id) ?? [],
      );
      if (seleccionadoRef.current === id) {
        setSeleccionadoId(null);
        seleccionadoRef.current = null;
      }
    },
  });
  const eliminandoId = eliminarMutation.isPending ? (eliminarMutation.variables ?? null) : null;
  const eliminandoError = eliminarMutation.isError
    ? mensajeError(eliminarMutation.error, "No se pudo borrar la conversación.")
    : undefined;

  // El historial mostrado se sincroniza con el detalle cargado (y con lo que
  // el streaming agrega de forma optimista).
  useEffect(() => {
    setMensajes(detalle?.messages ?? []);
  }, [detalle]);

  // Al cambiar de conversacion se limpia el estado de envio en curso.
  useEffect(() => {
    setEnviando(false);
    setTurnoId(null);
    setErrorEnvio(undefined);
    setHerramientasEnCurso([]);
  }, [seleccionadoId]);

  /**
   * Refresca el detalle de una conversacion tras un turno. Solo se aplica si
   * sigue siendo la conversacion seleccionada; la lista siempre se actualiza.
   */
  const refrescarConversacion = async (conversacionId: number) => {
    try {
      const nuevo = await obtenerConversacionChat(conversacionId);
      queryClient.setQueryData(conversacionQueryOptions(conversacionId).queryKey, nuevo);
      queryClient.setQueryData(
        conversacionesQueryOptions().queryKey,
        (prev?: ChatConversacion[]) =>
          prev?.map((c) => (c.id === conversacionId ? nuevo.conversation : c)) ?? [],
      );
    } catch {
      // El historial se sincronizara al reabrir la conversacion.
    }
  };

  const enviar = async (texto: string) => {
    if (!detalle || enviando) return;
    const conversacionId = detalle.conversation.id;
    canceladoRef.current = false;
    const abort = new AbortController();
    abortRef.current = abort;

    const mensajeUsuario: ChatMensaje = {
      id: `local-${Date.now()}`,
      role: "user",
      text: texto,
      createdAt: Date.now(),
    };
    const mensajeAsistente: ChatMensaje = {
      id: "local-asistente",
      role: "assistant",
      text: "",
    };
    setMensajes((prev) => [...prev, mensajeUsuario, mensajeAsistente]);
    setEnviando(true);
    setTurnoId(null);
    setErrorEnvio(undefined);
    setHerramientasEnCurso([]);

    let acumulado = "";
    let errorDelStream: string | undefined;

    const onEvent = (event: ChatSseEvent) => {
      switch (event.event) {
        case "message.start":
          setTurnoId(event.data.turnId);
          break;
        case "message.delta":
          acumulado += event.data.text;
          setMensajes((prev) =>
            prev.map((m) => (m.id === "local-asistente" ? { ...m, text: acumulado } : m)),
          );
          break;
        case "message.tool_call":
          setHerramientasEnCurso((prev) => [...prev, nombreHerramienta(event.data.tool)]);
          break;
        case "message.error":
          errorDelStream = event.data.message;
          break;
        case "message.completed":
          break;
      }
    };

    try {
      await enviarMensajeChat(conversacionId, texto, onEvent, abort.signal);
    } catch (cause: unknown) {
      if (!canceladoRef.current) {
        setErrorEnvio(mensajeError(cause, "No se pudo enviar el mensaje."));
      }
    } finally {
      if (errorDelStream && !canceladoRef.current) setErrorEnvio(errorDelStream);
      setEnviando(false);
      setTurnoId(null);
      setHerramientasEnCurso([]);
      abortRef.current = null;
      await refrescarConversacion(conversacionId);
    }
  };

  const cancelar = async () => {
    if (!enviando || !detalle || !turnoId) return;
    const conversacionId = detalle.conversation.id;
    canceladoRef.current = true;
    abortRef.current?.abort();
    try {
      await cancelarTurnoChat(conversacionId, turnoId);
    } catch {
      // El backend tambien interrumpe al cerrarse la conexion SSE.
    }
  };

  const modeloElegido = useMemo(() => {
    if (!modelos.length) return null;
    if (seleccionado && modelos.some((m) => m.id === seleccionado)) return seleccionado;
    if (defaultModel && modelos.some((m) => m.id === defaultModel)) return defaultModel;
    return modelos[0]?.id ?? null;
  }, [modelos, seleccionado, defaultModel]);

  const modeloActual = modelos.find((m) => m.id === modeloElegido) ?? null;

  const cambiarModelo = (id: string) => {
    setSeleccionado(id);
    localStorage.setItem(CHAT_MODEL_KEY, id);
  };

  const onReiniciar = () => {
    reiniciarMutation.reset();
    reiniciarMutation.mutate();
  };

  const onCrear = () => {
    if (creando || !modeloElegido) return;
    crearMutation.mutate(modeloElegido);
  };

  const seleccionarConversacion = (id: number) => {
    if (id === seleccionadoId) return;
    if (enviando) {
      // Al cambiar de conversacion se detiene el turno en curso.
      canceladoRef.current = true;
      abortRef.current?.abort();
      setEnviando(false);
      setTurnoId(null);
    }
    setSeleccionadoId(id);
    seleccionadoRef.current = id;
  };

  const onEliminar = (id: number) => {
    if (eliminandoId !== null) return;
    eliminarMutation.mutate(id);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-[1600px] items-center gap-3 px-4 py-5 lg:px-8">
          <span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
            <Bot className="size-5" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Asistente
            </p>
            <h1 className="text-xl font-bold tracking-tight">Chat de ventas</h1>
            <p className="text-sm text-muted-foreground">
              Consultá los datos comerciales con lenguaje natural.
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] space-y-4 px-4 py-5 lg:px-8">
        {!backend && <SinBackend />}

        {backend && cargando && (
          <section className="flex items-center gap-3 rounded-xl border border-border bg-card p-6 shadow-card">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Verificando Codex y los modelos disponibles...
            </p>
          </section>
        )}

        {backend && !cargando && error && (
          <section className="space-y-3 rounded-xl border border-destructive/30 bg-destructive/5 p-5 shadow-card">
            <div>
              <h2 className="text-sm font-semibold text-destructive">No se pudo iniciar el chat</h2>
              <p className="mt-1 text-sm text-muted-foreground">{error}</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onReiniciar}
              disabled={reiniciando}
            >
              {reiniciando ? <Loader2 className="size-4 animate-spin" /> : <RefreshCcw />}
              Reintentar
            </Button>
          </section>
        )}

        {backend && !cargando && !error && status && (
          <>
            <EstadoCodex status={status} reiniciando={reiniciando} onReiniciar={onReiniciar} />

            {!status.installed && <InstruccionesInstalacion codex={status} />}

            {status.installed && !status.authenticated && <InstruccionesLogin codex={status} />}

            {status.installed && status.authenticated && (
              <ChatPanel
                modelos={modelos}
                modeloElegido={modeloElegido}
                modeloActual={modeloActual}
                onCambiarModelo={cambiarModelo}
                conversaciones={conversaciones}
                conversacionesCargando={conversacionesCargando}
                conversacionesError={conversacionesError}
                creando={creando}
                onCrear={onCrear}
                eliminandoId={eliminandoId}
                eliminandoError={eliminandoError}
                onEliminar={onEliminar}
                seleccionadoId={seleccionadoId}
                onSeleccionar={seleccionarConversacion}
                detalle={detalle}
                detalleCargando={detalleCargando}
                detalleError={detalleError}
                mensajes={mensajes}
                enviando={enviando}
                turnoActivo={turnoId}
                herramientasEnCurso={herramientasEnCurso}
                errorEnvio={errorEnvio}
                onEnviar={enviar}
                onCancelar={cancelar}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}

function SinBackend() {
  return (
    <section className="rounded-xl border border-border bg-card p-6 shadow-card">
      <h2 className="text-sm font-semibold">El chat requiere el backend local</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Esta vista usa la API local del sidecar. Ejecutá la aplicación en modo backend
        (`VITE_APP_MODE=back`) con el sidecar corriendo para habilitar el chat.
      </p>
    </section>
  );
}

function EstadoCodex({
  status,
  reiniciando,
  onReiniciar,
}: {
  status: ChatStatus;
  reiniciando: boolean;
  onReiniciar: () => void;
}) {
  return (
    <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-5 shadow-card">
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant={status.authenticated ? "default" : "secondary"}>
          {status.authenticated ? "Cuenta conectada" : "Sin autenticación"}
        </Badge>
        <p className="text-xs text-muted-foreground">
          {status.installed ? `Codex ${status.version ?? ""}`.trim() : "Codex no instalado"}
          {status.running ? " · proceso activo" : ""}
          {status.account?.email ? ` · ${status.account.email}` : ""}
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onReiniciar}
        disabled={reiniciando}
      >
        {reiniciando ? <Loader2 className="size-4 animate-spin" /> : <RefreshCcw />}
        Reiniciar Codex
      </Button>
    </section>
  );
}

function InstruccionesInstalacion({ codex }: { codex: ChatStatus }) {
  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-card">
      <h2 className="text-sm font-semibold">Codex CLI no está instalado</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Instalá la CLI de Codex y luego iniciá sesión con tu cuenta de ChatGPT:
      </p>
      <pre className="mt-3 overflow-x-auto rounded-lg bg-muted p-3 text-xs text-foreground">
        npm install -g @openai/codex{`\n`}codex login
      </pre>
      {codex.codexCommand && (
        <p className="mt-3 text-xs text-muted-foreground">
          La aplicación buscó Codex en:{" "}
          <code className="rounded bg-muted px-1">{codex.codexCommand}</code>
        </p>
      )}
    </section>
  );
}

function InstruccionesLogin({ codex }: { codex: ChatStatus }) {
  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-card">
      <h2 className="text-sm font-semibold">Codex no está autenticado</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Ejecutá los siguientes comandos en tu terminal para iniciar sesión con tu cuenta de ChatGPT
        (se abre el navegador):
      </p>
      <pre className="mt-3 overflow-x-auto rounded-lg bg-muted p-3 text-xs text-foreground">
        codex login{`\n`}codex login status
      </pre>
      {codex.codexHome && (
        <p className="mt-3 text-xs text-muted-foreground">
          El inicio de sesión se guarda en:{" "}
          <code className="rounded bg-muted px-1">{codex.codexHome.path}</code>
          {codex.codexHome.authExists
            ? " · ya existe el archivo de sesión"
            : " · todavía no existe el archivo de sesión"}
        </p>
      )}
      <p className="mt-3 text-xs text-muted-foreground">
        La aplicación nunca pide ni almacena tu contraseña ni tus tokens.
      </p>
    </section>
  );
}
