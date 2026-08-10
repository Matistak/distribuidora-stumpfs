# Integracion de un chat con Codex

## Objetivo

Agregar a `distribuidora-front` un chat local, similar al chat de T3 Code,
que permita:

- Usar la cuenta de Codex/ChatGPT del usuario.
- Aprovechar la suscripcion del usuario mediante `codex login`.
- Seleccionar el modelo disponible.
- Crear y continuar conversaciones.
- Consultar los datos de ventas de la base de datos.
- Mostrar las respuestas progresivamente mientras se generan.

El alcance es para una sola persona en una computadora. No se necesita una
arquitectura multiusuario, relay remoto ni autenticacion centralizada.

## Arquitectura propuesta

```text
React dentro de Tauri
        |
        | HTTP local + SSE
        v
Fastify local como sidecar
        |
        | JSON-RPC por stdio
        v
Codex app-server
        |
        | MCP local de solo lectura
        v
Prisma + SQLite/PostgreSQL
```

El navegador no debe conectarse directamente a Codex ni manejar sus tokens.
El backend local es el limite de ejecucion y comunica el frontend con Codex y
con la base de datos.

## Autenticacion de Codex

El usuario ejecuta una sola vez:

```bash
codex login
```

El comando abre el navegador para iniciar sesion con ChatGPT. Codex conserva
las credenciales localmente y las usa el CLI, el SDK o `app-server`.

La aplicacion debe:

- Verificar el estado con `codex login status` o `account/read`.
- Mostrar un mensaje claro cuando Codex no este autenticado.
- Ofrecer un boton para abrir las instrucciones de `codex login`.
- No pedir ni almacenar la contrasena de ChatGPT.
- No copiar `~/.codex/auth.json` dentro de la base de la aplicacion.
- No exponer tokens en variables `VITE_*`, logs ni respuestas HTTP.

La autenticacion con una API key es una alternativa distinta. En ese caso el
consumo se factura en OpenAI Platform y no en la suscripcion de ChatGPT.

## Por que usar `app-server`

OpenAI documenta `codex app-server` para integraciones profundas dentro de
productos propios. Para este proyecto solamente se usara una parte pequena de
su protocolo:

| Necesidad | Metodo o evento |
| --- | --- |
| Inicializar la conexion | `initialize`, `initialized` |
| Verificar cuenta | `account/read` |
| Listar modelos | `model/list` |
| Crear conversacion | `thread/start` |
| Listar historial | `thread/list` |
| Leer historial | `thread/read` |
| Continuar conversacion | `thread/resume` |
| Enviar mensaje | `turn/start` |
| Mostrar texto progresivo | `item/agentMessage/delta` |
| Finalizar respuesta | `turn/completed` |
| Cancelar generacion | `turn/interrupt`, opcional |

No se implementaran inicialmente aprobaciones, edicion de archivos, Git,
terminales, subagentes ni herramientas de desarrollo.

El proceso se ejecutara localmente usando el transporte `stdio`, que es el
transporte predeterminado de `app-server`. No se debe exponer un listener
WebSocket de Codex en la red local para este caso.

## SDK, app-server y CLI

### `app-server`

Es la opcion recomendada para este proyecto porque ofrece directamente:

- Threads persistentes.
- Historial.
- Lista de modelos.
- Eventos de streaming.
- Control del ciclo de vida de una conversacion.

### `@openai/codex-sdk`

Es una alternativa mas sencilla para iniciar, continuar y transmitir threads
desde Node.js. Puede ser suficiente para una primera version si se mantiene una
lista fija de modelos y no se necesita controlar directamente todo el
protocolo de eventos.

### `codex exec --json`

Sirve para una prueba de concepto o tareas aisladas. No es la opcion ideal para
un chat persistente porque cada ejecucion se comporta mas como un trabajo
independiente.

### Decision inicial

Usar `codex app-server` como integracion principal. Mantener el SDK como
alternativa si el cliente JSON-RPC resulta innecesariamente complejo para la
primera version.

## Historial de conversaciones

La aplicacion debe relacionar su identificador local con el identificador del
thread de Codex:

```text
ChatConversation
- id
- codexThreadId
- title
- selectedModel
- createdAt
- updatedAt
```

Hay dos alternativas para los mensajes:

