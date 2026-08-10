import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Bot, Loader2, RefreshCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { backendConectado, mensajeError } from "@/lib/api";
import {
  CHAT_MODEL_KEY,
  obtenerEstadoChat,
  obtenerModelosChat,
  reiniciarCodex,
  type ChatModel,
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
              <section className="rounded-xl border border-border bg-card p-5 shadow-card">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold">Modelo del asistente</h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Elegí el modelo que responderá tus consultas. El chat estará disponible en la
                      próxima etapa.
                    </p>
                  </div>
                </div>

                <div className="mt-4 max-w-md space-y-3">
                  <Select
                    {...(modeloElegido ? { value: modeloElegido } : {})}
                    onValueChange={cambiarModelo}
                    disabled={!modelos.length}
                  >
                    <SelectTrigger className="w-full text-sm">
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

                  {modeloActual && (
                    <p className="text-xs text-muted-foreground">{modeloActual.description}</p>
                  )}

                  {!modelos.length && (
                    <p className="text-xs text-muted-foreground">
                      No hay modelos disponibles para la cuenta.
                    </p>
                  )}
                </div>
              </section>
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
