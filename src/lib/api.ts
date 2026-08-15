import type {
  AlertasData,
  ClientesData,
  DetalleAlerta,
  DashboardData,
  Filtros,
  OpcionesFiltro,
  ResumenData,
  VentaRow,
  VendedoresData,
} from "./types";

/**
 * ============================================================
 *  CAPA DE API — compatible con modo mock y backend
 * ============================================================
 * El modo se selecciona con el comando de Vite. En modo mock la app procesa
 * el Excel en el navegador; en modo back consume VITE_API_URL.
 *
 * Endpoints que debe exponer el backend:
 *
 *  POST   /api/uploads                -> multipart/form-data { file } : sube y procesa el Excel
 *  GET    /api/uploads                -> historial de cargas
 *  GET    /api/uploads/:id            -> estado de un procesamiento
 *  GET    /api/dashboard              -> KPIs + series + rankings (query: desde, hasta, cliente, vendedor, canal, ciudad, zona)
 *  GET    /api/dashboard/alertas/:clave -> filas que explican una alerta (mismos filtros)
 *  GET    /api/dashboard/alertas      -> alertas de caída/crecimiento (query: cliente, vendedor, canal, ciudad, zona)
 *  GET    /api/filtros              -> listas de clientes / vendedores / canales / ciudades / zonas
 *  GET    /api/clientes               -> búsqueda de clientes por nombre (query: q, limite)
 *  GET    /api/clientes/resumen       -> KPIs + resumen agregado por cliente (query: fechas + filtros)
 *  GET    /api/ventas                 -> filas paginadas (query: page, pageSize, fechas + filtros)
 *  GET    /api/vendedores             -> KPIs + resumen agregado por vendedor (query: fechas + vendedor + cliente)
 */

export type AppMode = "mock" | "back";

export const APP_MODE: AppMode = import.meta.env["VITE_APP_MODE"] === "back" ? "back" : "mock";
export const API_URL =
  APP_MODE === "back" ? ((import.meta.env["VITE_API_URL"] as string | undefined) ?? "") : "";
export const backendConectado = () => API_URL.length > 0;

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(
      status >= 500
        ? "El servidor no pudo completar la solicitud. Intentá nuevamente."
        : status === 401 || status === 403
          ? "No tenés permisos para realizar esta acción."
          : status === 404
            ? "No se encontró la información solicitada."
            : status === 400
              ? "La solicitud no es válida. Revisá los filtros e intentá nuevamente."
              : "No se pudo completar la solicitud. Intentá nuevamente.",
    );
    this.name = "ApiError";
    this.status = status;
  }
}

export class NetworkError extends Error {
  constructor() {
    super(
      "No se pudo conectar con el servidor. Verificá que esté disponible e intentá nuevamente.",
    );
    this.name = "NetworkError";
  }
}

export function mensajeError(error: unknown, fallback: string): string {
  if (error instanceof ApiError || error instanceof NetworkError) return error.message;
  if (error instanceof Error && error.message === "El archivo no contiene filas") {
    return error.message;
  }
  return fallback;
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        // No declarar JSON en solicitudes sin cuerpo: Fastify rechaza un
        // DELETE vacio con `Content-Type: application/json` antes de enrutarlo.
        ...(init?.body !== undefined && !(init.body instanceof FormData)
          ? { "Content-Type": "application/json" }
          : {}),
        ...(init?.headers ?? {}),
      },
    });
  } catch {
    throw new NetworkError();
  }

  if (!res.ok) {
    // El cuerpo puede contener trazas, rutas y detalles internos del servidor.
    throw new ApiError(res.status);
  }
  return (await res.json()) as T;
}

const qs = (params: Record<string, string | number | undefined>) => {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params))
    if (v !== undefined && v !== "") sp.set(k, String(v));
  const s = sp.toString();
  return s ? `?${s}` : "";
};

export type UploadResponse = {
  id: number;
  archivo: string;
  filasTotales: number;
  filasNuevas: number;
  filasOmitidas: number;
  filasErrores: number;
  errores: UploadRowError[];
  estado: string;
};
export type UploadRowError = {
  fila: number;
  motivo: string;
};
export type UploadHistorial = {
  id: number;
  archivo: string;
  filasTotales: number;
  filasNuevas: number;
  filasOmitidas: number;
  filasErrores: number;
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
        : reject(new ApiError(xhr.status));
    xhr.onerror = () => reject(new NetworkError());
    xhr.send(form);
  });
}

/** GET /api/uploads */
export const listarCargas = () => request<UploadHistorial[]>("/api/uploads");

/** GET /api/uploads/:id */
export const estadoCarga = (id: number) => request<UploadHistorial>(`/api/uploads/${id}`);

/** GET /api/dashboard */
export const obtenerDashboard = (filtros: Filtros & { desde?: string; hasta?: string } = {}) =>
  request<DashboardData>(`/api/dashboard${qs(filtros)}`);

export const obtenerResumen = (filtros: Filtros = {}) => {
  const { cliente, vendedor, canal, ciudad, zona } = filtros;
  return request<ResumenData>(
    `/api/dashboard/resumen${qs({ cliente, vendedor, canal, ciudad, zona })}`,
  );
};

/** GET /api/dashboard/alertas */
export const obtenerAlertas = (filtros: Filtros = {}) => {
  const { cliente, vendedor, canal, ciudad, zona } = filtros;
  return request<AlertasData>(
    `/api/dashboard/alertas${qs({ cliente, vendedor, canal, ciudad, zona })}`,
  );
};

/** GET /api/dashboard/alertas/:clave */
export const obtenerDetalleAlerta = (clave: string, filtros: Filtros = {}) => {
  const { cliente, vendedor, canal, ciudad, zona } = filtros;
  return request<DetalleAlerta>(
    `/api/dashboard/alertas/${encodeURIComponent(clave)}${qs({ cliente, vendedor, canal, ciudad, zona })}`,
  );
};

/** GET /api/filtros */
export const obtenerFiltros = () => request<OpcionesFiltro>("/api/filtros");

/** GET /api/clientes — búsqueda de clientes por nombre */
export const buscarClientes = (q: string, limite = 50) =>
  request<string[]>(`/api/clientes${qs({ q, limite })}`);

/** GET /api/clientes/resumen */
export const obtenerClientesResumen = (filtros: Filtros & { desde?: string; hasta?: string } = {}) =>
  request<ClientesData>(`/api/clientes/resumen${qs(filtros)}`);

/** GET /api/ventas */
export const listarVentas = (params: Filtros & { page?: number; pageSize?: number } = {}) =>
  request<{ data: VentaRow[]; total: number }>(`/api/ventas${qs(params)}`);

/** GET /api/vendedores */
export const obtenerVendedores = (filtros: Filtros & { desde?: string; hasta?: string } = {}) =>
  request<VendedoresData>(`/api/vendedores${qs(filtros)}`);
