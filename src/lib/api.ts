import type { DashboardData, Filtros, OpcionesFiltro, VentaRow } from "./types";

/**
 * ============================================================
 *  CAPA DE API — lista para conectar con el backend
 * ============================================================
 * Definir VITE_API_URL (ej: https://api.midominio.com) para que el
 * dashboard consuma el backend real. Si no esta definida, la app
 * funciona en "modo local" procesando el Excel en el navegador.
 *
 * Endpoints que debe exponer el backend:
 *
 *  POST   /api/uploads                -> multipart/form-data { file } : sube y procesa el Excel
 *  GET    /api/uploads                -> historial de cargas
 *  GET    /api/uploads/:id            -> estado de un procesamiento
 *  GET    /api/dashboard              -> KPIs + series + rankings (query: desde, hasta, vendedor, canal, ciudad, zona)
 *  GET    /api/filtros                -> listas de vendedores / canales / ciudades / zonas
 *  GET    /api/ventas                 -> filas paginadas (query: page, pageSize + filtros)
 */

export const API_URL = (import.meta.env["VITE_API_URL"] as string | undefined) ?? "";
export const backendConectado = () => API_URL.length > 0;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const detalle = await res.text();
    throw new Error(`API ${res.status} en ${path}: ${detalle}`);
  }
  return (await res.json()) as T;
}

const qs = (params: Record<string, string | number | undefined>) => {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") sp.set(k, String(v));
  const s = sp.toString();
  return s ? `?${s}` : "";
};

export type UploadResponse = { id: string; filas: number; estado: "procesado" | "procesando" };
export type UploadHistorial = {
  id: string;
  archivo: string;
  filas: number;
  creadoEn: string;
  estado: string;
};

/** POST /api/uploads */
export function subirExcel(file: File, onProgress?: (pct: number) => void) {
  const form = new FormData();
  form.append("file", file);

  if (!onProgress) return request<UploadResponse>("/api/uploads", { method: "POST", body: form });

  // XHR para poder reportar progreso de subida
  return new Promise<UploadResponse>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_URL}/api/uploads`);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress((e.loaded / e.total) * 100);
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve(JSON.parse(xhr.responseText) as UploadResponse)
        : reject(new Error(`API ${xhr.status}: ${xhr.responseText}`));
    xhr.onerror = () => reject(new Error("Error de red al subir el archivo"));
    xhr.send(form);
  });
}

/** GET /api/uploads */
export const listarCargas = () => request<UploadHistorial[]>("/api/uploads");

/** GET /api/uploads/:id */
export const estadoCarga = (id: string) => request<UploadResponse>(`/api/uploads/${id}`);

/** GET /api/dashboard */
export const obtenerDashboard = (filtros: Filtros & { desde?: string; hasta?: string } = {}) =>
  request<DashboardData>(`/api/dashboard${qs(filtros)}`);

/** GET /api/filtros */
export const obtenerFiltros = () => request<OpcionesFiltro>("/api/filtros");

/** GET /api/ventas */
export const listarVentas = (
  params: Filtros & { page?: number; pageSize?: number } = {},
) => request<{ data: VentaRow[]; total: number }>(`/api/ventas${qs(params)}`);
