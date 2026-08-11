import { API_URL, ApiError, NetworkError, request } from "./api";

/**
 * Cliente del chat con Codex (Etapa 3+).
 *
 * El frontend solo conoce el contrato pequeno y estable de la aplicacion:
 * estado, modelos, conversaciones y eventos SSE. El backend local traduce
 * entre este contrato y el protocolo de `codex app-server`.
 */

export type ChatModel = {
  id: string;
  displayName: string;
  description: string;
};

export type ChatModelsResponse = {
  models: ChatModel[];
  defaultModel: string | null;
  /** Resultado de validar el modelo enviado en la consulta, o `null` si no se consulto. */
  valid: boolean | null;
};

export type ChatAccount = {
  type: "chatgpt" | "apiKey" | "amazonBedrock" | "unknown";
  email?: string | null;
  planType?: string | null;
};

export type ChatStatus = {
  installed: boolean;
  version?: string;
  running: boolean;
  account: ChatAccount | null;
  authenticated: boolean;
  error?: string;
};

export type ChatConversacion = {
  id: number;
  codexThreadId: string;
  title: string;
  selectedModel: string;
  createdAt: string;
  updatedAt: string;
};

/** Consulta a una herramienta (MCP de ventas) resumida para mostrar en la UI. */
export type ChatToolCall = {
  server: string;
  tool: string;
  status: "inProgress" | "completed" | "failed";
  error?: string | null;
};

export type ChatMensaje = {
  id: string;
  role: "user" | "assistant";
  text: string;
  /** Timestamp en ms del turno al que pertenece el item, si se conoce. */
  createdAt?: number;
  /** Consultas a herramientas del turno, en orden de ejecución. */
  toolCalls?: ChatToolCall[];
};

/** Nombres legibles de las herramientas del MCP de ventas (Etapa 7). */
const NOMBRES_HERRAMIENTAS: Record<string, string> = {
  resumen_ventas: "Resumen de ventas",
  ventas_por_periodo: "Ventas por período",
  ventas_por_vendedor: "Ventas por vendedor",
  ventas_por_producto: "Ventas por producto",
  ventas_por_ciudad: "Ventas por ciudad",
  comparar_periodos: "Comparar períodos",
};

/** Nombre legible de una herramienta del MCP de ventas (con fallback). */
export const nombreHerramienta = (tool: string): string => NOMBRES_HERRAMIENTAS[tool] ?? tool;

export type ChatConversacionDetalle = {
  conversation: ChatConversacion;
  messages: ChatMensaje[];
  preview: string;
};

/** Clave en localStorage del modelo seleccionado por el usuario. */
export const CHAT_MODEL_KEY = "chat.selectedModel";

/** GET /api/chat/models — modelos visibles, default y validacion opcional. */
export const obtenerModelosChat = (model?: string) =>
  request<ChatModelsResponse>(
    `/api/chat/models${model ? `?model=${encodeURIComponent(model)}` : ""}`,
  );

/** GET /api/chat/status — estado de Codex (instalado, cuenta, sin tokens). */
export const obtenerEstadoChat = () => request<ChatStatus>("/api/chat/status");

/** POST /api/chat/restart — reinicia el proceso app-server de Codex. */
export const reiniciarCodex = async () => {
  await request<{ restarted: boolean }>("/api/chat/restart", { method: "POST" });
};

/** GET /api/chat/conversations — historial local de conversaciones. */
export const obtenerConversacionesChat = () =>
  request<{ conversations: ChatConversacion[] }>("/api/chat/conversations");

/** POST /api/chat/conversations — crea una conversacion con el modelo indicado. */
export const crearConversacionChat = (input: { model: string; title?: string }) =>
  request<{ conversation: ChatConversacion }>("/api/chat/conversations", {
    method: "POST",
    body: JSON.stringify(input),
  });

/** GET /api/chat/conversations/:id — metadatos + mensajes desde el historial de Codex. */
export const obtenerConversacionChat = (id: number) =>
  request<ChatConversacionDetalle>(`/api/chat/conversations/${id}`);

/** POST /api/chat/conversations/:id/resume — reanuda el thread de Codex. */
export const reanudarConversacionChat = (id: number, model?: string) =>
  request<{ conversation: ChatConversacion }>(`/api/chat/conversations/${id}/resume`, {
    method: "POST",
    body: JSON.stringify(model ? { model } : {}),
  });

/**
 * Eventos SSE del turno (Etapa 5). `message.start` incluye el `turnId` para
 * poder cancelar con `turn/interrupt`.
 */
export type ChatSseEvent =
  | { event: "message.start"; data: { turnId: string | null } }
  | { event: "message.delta"; data: { text: string } }
  | { event: "message.tool_call"; data: { server: string; tool: string } }
  | { event: "message.completed"; data: { turnId: string } }
  | { event: "message.error"; data: { message: string } };

/**
 * POST /api/chat/conversations/:id/messages — envia un mensaje y lee la
 * respuesta progresivamente (SSE). Llama `onEvent` por cada evento recibido;
 * resuelve cuando el stream termina. Se puede abortar con `signal`.
 */
export async function enviarMensajeChat(
  id: number,
  message: string,
  onEvent: (event: ChatSseEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/chat/conversations/${id}/messages`, {
      method: "POST",
      headers: {
        Accept: "text/event-stream",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message }),
      ...(signal ? { signal } : {}),
    });
  } catch {
    throw new NetworkError();
  }

  if (!res.ok) throw new ApiError(res.status);
  if (!res.body) throw new NetworkError();

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const emit = (event: string, data: string) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(data);
    } catch {
      return;
    }
    switch (event) {
      case "message.start":
        onEvent({ event, data: parsed as { turnId: string | null } });
        break;
      case "message.delta":
        onEvent({ event, data: parsed as { text: string } });
        break;
      case "message.tool_call":
        onEvent({ event, data: parsed as { server: string; tool: string } });
        break;
      case "message.completed":
        onEvent({ event, data: parsed as { turnId: string } });
        break;
      case "message.error":
        onEvent({ event, data: parsed as { message: string } });
        break;
    }
  };

  for (;;) {
    let chunk: ReadableStreamReadResult<Uint8Array>;
    try {
      chunk = await reader.read();
    } catch {
      throw new NetworkError();
    }
    if (chunk.done) break;
    buffer += decoder.decode(chunk.value, { stream: true });

    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";
    for (const frame of frames) {
      let event = "message";
      let data = "";
      for (const line of frame.split("\n")) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        else if (line.startsWith("data:")) data += line.slice(5).trim();
      }
      if (data) emit(event, data);
    }
  }
}

/** POST /api/chat/conversations/:id/cancel — interrumpe el turno en curso. */
export const cancelarTurnoChat = (id: number, turnId: string) =>
  request<{ canceled: boolean }>(`/api/chat/conversations/${id}/cancel`, {
    method: "POST",
    body: JSON.stringify({ turnId }),
  });