1. Usar el historial propio de Codex y leerlo con `thread/read`.
2. Guardar tambien cada mensaje recibido durante el streaming en la base local.

La primera alternativa reduce duplicacion y es suficiente para el MVP. La
segunda ofrece mas control sobre busqueda, exportacion y migraciones futuras.

La recomendacion inicial es guardar metadatos propios y usar el historial de
Codex. Si se necesita una experiencia completamente independiente de Codex,
se puede agregar la persistencia de mensajes despues.

## Seleccion de modelo

En el inicio de la aplicacion:

1. Fastify inicia `app-server`.
2. Solicita `model/list`.
3. Devuelve al frontend los modelos habilitados para la cuenta.
4. React muestra un selector de modelos.
5. El backend valida el modelo seleccionado antes de iniciar cada thread o
   turno.

El frontend debe enviar solamente el identificador del modelo seleccionado. No
debe permitir que el usuario construya parametros arbitrarios para el proceso
de Codex.

Endpoint sugerido:

```text
GET /api/chat/models
```

## Consultas a la base de datos

Codex necesita una herramienta para consultar las ventas. No se le debe
entregar acceso directo a SQL arbitrario.

La opcion recomendada es un MCP local de solo lectura con herramientas como:

- `resumen_ventas`
- `ventas_por_periodo`
- `ventas_por_vendedor`
- `ventas_por_producto`
- `ventas_por_ciudad`
- `comparar_periodos`

Cada herramienta debe:

- Validar sus argumentos con un schema.
- Ejecutar consultas parametrizadas.
- Limitar fechas, filas y agregaciones.
- Reutilizar los servicios actuales de Prisma.
- Ocultar datos sensibles que no sean necesarios.
- Ser de solo lectura.

El MCP puede ejecutarse como proceso local por `stdio`. No necesita OAuth,
relay ni bearer tokens porque todo corre en la misma computadora.

No se debe resolver el problema enviando toda la tabla dentro del prompt. Eso
seria costoso, lento y dificil de controlar. Codex debe solicitar solamente el
agregado necesario para responder la pregunta.

## API local propuesta

### Modelos

```text
GET /api/chat/models
GET /api/chat/conversations
POST /api/chat/conversations
GET /api/chat/conversations/:id
POST /api/chat/conversations/:id/messages
DELETE /api/chat/conversations/:id
```

### Crear conversacion

```json
{
  "model": "modelo-seleccionado",
  "title": "Ventas del mes"
}
```

La respuesta debe incluir el identificador local de la conversacion y el
`codexThreadId` asociado.

### Enviar mensaje

```json
{
  "message": "Compara las ventas de enero y febrero por vendedor"
}
```

La respuesta debe entregarse mediante SSE para poder mostrar los deltas de
texto mientras llegan. Como minimo se necesitan eventos equivalentes a:

```text
message.start
message.delta
message.completed
message.error
```

El frontend no necesita conocer el protocolo interno de Codex. Fastify debe
traducir los eventos de `app-server` a un contrato pequeno y estable para la
aplicacion.

## Reutilizacion de T3 Code

T3 Code tiene licencia MIT, por lo que permite reutilizar codigo conservando
los avisos de copyright y la licencia.

### Reutilizar directamente o adaptar

- `packages/effect-codex-app-server`: schemas y cliente tipado del protocolo.
- `apps/server/src/provider/Layers/CodexAdapter.ts`: ciclo de vida del proceso,
  sesiones y transformacion de eventos.
- `apps/server/src/provider/Layers/CodexSessionRuntime.ts`: manejo de eventos
  del runtime de Codex.
- El patron MCP de `apps/server/src/mcp/`, simplificado para un proceso local.

### No reutilizar inicialmente

- `ChatView` completo.
- `packages/client-runtime` completo.
- Orquestacion event-sourced.
- Auth de pairing, scopes, relay y DPoP.
- Soporte para multiples proveedores.
- Terminales, Git, filesystem y proyectos.
- Clientes web, desktop y mobile de T3.

La interfaz actual de `distribuidora-front` ya tiene React, TanStack Router,
Tailwind y componentes UI suficientes para construir el chat sin copiar la UI
de T3 Code.

## Etapas de implementacion

### Etapa 0: Decisiones previas

Objetivo: dejar definida la base de la integracion.

