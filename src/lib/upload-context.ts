import { createContext } from "react";
import type { UploadResponse } from "@/lib/api";
import type { VentaRow } from "@/lib/types";

export type UploadState = {
  rows: VentaRow[];
  archivo: string | undefined;
  filasCargadas: number | undefined;
  actualizacion: number;
  registrarDatos: (rows: VentaRow[], nombre: string) => void;
  registrarCarga: (carga: UploadResponse) => void;
};

export const UploadStateContext = createContext<UploadState | null>(null);
