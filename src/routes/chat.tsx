import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Bot, Loader2, RefreshCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { backendConectado, mensajeError } from "@/lib/api";
import {
  CHAT_MODEL_KEY,
  cancelarTurnoChat,
  crearConversacionChat,
  enviarMensajeChat,
  nombreHerramienta,
  obtenerConversacionChat,
  obtenerConversacionesChat,
  obtenerEstadoChat,
  obtenerModelosChat,
  reiniciarCodex,
  type ChatConversacion,
  type ChatConversacionDetalle,
  type ChatMensaje,
  type ChatModel,
  type ChatSseEvent,
  type ChatStatus,
} from "@/lib/chat";

export const Route = createFileRoute("/chat")({
  component: ChatPage,
});

function ChatPage() {
  const backend = backendConectado();
  const [status, setStatus] = useState<ChatStatus | null>(null);
  const [modelos, setModelos] = useState<ChatModel[]>([]);
  const [defaultModel, setDefaultModel] = useState<string | null>(null);
  const [seleccionado, setSeleccionado] = useState<string | null>(() =>
    localStorage.getItem(CHAT_MODEL_KEY),
  );
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string>();
  const [reinicando, setReiniciando] = useState(false);

  const [conversaciones, setConversaciones] = useState<ChatConversacion[]>([]);
  const [conversacionesCargando, setConversacionesCargando] = useState(false);
  const [conversacionesError, setConversacionesError] = useState<string>();
  const [creando, setCreando] = useState(false);

  const [seleccionadoId, setSeleccionadoId] = useState<number | null>(null);
  const [detalle, setDetalle] = useState<ChatConversacionDetalle | null>(null);
  const [detalleCargando, setDetalleCargando] = useState(false);
  const [detalleError, setDetalleError] = useState<string>();

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

  useEffect(() => {
    if (!backend) {
      setCargando(false);
      return;
    }

    let activo = true;
    setCargando(true);
    setError(undefined);

    Promise.all([obtenerEstadoChat(), obtenerModelosChat()])
      .then(([estado, respuesta]) => {
        if (!activo) return;
        setStatus(estado);
        setModelos(respuesta.models);
        setDefaultModel(respuesta.defaultModel);
      })
      .catch((cause: unknown) => {
        if (activo) setError(mensajeError(cause, "No se pudo conectar con el chat."));
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, [backend]);

  useEffect(() => {
    if (!backend || !status?.authenticated) return;

    let activo = true;
    setConversacionesCargando(true);
    setConversacionesError(undefined);

    obtenerConversacionesChat()
      .then(({ conversations }) => {
        if (activo) setConversaciones(conversations);
      })
      .catch((cause: unknown) => {
        if (activo)
          setConversacionesError(mensajeError(cause, "No se pudieron cargar las conversaciones."));
      })
      .finally(() => {
        if (activo) setConversacionesCargando(false);
      });

    return () => {
      activo = false;
    };
  }, [backend, status?.authenticated]);

  useEffect(() => {
    if (seleccionadoId === null) return;

    let activo = true;
    setDetalleCargando(true);
    setDetalleError(undefined);

    obtenerConversacionChat(seleccionadoId)
      .then((detalle) => {
        if (!activo) return;
        setDetalle(detalle);
        setConversaciones((prev) =>
          prev.map((c) => (c.id === detalle.conversation.id ? detalle.conversation : c)),
        );
      })
      .catch((cause: unknown) => {
        if (activo) setDetalleError(mensajeError(cause, "No se pudo leer la conversación."));
      })
      .finally(() => {
        if (activo) setDetalleCargando(false);
      });

    return () => {
      activo = false;
    };
  }, [seleccionadoId]);

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
      setConversaciones((prev) =>
        prev.map((c) => (c.id === conversacionId ? nuevo.conversation : c)),
      );
      if (seleccionadoRef.current === conversacionId) setDetalle(nuevo);
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

  const reiniciar = async () => {
    if (reinicando) return;
    setReiniciando(true);
    setError(undefined);
    try {
      await reiniciarCodex();
      const [estado, respuesta] = await Promise.all([obtenerEstadoChat(), obtenerModelosChat()]);
      setStatus(estado);
      setModelos(respuesta.models);
      setDefaultModel(respuesta.defaultModel);
    } catch (cause: unknown) {
      setError(mensajeError(cause, "No se pudo reiniciar Codex."));
    } finally {
      setReiniciando(false);
    }
  };

  const crearConversacion = async () => {
    if (creando || !modeloElegido) return;
    setCreando(true);
    setConversacionesError(undefined);
    try {
      const { conversation } = await crearConversacionChat({ model: modeloElegido });
      const { conversations } = await obtenerConversacionesChat();
      setConversaciones(conversations);
      setSeleccionadoId(conversation.id);
    } catch (cause: unknown) {
      setConversacionesError(mensajeError(cause, "No se pudo crear la conversación."));
    } finally {
      setCreando(false);
    }
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
              onClick={reiniciar}
              disabled={reinicando}
            >
              {reinicando ? <Loader2 className="size-4 animate-spin" /> : <RefreshCcw />}
              Reintentar
            </Button>
          </section>
        )}

        {backend && !cargando && !error && status && (
          <>
            <EstadoCodex status={status} reiniciando={reinicando} onReiniciar={reiniciar} />

            {!status.installed && <InstruccionesInstalacion />}

            {status.installed && !status.authenticated && <InstruccionesLogin />}

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
                onCrear={crearConversacion}
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

function InstruccionesInstalacion() {
  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-card">
      <h2 className="text-sm font-semibold">Codex CLI no está instalado</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Instalá la CLI de Codex y luego iniciá sesión con tu cuenta de ChatGPT:
      </p>
      <pre className="mt-3 overflow-x-auto rounded-lg bg-muted p-3 text-xs text-foreground">
        npm install -g @openai/codex{`\n`}codex login
      </pre>
    </section>
  );
}

function InstruccionesLogin() {
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
      <p className="mt-3 text-xs text-muted-foreground">
        La aplicación nunca pide ni almacena tu contraseña ni tus tokens.
      </p>
    </section>
  );
}