Tareas:

- Confirmar que la aplicacion seguira siendo local y de un solo usuario.
- Confirmar que Codex CLI estara instalado en el equipo.
- Ejecutar `codex login` y verificar `codex login status`.
- Resolver la contradiccion entre SQLite documentado y PostgreSQL declarado en
  `distribuidora-backend/prisma/schema.prisma`.
- Mantener el backend local escuchando en `127.0.0.1`.
- Elegir si el historial sera propiedad de Codex o tambien de la aplicacion.

Criterio de finalizacion: la base de datos, el modo de autenticacion y el
transporte local estan definidos.

### Etapa 1: Prueba de Codex local

Objetivo: demostrar que el backend puede usar la cuenta del usuario.

Tareas:

- Detectar la instalacion de `codex`.
- Iniciar `codex app-server` mediante `stdio`.
- Implementar `initialize` e `initialized`.
- Ejecutar `account/read`.
- Devolver un error accionable cuando la cuenta no este autenticada.
- Cerrar y reiniciar el proceso de forma controlada.

Criterio de finalizacion: Fastify puede iniciar Codex y confirmar que la cuenta
esta disponible sin exponer credenciales.

### Etapa 2: Cliente minimo de JSON-RPC

Objetivo: encapsular la comunicacion con `app-server`.

Tareas:

- Crear un modulo de proceso Codex.
- Escribir mensajes JSONL en stdin.
- Leer respuestas y notificaciones desde stdout.
- Correlacionar respuestas mediante `id`.
- Publicar las notificaciones de cada thread.
- Manejar desconexion, timeout y proceso terminado.
- Decidir si se adapta `effect-codex-app-server` o se crea un cliente simple
  en TypeScript.

Criterio de finalizacion: existe una interfaz interna pequena para enviar
requests y suscribirse a eventos de Codex.

### Etapa 3: Modelos disponibles

Objetivo: permitir elegir el modelo desde la aplicacion.

Tareas:

- Implementar `model/list`.
- Crear `GET /api/chat/models`.
- Mostrar un selector de modelos en React.
- Validar el modelo en el backend.
- Definir un modelo por defecto.

Criterio de finalizacion: el usuario puede seleccionar un modelo valido antes
de iniciar una conversacion.

### Etapa 4: Conversaciones e historial

Objetivo: crear, listar y continuar chats.

Tareas:

- Implementar `thread/start`.
- Implementar `thread/list` o una tabla local de conversaciones.
- Implementar `thread/read`.
- Implementar `thread/resume`.
- Asociar `codexThreadId` con el identificador local.
- Agregar nombres y fechas de conversacion.
- Definir archivado o eliminacion como funcionalidad posterior.

Criterio de finalizacion: el usuario puede cerrar la aplicacion, volver a
abrirla y continuar una conversacion anterior.

### Etapa 5: Envio y streaming

Objetivo: mostrar respuestas como un chat moderno.

Tareas:

- Implementar `turn/start`.
- Escuchar `item/agentMessage/delta`.
- Escuchar `turn/completed`.
- Traducir eventos de Codex a eventos SSE propios.
- Crear `POST /api/chat/conversations/:id/messages`.
- Mostrar estado de carga, respuesta parcial y errores.
- Agregar cancelacion con `turn/interrupt` si resulta necesaria.

Criterio de finalizacion: el usuario envia una pregunta y ve la respuesta
progresivamente sin esperar a que termine todo el turno.

### Etapa 6: MCP de ventas

Objetivo: permitir que Codex responda usando la base de datos real.

Tareas:

- Crear el proceso MCP local.
- Reutilizar los servicios de consulta de ventas del backend.
- Definir schemas para argumentos de herramientas.
- Implementar inicialmente una herramienta de resumen.
- Agregar consultas por fechas, vendedor, producto y ciudad.
- Limitar resultados y tiempos de ejecucion.
- Configurar `app-server` para usar el MCP por `stdio`.
- Probar preguntas ambiguas y filtros invalidos.

Criterio de finalizacion: Codex puede responder preguntas comerciales usando
agregados reales y no inventa datos cuando una consulta no devuelve resultados.

### Etapa 7: Interfaz del chat

Objetivo: integrar el chat en la aplicacion existente.

Tareas:

