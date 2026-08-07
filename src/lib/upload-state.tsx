import { useState, type ReactNode } from "react";
import type { UploadResponse } from "@/lib/api";
import type { VentaRow } from "@/lib/types";
import { UploadStateContext } from "@/lib/upload-context";

export function UploadStateProvider({ children }: { children: ReactNode }) {
  const [rows, setRows] = useState<VentaRow[]>([]);
  const [archivo, setArchivo] = useState<string>();
  const [filasCargadas, setFilasCargadas] = useState<number>();
  const [actualizacion, setActualizacion] = useState(0);

  const registrarDatos = (nuevasFilas: VentaRow[], nombre: string) => {
    setRows(nuevasFilas);
    setArchivo(nombre);
    setFilasCargadas(nuevasFilas.length);
    setActualizacion((version) => version + 1);
  };

  const registrarCarga = (carga: UploadResponse) => {
    setArchivo(carga.archivo);
    setFilasCargadas(carga.filasTotales);
    setActualizacion((version) => version + 1);
  };

  return (
    <UploadStateContext.Provider
      value={{
        rows,
        archivo,
        filasCargadas,
        actualizacion,
        registrarDatos,
        registrarCarga,
      }}
    >
      {children}
    </UploadStateContext.Provider>
  );
}
