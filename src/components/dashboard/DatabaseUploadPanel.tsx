import { useEffect, useState } from "react";
import { Database, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  backendConectado,
  cargarDesdeBase,
  mensajeError,
  obtenerOrigenBase,
  type OrigenBase,
  type UploadResponse,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import { formatoDuracion, ResumenCargaView, type ResumenCarga } from "./CargaResumen";

const ESTADOS_CON_ERROR = ["error", "fallido", "fallida", "rechazado", "rechazada"];
const MESES_POR_DEFECTO = 1;

/** YYYY-MM en hora local, para que "este mes" sea el del usuario y no el UTC. */
function aMesLocal(fecha: Date) {
  const mes = `${fecha.getMonth() + 1}`.padStart(2, "0");
  return `${fecha.getFullYear()}-${mes}`;
}

/** Último mes. Se calcula acá: preguntarle el rango a la vista cuesta ~30s. */
function rangoPorDefecto() {
  const hasta = new Date();
  const desde = new Date(hasta);
  desde.setMonth(desde.getMonth() - (MESES_POR_DEFECTO - 1));
  return { desde: aMesLocal(desde), hasta: aMesLocal(hasta) };
}

export function DatabaseUploadPanel({
  onCarga,
  className,
}: {
  onCarga?: (carga: UploadResponse) => void | Promise<void>;
  className?: string;
}) {
  const backend = backendConectado();
  const [origen, setOrigen] = useState<OrigenBase>();
  const [errorOrigen, setErrorOrigen] = useState<string>();
  const [inicial] = useState(rangoPorDefecto);
  const [desde, setDesde] = useState(inicial.desde);
  const [hasta, setHasta] = useState(inicial.hasta);
  const [cargando, setCargando] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const [resumen, setResumen] = useState<ResumenCarga>();

  // Contador de espera: la vista de origen puede tardar minutos, así que se
  // muestra el tiempo transcurrido para que la pantalla no parezca colgada.
  useEffect(() => {
    if (!cargando) return;
    const inicio = Date.now();
    const id = window.setInterval(() => {
      setSegundos(Math.floor((Date.now() - inicio) / 1000));
    }, 1000);
    return () => window.clearInterval(id);
  }, [cargando]);

  useEffect(() => {
    if (!backend) return;
    let vigente = true;
    void (async () => {
      try {
        // Sólo consulta si el servidor tiene el origen configurado. No abre
        // conexión contra la vista: eso ocurre únicamente al pedir la carga.
        const info = await obtenerOrigenBase();
        if (!vigente) return;
        setOrigen(info);
        setErrorOrigen(undefined);
      } catch (e) {
        if (!vigente) return;
        setErrorOrigen(mensajeError(e, "No se pudo verificar la base de datos de origen."));
      }
    })();
    return () => {
      vigente = false;
    };
  }, [backend]);

  const rangoInvalido = Boolean(desde && hasta && desde > hasta);
  const disponible = backend && origen?.configurado === true && !errorOrigen;
  const deshabilitado = !disponible || cargando || !desde || !hasta || rangoInvalido;

  async function actualizar() {
    setCargando(true);
    setSegundos(0);
    setResumen(undefined);
    const inicio = Date.now();
    const duracionSegundos = () => (Date.now() - inicio) / 1000;
    try {
      const carga = await cargarDesdeBase(desde, hasta);
      const errores = Array.isArray(carga.errores) ? carga.errores : [];
      const estado = carga.estado.trim().toLowerCase();
      const tieneError = ESTADOS_CON_ERROR.some((palabra) => estado.includes(palabra));

      await onCarga?.(carga);
      setResumen({
        correcta: !tieneError,
        filasNuevas: carga.filasNuevas,
        filasReemplazadas: carga.filasReemplazadas ?? 0,
        ...(carga.rango ? { rango: carga.rango } : {}),
        filasErrores: carga.filasErrores,
        sinErrores: !tieneError,
        errores,
        ...(carga.erroresTruncados ? { erroresTruncados: true } : {}),
        duracionSegundos: duracionSegundos(),
        ...(tieneError ? { detalleError: `Estado recibido: ${carga.estado}` } : {}),
        ...(carga.truncado
          ? {
              aviso:
                "Se alcanzó el límite de filas configurado en el servidor. Acotá el rango de meses para traer el resto.",
            }
          : {}),
      });
      if (tieneError) {
        toast.error("La actualización terminó con errores", {
          description: `${carga.filasErrores.toLocaleString("es-PY")} filas no válidas`,
        });
      } else {
        toast.success(`${carga.filasNuevas.toLocaleString("es-PY")} filas nuevas procesadas`, {
          description: `Tardó ${formatoDuracion(duracionSegundos())}`,
        });
      }
    } catch (e) {
      const detalleError = mensajeError(
        e,
        "No se pudieron traer los datos de la base. Revisá la conexión e intentá nuevamente.",
      );
      setResumen({
        correcta: false,
        filasNuevas: 0,
        filasReemplazadas: 0,
        filasErrores: 0,
        sinErrores: false,
        errores: [],
        duracionSegundos: duracionSegundos(),
        detalleError,
      });
      toast.error("No se pudo actualizar desde la base", { description: detalleError });
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className={cn("rounded-xl border border-border bg-card p-6 shadow-card", className)}>
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
          {cargando ? <Loader2 className="size-5 animate-spin" /> : <Database className="size-5" />}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold">Actualizar desde la base de datos</p>
          <p className="text-xs text-muted-foreground">
            Trae las ventas de los meses seleccionados directamente desde la base de origen.
          </p>
          {origen?.tabla ? (
            <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground">
              {origen.tabla}
            </p>
          ) : null}
        </div>
      </div>

      {!backend ? (
        <Aviso texto="Esta opción requiere el backend conectado. En modo mock sólo está disponible la carga por Excel." />
      ) : errorOrigen ? (
        <Aviso texto={errorOrigen} />
      ) : origen && !origen.configurado ? (
        <Aviso texto="El servidor no tiene configurada la conexión con la base de datos de origen (VENTAS_SOURCE_URL)." />
      ) : null}

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <label className="flex min-w-0 flex-col gap-1.5 text-xs font-semibold text-foreground">
          <span className="text-muted-foreground">Mes desde</span>
          <Input
            type="month"
            value={desde}
            disabled={cargando}
            max={hasta || undefined}
            onChange={(event) => setDesde(event.target.value)}
            className="h-10 w-full bg-background text-sm"
            aria-label="Mes desde"
          />
        </label>
        <label className="flex min-w-0 flex-col gap-1.5 text-xs font-semibold text-foreground">
          <span className="text-muted-foreground">Mes hasta</span>
          <Input
            type="month"
            value={hasta}
            disabled={cargando}
            min={desde || undefined}
            onChange={(event) => setHasta(event.target.value)}
            className="h-10 w-full bg-background text-sm"
            aria-label="Mes hasta"
          />
        </label>
      </div>

      {rangoInvalido ? (
        <p className="mt-2 text-xs text-destructive">
          El mes desde no puede ser posterior al mes hasta.
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button disabled={deshabilitado} onClick={() => void actualizar()}>
          <RefreshCw className={cn(cargando && "animate-spin")} />
          {cargando ? `Actualizando… ${formatoEspera(segundos)}` : "Actualizar datos"}
        </Button>
        <p className="text-xs text-muted-foreground">
          {cargando
            ? `Consultando la base de origen hace ${formatoEspera(segundos)}. Puede tardar varios minutos con rangos amplios.`
            : "La base se consulta al presionar el botón. Las filas ya existentes se omiten."}
        </p>
      </div>

      {resumen ? <ResumenCargaView resumen={resumen} /> : null}
    </div>
  );
}

/** Segundos transcurridos como `12 s` o `2:05` cuando pasa el minuto. */
function formatoEspera(segundos: number) {
  if (segundos < 60) return `${segundos} s`;
  return `${Math.floor(segundos / 60)}:${`${segundos % 60}`.padStart(2, "0")}`;
}

function Aviso({ texto }: { texto: string }) {
  return (
    <p className="mt-4 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning-foreground">
      {texto}
    </p>
  );
}