- Crear `src/components/chat/ChatPanel.tsx`.
- Crear una ruta `/chat` o un panel lateral global.
- Mostrar conversaciones anteriores.
- Mostrar selector de modelo.
- Mostrar mensajes del usuario y del asistente.
- Mostrar consultas de herramientas de forma resumida.
- Agregar estados vacio, cargando, sin autenticacion y sin backend.
- Adaptar el layout de `src/routes/__root.tsx`.

Criterio de finalizacion: el usuario puede usar el chat sin abrir una terminal
ni interactuar directamente con Codex.

### Etapa 8: Persistencia y empaquetado

Objetivo: que la funcionalidad sobreviva al cierre y al instalador Tauri.

Tareas:

- Persistir conversaciones y configuracion en el directorio de datos de la
  aplicacion.
- No usar `src-tauri/resources` como base activa.
- Resolver la instalacion o deteccion de Codex CLI.
- Verificar rutas de `CODEX_HOME` en desarrollo y produccion.
- Agregar backups si el historial propio se persiste.
- Probar actualizaciones sin perder conversaciones.

Criterio de finalizacion: una aplicacion empaquetada puede iniciar el backend,
encontrar Codex y conservar el historial local.

### Etapa 9: Seguridad y pruebas

Objetivo: cerrar los riesgos antes de usarlo como funcionalidad normal.

Tareas:

- Confirmar que Fastify escuche solo en localhost.
- No permitir SQL arbitrario.
- Mantener todas las herramientas de ventas en modo lectura.
- Validar limites de fechas, filas y tiempos.
- Probar campos de ventas que contengan texto malicioso o instrucciones.
- Evitar enviar datos personales que no sean necesarios.
- Probar falta de autenticacion, logout, expiracion y renovacion de sesion.
- Probar cierre inesperado de `app-server`.
- Probar perdida de red y respuestas incompletas.
- Ejecutar pruebas con bases pequenas y grandes.

Criterio de finalizacion: un error de Codex no puede modificar la base ni
dejar expuestos los tokens del usuario.

## Resultado esperado del MVP

El MVP deberia incluir solamente:

- Login previo mediante `codex login`.
- Estado de autenticacion.
- Lista de modelos.
- Nuevo chat.
- Historial local de conversaciones.
- Continuacion de chats.
- Streaming de respuestas.
- MCP de consultas de ventas de solo lectura.
- Selector de modelo.
- Manejo de errores y reconexion basica.

Quedan fuera del MVP:

- Edicion de archivos.
- Ejecucion de comandos.
- Git.
- Aprobaciones complejas.
- Subagentes.
- Relay remoto.
- Multiples cuentas.
- Multiples usuarios.
- Sincronizacion entre dispositivos.

## Fase 0 - Decisiones tomadas

Estado al 10/08/2026. La base de datos, el modo de autenticacion y el
transporte local quedan definidos, y la cuenta de Codex esta autenticada.
Con esto, la Fase 0 queda cerrada y habilitada la Fase 1.

| Tarea de la Fase 0 | Decision | Estado |
| --- | --- | --- |
| Aplicacion local y single-user | Confirmado. Ya documentado en `BACKEND.md`: una sola persona, una sola computadora. | Completado |
| Instalacion de Codex CLI | Instalado via Homebrew: `codex-cli 0.147.0` en `/opt/homebrew/bin/codex`. | Completado |
| Base de datos | SQLite. `distribuidora-backend/prisma/schema.prisma` declara `provider = "sqlite"`; el documento CHAT-CODEX mencionaba PostgreSQL por error. Se confirma SQLite: en desarrollo `prisma/distribuidora.db`, en produccion el directorio de datos de la app via `bootstrap.ts`. | Completado |
| Backend en 127.0.0.1 | Confirmado. El sidecar actual usa `host: "127.0.0.1"` en `server.ts`. El sidecar de chat usara el mismo host (puerto a definir en Fase 1/2, sin exponer en la red). | Completado |
| Autenticacion de Codex | `codex login` con la cuenta de ChatGPT (suscripcion). `codex login status` confirma: "Logged in using ChatGPT". No se usara API key. Se verifica con `codex login status` y `account/read`. La app jamas almacena ni expone tokens. | Completado |
| Transporte local | Frontend -> Fastify: HTTP + SSE en 127.0.0.1. Fastify -> `app-server`: JSON-RPC por stdio. `app-server` -> MCP de ventas: MCP por stdio. Sin listener de red para Codex. | Completado |
| Historial de conversaciones | Metadatos propios en SQLite (`id`, `codexThreadId`, `title`, `selectedModel`, fechas) + mensajes desde el historial de Codex via `thread/read`. Persistencia completa de mensajes queda descartada para el MVP. | Completado |

