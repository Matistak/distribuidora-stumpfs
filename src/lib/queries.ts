import { useEffect, useRef } from "react";
import { queryOptions, type QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  listarVentas,
  buscarClientes,
  mensajeError,
  obtenerDashboard,
  obtenerFiltros,
  obtenerVendedores,
} from "./api";
import {
  obtenerConversacionChat,
  obtenerConversacionesChat,
  obtenerEstadoChat,
  obtenerModelosChat,
  type ChatModel,
  type ChatStatus,
} from "./chat";
import type { Filtros } from "./types";

/**
 * Dashboard con los filtros aplicados. Se cachea por sesión: solo se
 * consulta la primera vez (al iniciar la app) o cuando se invalida tras una
 * carga de Excel; al navegar de vuelta se sirve desde la caché.
 */
export const dashboardQueryOptions = (filtros: Filtros) =>
  queryOptions({
    queryKey: ["dashboard", filtros] as const,
    queryFn: () => obtenerDashboard(filtros),
    staleTime: Infinity,
    gcTime: Infinity,
  });

/** Listas de opciones para los selectores de filtro. */
export const filtrosQueryOptions = () =>
  queryOptions({
    queryKey: ["filtros"] as const,
    queryFn: () => obtenerFiltros(),
  });

/** Primeras coincidencias de clientes para el selector con búsqueda remota. */
export const clientesQueryOptions = (busqueda: string) =>
  queryOptions({
    queryKey: ["clientes", busqueda] as const,
    queryFn: () => buscarClientes(busqueda),
  });

/** Filas de ventas paginadas. */
export const ventasQueryOptions = (filtros: Filtros, page: number, pageSize: number) =>
  queryOptions({
    queryKey: ["ventas", filtros, page, pageSize] as const,
    queryFn: () => listarVentas({ ...filtros, page, pageSize }),
  });

/** Resumen agregado por vendedor. */
export const vendedoresQueryOptions = (filtros: Filtros) =>
  queryOptions({
    queryKey: ["vendedores", filtros] as const,
    queryFn: () => obtenerVendedores(filtros),
  });

/** Estado de Codex + modelos disponibles. */
export type ChatEstadoData = {
  status: ChatStatus;
  modelos: ChatModel[];
  defaultModel: string | null;
};

export const chatEstadoQueryOptions = () =>
  queryOptions({
    queryKey: ["chat", "estado"] as const,
    queryFn: async (): Promise<ChatEstadoData> => {
      const [status, modelos] = await Promise.all([obtenerEstadoChat(), obtenerModelosChat()]);
      return { status, modelos: modelos.models, defaultModel: modelos.defaultModel };
    },
  });

/** Historial de conversaciones del chat. */
export const conversacionesQueryOptions = () =>
  queryOptions({
    queryKey: ["chat", "conversaciones"] as const,
    queryFn: async () => {
      const { conversations } = await obtenerConversacionesChat();
      return conversations;
    },
  });

/** Detalle (metadatos + mensajes) de una conversación. */
export const conversacionQueryOptions = (id: number | null) =>
  queryOptions({
    queryKey: ["chat", "conversacion", id] as const,
    queryFn: () => obtenerConversacionChat(id as number),
    enabled: id !== null,
  });

/** Invalida las consultas de datos comerciales (tras una carga de Excel). */
export async function invalidarDatosComerciales(queryClient: QueryClient) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
    queryClient.invalidateQueries({ queryKey: ["filtros"] }),
    queryClient.invalidateQueries({ queryKey: ["ventas"] }),
    queryClient.invalidateQueries({ queryKey: ["vendedores"] }),
  ]);
}

/** Muestra un toast una sola vez por error distinto de una query. */
export function useQueryErrorToast(
  query: { isError: boolean; error: unknown },
  titulo: string,
  fallback: string,
) {
  const ultimoErrorRef = useRef<unknown>(null);
  useEffect(() => {
    if (query.isError && ultimoErrorRef.current !== query.error) {
      ultimoErrorRef.current = query.error;
      toast.error(titulo, { description: mensajeError(query.error, fallback) });
    }
  }, [query.isError, query.error, titulo, fallback]);
}
