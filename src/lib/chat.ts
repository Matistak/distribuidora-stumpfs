import { request } from "./api";

/**
 * Cliente del chat con Codex (Etapa 3+).
 *
 * El frontend solo conoce el contrato pequeno y estable de la aplicacion:
 * estado, modelos y (en Etapas 4/5) conversaciones y SSE. El backend local
 * traduce entre este contrato y el protocolo de `codex app-server`.
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