### Pendientes de Fase 0 (a cargo del usuario)

```bash
npm install -g @openai/codex
codex login        # abre el navegador para iniciar sesion con ChatGPT
codex login status # debe confirmar que la cuenta esta autenticada
```

No copiar `~/.codex/auth.json` a este repositorio ni exponer tokens en
variables `VITE_*`, logs o respuestas HTTP.

## Fase 1 - Prueba de Codex local

Estado al 10/08/2026. El backend Fastify puede iniciar `codex app-server`,
completar el handshake `initialize`/`initialized` y confirmar la cuenta via
`account/read` sin exponer credenciales. Criterio de finalizacion cumplido.

### Implementacion

Nuevos archivos en `distribuidora-backend`:

- `src/chat/jsonrpc.ts` - cliente minimo JSON-RPC sobre stdio (JSONL):
  escribe requests en stdin, correlaciona respuestas por `id`, publica
  notificaciones, maneja timeout, proceso terminado y cierre con SIGTERM
  seguido de SIGKILL.
- `src/chat/codexService.ts` - ciclo de vida del proceso: deteccion del
  binario (`codex --version`), inicio de `codex app-server`, handshake
  `initialize` + notificacion `initialized`, `account/read` y cierre/
  reinicio controlado.
- `src/routes/chat.ts` - rutas Fastify de la Etapa 1.

Endpoints:

```text
GET  /api/chat/status   — estado: instalado, version, corriendo, cuenta (sin tokens)
POST /api/chat/restart  — cierra y reinicia app-server de forma controlada
```

### Comportamiento verificado

| Caso | Resultado |
| --- | --- |
| Codex instalado y autenticado | `installed: true`, `running: true`, `account: { type: "chatgpt", email, planType }`, `authenticated: true` |
| Codex sin autenticar (CODEX_HOME vacio) | `authenticated: false` con mensaje accionable: "Ejecuta `codex login` ..." |
| Codex no instalado (`CODEX_CLI_COMMAND=codex-inexistente`) | `installed: false` con mensaje de instalacion |
| `POST /api/chat/restart` | Cierra el proceso con SIGTERM y vuelve a iniciarlo en el siguiente request |

La respuesta de `account/read` con `account: null` y `requiresOpenaiAuth: true`
se traduce en `CodexNotAuthenticatedError` con instrucciones de `codex login`.
Nunca se devuelven ni registran tokens ni `~/.codex/auth.json`.

### Notas

- El comando de Codex es configurable con `CODEX_CLI_COMMAND` (util para
  Etapa 8 al resolver rutas de instalacion).
- El cliente JSON-RPC de esta fase es a proposito simple y sin dependencias:
  es la base sobre la que la Etapa 2 decide si adaptar `effect-codex-app-server`
  o mantener este cliente propio.
- El proceso se cierra en `onClose` de Fastify para no dejar huerfanos.

### Pendiente de validacion (usuario)

- Cerrar la aplicacion y confirmar que `codex app-server` tambien termina.
- Ejecutar `npm run dev` en `distribuidora-backend` y consultar
  `GET /api/chat/status` desde la aplicacion.

## Referencias

- [Codex Authentication](https://developers.openai.com/codex/auth)
- [Codex SDK](https://developers.openai.com/codex/codex-sdk)
- [Codex App Server](https://developers.openai.com/codex/app-server)
- [Codex MCP](https://developers.openai.com/codex/extend/mcp)
- [Codex Non-interactive mode](https://developers.openai.com/codex/non-interactive-mode)
- `../t3code/packages/effect-codex-app-server`
- `../t3code/apps/server/src/provider/Layers/CodexAdapter.ts`
- `../t3code/apps/server/src/provider/Layers/CodexSessionRuntime.ts`
- `../t3code/apps/server/src/mcp/`
