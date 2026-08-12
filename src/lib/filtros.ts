import type { Dispatch, SetStateAction } from "react";
import dayjs from "dayjs";
import type { Filtros } from "./types";

/** Filtro por defecto: desde el 1° de enero hasta hoy (YYYY-MM-DD). */
export function filtroAnioVigente(): Filtros {
  const hoy = dayjs();
  return {
    desde: hoy.startOf("year").format("YYYY-MM-DD"),
    hasta: hoy.format("YYYY-MM-DD"),
  };
}

/**
 * Setter de fecha que impide dejar el rango vacío: si el usuario borra el
 * valor, se conserva el anterior. Evita consultas sin filtro de fechas
 * (full scan de la tabla completa).
 */
export function setFechaProtegida(
  key: "desde" | "hasta",
  valor: string,
  setFiltros: Dispatch<SetStateAction<Filtros>>,
) {
  setFiltros((prev) => ({ ...prev, [key]: valor || prev[key] }));
}
