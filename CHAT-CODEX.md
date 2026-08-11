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

- [x] Objetivo: dejar definida la base de la integracion.
  - [x] Confirmar que la aplicacion seguira siendo local y de un solo usuario.
  - [x] Confirmar que Codex CLI estara instalado en el equipo.
  - [x] Ejecutar `codex login` y verificar `codex login status`.
  - [x] Resolver la contradiccion entre SQLite documentado y PostgreSQL declarado en
    `distribuidora-backend/prisma/schema.prisma`.
  - [x] Mantener el backend local escuchando en `127.0.0.1`.
  - [x] Elegir si el historial sera propiedad de Codex o tambien de la aplicacion.

  > **Comentario (10/08/2026):** todas las decisiones cerradas. La contradiccion
  > SQLite/PostgreSQL se resolvio a favor de SQLite (la mencion de PostgreSQL era
  > un error del documento). Detalle por tarea en la tabla de
  > [Fase 0](#fase-0---decisiones-tomadas). Criterio cumplido: base, autenticacion
  > y transporte local definidos.

### Etapa 1: Prueba de Codex local

- [x] Objetivo: demostrar que el backend puede usar la cuenta del usuario.
  - [x] Detectar la instalacion de `codex`.
  - [x] Iniciar `codex app-server` mediante `stdio`.
  - [x] Implementar `initialize` e `initialized`.
  - [x] Ejecutar `account/read`.
  - [x] Devolver un error accionable cuando la cuenta no este autenticada.
  - [x] Cerrar y reiniciar el proceso de forma controlada.

  > **Comentario (10/08/2026):** implementado en `distribuidora-backend/src/chat/`
  > (`jsonrpc.ts` + `codexService.ts`) con rutas `GET /api/chat/status` y
  > `POST /api/chat/restart`. Verificado en vivo: autenticado, sin autenticar
  > (CODEX_HOME vacio) y sin instalar. Criterio cumplido: Fastify inicia Codex y
  > confirma la cuenta sin exponer credenciales. Detalle en [Fase 1](#fase-1---prueba-de-codex-local).

### Etapa 2: Cliente minimo de JSON-RPC

- [x] Objetivo: encapsular la comunicacion con `app-server`.
  - [x] Crear un modulo de proceso Codex.
  - [x] Escribir mensajes JSONL en stdin.
  - [x] Leer respuestas y notificaciones desde stdout.
  - [x] Correlacionar respuestas mediante `id`.
  - [x] Publicar las notificaciones de cada thread.
  - [x] Manejar desconexion, timeout y proceso terminado.
  - [x] Decidir si se adapta `effect-codex-app-server` o se crea un cliente simple
    en TypeScript.

  Criterio de finalizacion: existe una interfaz interna pequena para enviar
  requests y suscribirse a eventos de Codex.

### Etapa 3: Modelos disponibles

- [x] Objetivo: permitir elegir el modelo desde la aplicacion.
  - [x] Implementar `model/list`.
  - [x] Crear `GET /api/chat/models`.
  - [x] Mostrar un selector de modelos en React.
  - [x] Validar el modelo en el backend.
  - [x] Definir un modelo por defecto.

  Criterio de finalizacion: el usuario puede seleccionar un modelo valido antes
  de iniciar una conversacion.

  > **Comentario (10/08/2026):** implementado. `GET /api/chat/models` en
  > `distribuidora-backend/src/routes/chat.ts` devuelve modelos visibles,
  > `defaultModel` y validacion opcional via `?model=`; la ruta `/chat` en el
  > frontend muestra el selector con persistencia en `localStorage`. Detalle
  > en [Fase 3](#fase-3---modelos-disponibles).

### Etapa 4: Conversaciones e historial

- [x] Objetivo: crear, listar y continuar chats.
  - [x] Implementar `thread/start`.
  - [x] Implementar `thread/list` o una tabla local de conversaciones.
  - [x] Implementar `thread/read`.
  - [x] Implementar `thread/resume`.
  - [x] Asociar `codexThreadId` con el identificador local.
  - [x] Agregar nombres y fechas de conversacion.
  - [x] Definir archivado o eliminacion como funcionalidad posterior.

  Criterio de finalizacion: el usuario puede cerrar la aplicacion, volver a
  abrirla y continuar una conversacion anterior.

### Etapa 5: Envio y streaming

- [x] Objetivo: mostrar respuestas como un chat moderno.
  - [x] Implementar `turn/start`.
  - [x] Escuchar `item/agentMessage/delta`.
  - [x] Escuchar `turn/completed`.
  - [x] Traducir eventos de Codex a eventos SSE propios.
  - [x] Crear `POST /api/chat/conversations/:id/messages`.
  - [x] Mostrar estado de carga, respuesta parcial y errores.
  - [x] Agregar cancelacion con `turn/interrupt` si resulta necesaria.

  Criterio de finalizacion: el usuario envia una pregunta y ve la respuesta
  progresivamente sin esperar a que termine todo el turno.

### Etapa 6: MCP de ventas

- [x] Objetivo: permitir que Codex responda usando la base de datos real.
  - [x] Crear el proceso MCP local.
  - [x] Reutilizar los servicios de consulta de ventas del backend.
  - [x] Definir schemas para argumentos de herramientas.
  - [x] Implementar inicialmente una herramienta de resumen.
  - [x] Agregar consultas por fechas, vendedor, producto y ciudad.
  - [x] Limitar resultados y tiempos de ejecucion.
  - [x] Configurar `app-server` para usar el MCP por `stdio`.
  - [x] Probar preguntas ambiguas y filtros invalidos.

  Criterio de finalizacion: Codex puede responder preguntas comerciales usando
  agregados reales y no inventa datos cuando una consulta no devuelve resultados.

### Etapa 7: Interfaz del chat

- [x] Objetivo: integrar el chat en la aplicacion existente.
  - [x] Crear `src/components/chat/ChatPanel.tsx`.
  - [x] Crear una ruta `/chat` o un panel lateral global.
  - [x] Mostrar conversaciones anteriores.
  - [x] Mostrar selector de modelo.
  - [x] Mostrar mensajes del usuario y del asistente.
  - [x] Mostrar consultas de herramientas de forma resumida.
  - [x] Agregar estados vacio, cargando, sin autenticacion y sin backend.
  - [x] Adaptar el layout de `src/routes/__root.tsx`.

  Criterio de finalizacion: el usuario puede usar el chat sin abrir una terminal
  ni interactuar directamente con Codex.

### Etapa 8: Persistencia y empaquetado

- [x] Objetivo: que la funcionalidad sobreviva al cierre y al instalador Tauri.
  - [x] Persistir conversaciones y configuracion en el directorio de datos de la
    aplicacion.
  - [x] No usar `src-tauri/resources` como base activa.
  - [x] Resolver la instalacion o deteccion de Codex CLI.
  - [x] Verificar rutas de `CODEX_HOME` en desarrollo y produccion.
  - [x] Agregar backups si el historial propio se persiste.
  - [x] Probar actualizaciones sin perder conversaciones.

  Criterio de finalizacion: una aplicacion empaquetada puede iniciar el backend,
  encontrar Codex y conservar el historial local.

  > **Comentario (11/08/2026):** implementado con alcance cross-platform
  > (macOS + Windows). Se restauraron los scripts de empaquetado que faltaban
  > (borrados por error en el commit 659fb21), se agrego la deteccion de Codex
  > con binario nativo (el CLI npm es un wrapper de node que fallaba desde
  > Finder), la DB se siembra en el data dir con recuperacion automatica,
  > backups semanales (1 copia) y alineacion de schema en instalaciones
  > existentes. Verificado en vivo con el binario empaquetado en entorno Finder
  > (PATH minimo, sin CODEX_HOME). Detalle en
  > [Fase 8](#fase-8---persistencia-y-empaquetado).

### Etapa 9: Seguridad y pruebas

- [ ] Objetivo: cerrar los riesgos antes de usarlo como funcionalidad normal.
  - [ ] Confirmar que Fastify escuche solo en localhost.
  - [ ] No permitir SQL arbitrario.
  - [ ] Mantener todas las herramientas de ventas en modo lectura.
  - [ ] Validar limites de fechas, filas y tiempos.
  - [ ] Probar campos de ventas que contengan texto malicioso o instrucciones.
  - [ ] Evitar enviar datos personales que no sean necesarios.
  - [ ] Probar falta de autenticacion, logout, expiracion y renovacion de sesion.
  - [ ] Probar cierre inesperado de `app-server`.
  - [ ] Probar perdida de red y respuestas incompletas.
  - [ ] Ejecutar pruebas con bases pequenas y grandes.

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

## Fase 2 - Cliente minimo de JSON-RPC

Estado al 10/08/2026. Existe una interfaz interna pequena para enviar requests
y suscribirse a eventos de Codex. Criterio de finalizacion cumplido.

### Decision: cliente simple en TypeScript

Se evaluo adaptar `effect-codex-app-server` (licencia MIT) y se descarto:

| Criterio | `effect-codex-app-server` | Cliente propio |
| --- | --- | --- |
| Dependencias | Arrastra Effect completo (Context, Layer, Stream, Schema) | Cero dependencias nuevas (solo `node:child_process`) |
| Superficie usada | Menos del 10% del protocolo (threads, turns, modelos, deltas) | Tipos recortados a ese subconjunto |
| Paridad de tipos | Tipos de schema generado (revisar cada actualizacion de Codex) | Tipos propios en `codexProtocol.ts` |
| Mantenimiento | Copia de codigo de t3code dentro de este repo | Un archivo de tipos + transporte ya probado |

El transporte (`jsonrpc.ts`) ya cubria el 80% de la etapa (JSONL en stdin,
correlacion por `id`, timeout, cierre SIGTERM/SIGKILL). Faltaba la capa tipada
y la publicacion de eventos por thread, que se agregaron en esta fase.

### Implementacion

Archivos en `distribuidora-backend`:

- `src/chat/codexProtocol.ts` (nuevo) - protocolo tipado del subconjunto
  usado: tipos de params/respuestas de `model/list`, `thread/start`,
  `thread/resume`, `thread/list`, `thread/read`, `turn/start`,
  `turn/interrupt` y notificaciones `turn/started`, `turn/completed`,
  `item/agentMessage/delta`, `item/started`, `item/completed`. Los tipos
  siguen el schema generado del app-server (verificado contra
  `t3code/packages/effect-codex-app-server/src/_generated/schema.gen.ts`).
- `src/chat/codexService.ts` (ampliado) - bus de eventos `onEvent` y
  `onThreadEvent(threadId, ...)` que decodifica notificaciones JSON-RPC en
  eventos tipados, mas helpers RPC: `listModels`, `startThread`,
  `resumeThread`, `listThreads`, `readThread`, `startTurn`, `interruptTurn`.

### Comportamiento verificado en vivo

| Paso | Resultado |
| --- | --- |
| `model/list` | 4 modelos visibles (`gpt-5.6-terra` default, `gpt-5.6-luna`, `gpt-5.5`, `gpt-5.4-mini`) |
| `thread/start` con `sandbox: "read-only"` | Thread creado con su `id` |
| `turn/start` | Turno iniciado; respuesta "Hola" recibida como deltas |
| Eventos por thread | `turn/started`, `item/started`, `item/completed`, `item/agentMessage/delta`, `turn/completed` entregados al suscriptor de `onThreadEvent` |
| `thread/list` + `thread/read` | El thread recien creado aparece con 1 turno |

### Notas

- El sandbox es un string (`"read-only"`), no un objeto: corregido tras el
  primer error `-32600` en vivo.
- Los helpers de `turn/*` y `thread/*` son envolturas delgadas sin logica de
  negocio; las validaciones de modelos y el mapeo a la base local llegan en
  las Etapas 3 y 4.
- Las notificaciones desconocidas (hooks, MCP, rate limits) se registran pero
  no se publican: la app solo consume el subconjunto del contrato.

## Fase 3 - Modelos disponibles

Estado al 10/08/2026. El usuario puede elegir un modelo valido desde la
aplicacion antes de iniciar una conversacion. Criterio de finalizacion
cumplido.

### Implementacion

Backend (`distribuidora-backend`):

- `src/chat/codexService.ts` (ampliado) - helpers de Etapa 3:
  - `visibleModels()`: `model/list` filtrado a `hidden === false`.
  - `defaultModel()`: el modelo con `isDefault: true`, o el primero visible.
  - `validateModel(modelId)`: confirma que el modelo exista y este visible.
- `src/routes/chat.ts` (ampliado) - `GET /api/chat/models`:
  - Devuelve `{ models: [{ id, displayName, description }], defaultModel, valid }`.
  - `valid` valida el modelo recibido via `?model=` (el frontend envia solo
    el identificador, nunca parametros arbitrarios).
  - Errores accionables: 401 si no hay cuenta, 503 si Codex no esta instalado.

Frontend (`distribuidora-front`):

- `src/lib/chat.ts` (nuevo) - contrato pequeno y estable del chat: tipos
  `ChatModel`, `ChatStatus` y funciones `obtenerModelosChat`,
  `obtenerEstadoChat`, `reiniciarCodex`.
- `src/routes/chat.tsx` (nuevo) - pagina `/chat` con estados:
  - Sin backend: explica que el chat requiere el sidecar.
  - Cargando, error con reintento y reinicio de Codex.
  - Codex no instalado: instrucciones `npm install -g @openai/codex`.
  - Codex sin autenticar: instrucciones `codex login` + `codex login status`.
  - Cuenta conectada: selector de modelos con descripcion del modelo actual.
- El modelo elegido se persiste en `localStorage` (`chat.selectedModel`) y se
  reutilizara en Etapa 4 al crear conversaciones.
- `src/routes/__root.tsx`: item "Asistente IA" en el sidebar (`/chat`).

### Comportamiento verificado en vivo

| Caso | Resultado |
| --- | --- |
| `GET /api/chat/models` | 4 modelos visibles (`gpt-5.6-terra`, `gpt-5.6-luna`, `gpt-5.5`, `gpt-5.4-mini`), `defaultModel: "gpt-5.6-terra"` |
| `GET /api/chat/models?model=gpt-5.6-luna` | `valid: true` |
| `GET /api/chat/models?model=no-existe` | `valid: false` |
| Codex no instalado (`CODEX_CLI_COMMAND=codex-inexistente`) | HTTP 503 con mensaje de instalacion |

### Notas

- `model/list` no requiere autenticacion (devuelve modelos aunque la cuenta no
  este conectada); la autenticacion se valida con `account/read` y la ruta
  `/chat` bloquea el selector cuando no hay cuenta.
- La ruta `/chat` de Etapa 3 es deliberadamente minimalista: la interfaz de
  chat completa (mensajes, historial, streaming) llega en la Etapa 7.

## Fase 4 - Conversaciones e historial

Estado al 10/08/2026. El usuario puede crear conversaciones, ver su historial
y reabrir la aplicacion conservandolas. Criterio de finalizacion cumplido:
el thread sobrevive al cierre del proceso y se vuelve a cargar con
`thread/resume` + `thread/read`.

### Persistencia local (decision de Fase 0)

Se agrego la tabla `ChatConversation` en SQLite (via Prisma):

```text
ChatConversation
- id                (local, autoincrement)
- codexThreadId     (unique, id del thread de Codex)
- title             (nombre de la conversacion)
- selectedModel     (modelo con el que se creo)
- createdAt / updatedAt
```

Los mensajes NO se guardan en la base local: se leen del historial de Codex
via `thread/read` con `includeTurns: true`. El proyecto no usa migraciones
Prisma (sin carpeta `migrations/`): se aplico `prisma db push` + `prisma
generate`.

### Implementacion

Backend (`distribuidora-backend`):

- `prisma/schema.prisma` - modelo `ChatConversation`.
- `src/chat/codexProtocol.ts` - tipos de items de `thread/read`:
  `CodexThreadItem` (`userMessage` con `content[]` y `agentMessage` con
  `text`), y `CodexTurn.startedAt`.
- `src/chat/conversationService.ts` (nuevo) - `ConversationService`:
  - `list()`: filas locales ordenadas por `updatedAt` desc.
  - `create({ model, title })`: valida el modelo, `thread/start` con
    `sandbox: "read-only"` y guarda los metadatos. Titulo por defecto
    "Nueva conversación".
  - `read(id)`: metadatos + mensajes mapeados desde `thread/read`
    (`userMessage` -> rol `user`, `agentMessage` -> rol `assistant`).
    Si el titulo sigue siendo el por defecto, se reemplaza por el `preview`
    que Codex conserva del thread.
  - `resume(id, model?)`: valida el modelo, `thread/resume` y actualiza los
    metadatos. Deja el thread listo para `turn/start` en la Etapa 5.
  - Manejo de threads "frios": un thread creado por otra sesion de
    `app-server` (por ejemplo tras reiniciar la app) falla `thread/read` con
    `-32600`; se carga con `thread/resume` y se relee. Un thread sin turnos
    ("not materialized yet" / "no rollout found") se devuelve con mensajes
    vacios, que es el estado real.
- `src/routes/chat.ts` - nuevas rutas:

  ```text
  GET  /api/chat/conversations            — historial local
  POST /api/chat/conversations            — { model?, title? } -> 201 { conversation }
  GET  /api/chat/conversations/:id        — { conversation, messages[], preview }
  POST /api/chat/conversations/:id/resume — { model? } -> { conversation }
  ```

  Errores: 400 modelo invalido, 401 sin cuenta, 404 conversacion inexistente,
  503 Codex no instalado.

Frontend (`distribuidora-front`):

- `src/lib/chat.ts` - tipos `ChatConversacion`, `ChatMensaje`,
  `ChatConversacionDetalle` y funciones `obtenerConversacionesChat`,
  `crearConversacionChat`, `obtenerConversacionChat`,
  `reanudarConversacionChat` (esta ultima se usara en la Etapa 5).
- `src/components/chat/Conversaciones.tsx` (nuevo) - lista de conversaciones
  con titulo, fecha y modelo; boton "Nueva conversación"; estado vacio y
  cargando.
- `src/components/chat/Historial.tsx` (nuevo) - historial de una
  conversacion: burbujas de usuario/asistente con hora, estados vacio,
  cargando y error. El envio de mensajes llega en la Etapa 5.
- `src/routes/chat.tsx` - al estar autenticado se cargan las conversaciones,
  se puede crear una nueva con el modelo seleccionado y abrir cualquiera
  para ver su historial.

### Comportamiento verificado en vivo

| Caso | Resultado |
| --- | --- |
| `POST /api/chat/conversations` con modelo | 201, thread creado en Codex y fila local asociada |
| `POST /api/chat/conversations` sin modelo | Usa el modelo por defecto (`gpt-5.6-terra`) |
| `GET /api/chat/conversations` | Lista por `updatedAt` desc con titulo, fechas y modelo |
| `GET /api/chat/conversations/:id` | `messages` con rol user/assistant, texto y hora del turno; `preview` del thread |
| Thread "frio" (otra sesion de app-server) | `thread/resume` lo carga y `thread/read` devuelve los turnos |
| Thread sin turnos | `messages: []` sin error (el thread no se materializa hasta el primer turno) |
| Titulo por defecto + preview del thread | Se reemplaza "Nueva conversación" por el primer mensaje |
| Modelo invalido | HTTP 400 con mensaje accionable |
| Conversacion inexistente | HTTP 404 |
| Cierre y reapertura de la app | El thread materializado se vuelve a leer desde un proceso nuevo |

### Notas

- `thread/read` con `includeTurns: true` falla con `-32600` en threads sin
  turnos: el thread solo se materializa en disco tras el primer `turn/start`.
  Es el comportamiento esperado del app-server; la Etapa 5 lo cubre al enviar
  el primer mensaje.
- El titulo se deriva del `preview` que Codex guarda (primer mensaje del
  thread) solo cuando el usuario no puso un titulo propio.
- No se implementaron archivado ni eliminacion (Etapa 4 los define como
  posteriores). El `DELETE /api/chat/conversations/:id` de la propuesta de
  API queda pendiente junto con ellos.
- `scripts/test-turn.ts` en el backend: utilidad de desarrollo que crea un
  thread, le envia un turno real y deja la fila local, para probar Etapa 4/5.

## Fase 5 - Envio y streaming

Estado al 10/08/2026. El usuario envia una pregunta y ve la respuesta
progresivamente sin esperar a que termine todo el turno. Criterio de
finalizacion cumplido.

### Contrato SSE de la aplicacion

El frontend no conoce el protocolo interno de Codex. `POST
/api/chat/conversations/:id/messages` responde con SSE de solo 4 eventos:

```text
message.start     — { turnId } al arrancar el turno (id para cancelar)
message.delta     — { text } cada fragmento de texto del asistente
message.completed — { turnId } el turno termino sin errores
message.error     — { message } fallo, turno failed o generacion cancelada
```

Ademas se agrego `POST /api/chat/conversations/:id/cancel` con `{ turnId }`,
que ejecuta `turn/interrupt` para cancelar una generacion en curso.

### Implementacion

Backend (`distribuidora-backend`):

- `src/chat/chatStreamService.ts` (nuevo) - `ChatStreamService` que traduce un
  turno a eventos SSE:
  - Se suscribe a los eventos del thread ANTES de enviar `turn/start` para no
    perder ningun delta (los deltas que llegan antes del arranque se encolan).
  - `turn/start` se envia con timeout propio de 10 minutos (la respuesta llega
    cuando el turno arranca, no cuando termina).
  - `turn/started` registra el `turnId`; `item/agentMessage/delta` se traduce a
    `message.delta`; `turn/completed` cierra con `message.completed` o
    `message.error` segun su estado (`failed`, `interrupted`).
  - La notificacion `error` (rate limits, fallos) corta con `message.error` e
    interrumpe el turno: la app no reintenta, asi se evita gastar tokens en un
    reintento invisible.
  - Devuelve un controlador de cancelacion que la ruta ejecuta si el cliente
    se desconecta a mitad de turno.
- `src/chat/jsonrpc.ts` - `request(method, params, timeoutMs)` con timeout
  configurable por request.
- `src/chat/codexProtocol.ts` - correccion de tipos verificada contra el
  schema generado: `item/started` y `item/completed` llevan el item completo
  en `item` (no `itemId`); `Turn.status` es un string literal
  (`completed | interrupted | failed | inProgress`), no un objeto `{ type }`
  como `Thread.status`. Se agrego la notificacion `error`.
- `src/chat/codexService.ts` - `startTurn` con timeout propio y decodificacion
  de la notificacion `error`.
- `src/chat/conversationService.ts` - `get(id)` para validar la conversacion
  antes de abrir el stream.
- `src/routes/chat.ts` - `POST .../messages` (SSE con `reply.hijack()`):
  valida la conversacion y el mensaje como JSON (404/400), reanuda el thread,
  y de ahi en mas todo error se reporta por SSE. Al terminar el turno
  actualiza `updatedAt` y cierra la respuesta. Timeout total de 10 minutos.
  `POST .../cancel` para `turn/interrupt`.

Frontend (`distribuidora-front`):

- `src/lib/chat.ts` - `enviarMensajeChat(id, message, onEvent, signal)` lee el
  SSE con `fetch` + `ReadableStream`, parsea los frames y emite los 4 eventos
  tipados. `cancelarTurnoChat(id, turnId)` para interrumpir.
- `src/components/chat/Historial.tsx` - textarea con Enter/Shift+Enter, burbuja
  del asistente con cursor parpadeante mientras genera, boton para detener la
  generacion, errores de envio inline y auto-scroll al fondo.
- `src/routes/chat.tsx` - estado del envio: agrega el mensaje del usuario de
  forma optimista, acumula los deltas en la burbuja del asistente, al terminar
  recarga el historial real desde el backend, y al cancelar o cambiar de
  conversacion aborta el fetch e interrumpe el turno.

### Comportamiento verificado en vivo

| Caso | Resultado |
| --- | --- |
| `POST .../messages` con pregunta corta | `message.start` con `turnId`, deltas parciales y `message.completed` con el mismo `turnId` |
| Respuesta larga (ensayo de miles de palabras) | Cientos de deltas sin cortes; stream cerrado por el backend al terminar |
| `POST .../cancel` a mitad de turno | El turno se interrumpe; el SSE cierra con `message.error` "La generación fue cancelada." |
| `turn/interrupt` directo | `turn/completed` llega con `status: "interrupted"` |
| Mensaje vacio | HTTP 400 JSON sin abrir el stream |
| Conversacion inexistente | HTTP 404 JSON sin abrir el stream |
| Historial tras varios turnos | Los mensajes user/assistant persisten y se releen con `thread/read`; el turno cancelado queda solo con el mensaje del usuario |
| CORS preflight (frontend en :3000, backend en :3001) | 204 con headers permitidos |
| Timeout de 10 minutos | No probado en vivo (tardaria demasiado); se probo la logica de cierre |

### Notas

- Bug corregido en vivo: `onDone` cerraba la respuesta SSE antes de escribir
  el evento terminal, por lo que `message.completed` se perdia. El orden
  correcto es evento terminal -> cierre.
- Bug de tipos corregido en vivo: `Turn.status` es un string, no `{ type }`.
  Con el tipo viejo, `turn/completed` con `status: "interrupted"` se tradujo
  como completado (el cancel parecia no funcionar).
- La DB de desarrollo no tenia la tabla `ChatConversation` (la fase 4 se
  habia verificado contra otra base): se aplico `prisma db push` con
  `DATABASE_URL="file:./distribuidora.db"` (relativa al schema).
- Un turno que el usuario no cancela y tarda mas de 10 minutos se corta con
  `message.error` y `turn/interrupt` (proteccion contra respuestas colgadas).
- Los comentarios del asistente que no son la respuesta final (fases
  commentary) se muestran como mensajes de asistente en el historial; la
  Etapa 7 puede resumirlos u ocultarlos.

## Fase 6 - MCP de ventas

Estado al 10/08/2026. Codex responde preguntas comerciales usando agregados
reales de la base local y no inventa datos cuando una consulta no devuelve
resultados. Criterio de finalizacion cumplido.

### Arquitectura

```text
React dentro de Tauri
        |
        | HTTP + SSE (sin cambios en Etapa 6)
        v
Fastify local
        |
        | JSON-RPC por stdio + `-c mcp_servers.ventas.*`
        v
codex app-server  --spawna-->  proceso MCP `ventas` (stdio, solo lectura)
                                        |
                                        | Prisma + SQLite (DB local)
                                        v
                                 Consultas agregadas reales
```

El MCP corre como proceso local iniciado por `app-server` (stdio), como
definio la Fase 0: sin OAuth, sin bearer tokens y sin listener en la red.

### Implementacion

Backend (`distribuidora-backend`):

- `src/services/ventasConsultas.ts` (nuevo) - consultas de solo lectura con
  schemas zod y salida en texto para el modelo:
  - `resumen_ventas` (KPIs del periodo), `ventas_por_periodo` (dia/mes/anho),
    `ventas_por_vendedor`, `ventas_por_producto`, `ventas_por_ciudad`
    (rankings con participacion) y `comparar_periodos`.
  - Limites: fechas YYYY-MM-DD validas, rango maximo de 10 anios, ranking
    limitado (default 10, maximo 50), montos redondeados.
  - Reutiliza `whereClausula` de `dashboardService.ts` (exportado para eso).
  - Sin SQL arbitrario: las columnas de ranking estan en una lista fija.
- `src/mcp/mcpServer.ts` (nuevo) - servidor MCP minimo sobre stdio
  (JSON-RPC 2.0): `initialize` con `instructions`, `notifications/initialized`,
  `ping`, `tools/list` y `tools/call`. Misma decision que el cliente JSON-RPC
  de la Etapa 2: se implementa a mano, sin `@modelcontextprotocol/sdk`.
- `src/mcp/ventasMcpServer.ts` (nuevo) - entrypoint del proceso: define las 6
  herramientas (schema zod + JSON Schema + handler), las instrucciones para el
  modelo (fechas, montos en quetzales, "no inventes cifras") y cierra el
  proceso con SIGINT/SIGTERM.
- `src/mcp/ventasMcpConfig.ts` (nuevo) - resuelve el comando del MCP:
  1. `VENTAS_MCP_CMD` + `VENTAS_MCP_ARGS` (JSON) si el usuario los define.
  2. `dist/mcp/ventasMcpServer.js` con el node actual si el backend esta
     compilado.
  3. En desarrollo: `node --import tsx src/mcp/ventasMcpServer.ts`.
  `ventasMcpLaunchArgs()` genera los `-c` de `app-server`:
  `mcp_servers.ventas.command/args`, `default_tools_approval_mode="auto"` y
  `tool_timeout_sec=45`.
- `src/routes/chat.ts` - `CodexService` recibe `extraArgs: ventasMcpLaunchArgs()`
  y `GET /api/chat/status` agrega el campo `mcp` (servidor configurado y
  comando resuelto).
- `src/chat/autoApproval.ts` (nuevo) - auto-aprueba las tool calls del servidor
  `ventas` (ver "El cuelgue y su causa").
- `src/chat/chatStreamService.ts` - usa la auto-aprobacion durante cada turno.
- `src/chat/jsonrpc.ts` + `src/chat/codexService.ts` - soporte para requests
  del servidor hacia el cliente (`onClientRequest` + `respond`): el app-server
  pide aprobaciones de herramientas por este canal.
- Scripts de desarrollo: `scripts/test-mcp.ts` (smoke test del MCP standalone)
  y `scripts/test-mcp-turn.ts` (turno real con pregunta comercial;
  parametrizable con `CODEX_TEST_MODEL` y `CODEX_TEST_PREGUNTA`).

### El cuelgue y su causa

Al probar por primera vez un turno comercial, el turno nunca terminaba: el
modelo repetia "Voy a consultar..." sin que la herramienta se ejecutara. El
diagnostico (logs de notificaciones y de requests del servidor) mostro:

- El MCP `ventas` llegaba a `status: "ready"` (la conexion funcionaba).
- El modelo SI llamaba la herramienta: `item/started {"type":"mcpToolCall"}`.
- Pero el app-server interrumpia el turno con un request al cliente:
  `mcpServer/elicitation/request` con `_meta.codex_approval_kind: "mcp_tool_call"`
  y mensaje `Allow the ventas MCP server to run tool "resumen_ventas"?`.
- Nuestro cliente JSON-RPC descartaba los requests con `id` que no esperaba,
  asi que nadie respondia y el turno quedaba colgado para siempre.

Solucion: `autoApproveVentasToolCalls` responde automaticamente con
`{ action: "accept", content: null }` a las elicitations de tool calls del
servidor `ventas` (solo lectura; el MVP no implementa aprobaciones). El
`serverRequest/resolved` confirma la aprobacion y el turno sigue.

Nota: `default_tools_approval_mode="auto"` en `mcp_servers.ventas` no evito la
elicitacion en la version 0.147.0; la auto-respuesta es lo que hace funcionar
el flujo.

### Comportamiento verificado en vivo

| Caso | Resultado |
| --- | --- |
| MCP standalone (`scripts/test-mcp.ts`) | initialize con instructions, 6 herramientas con schema, consultas reales, caso sin datos, fechas invalidas, granularidad invalida y herramienta inexistente |
| "¿Cuantas facturas en julio 2026 y vendedor lider?" | `resumen_ventas` + `ventas_por_vendedor` (2 tool calls, 2 elicitations auto-aprobadas); respuesta: 3,838 facturas y CESAR BERINO con Q158,866,148.74 |
| Dato exacto contra la base | `SH GRAN VINO TINTO 12X750 ML` con Q96,266,552.73 coincide con el SQL directo (no alucina) |
| "¿Cuantas facturas en enero 2025?" (sin datos) | "No hubo facturas en enero de 2025 según la consulta de ventas." |
| "¿Cuantos vendio JUAN PEREZ?" (vendedor inexistente) | "No hay resultados para `JUAN PEREZ` en julio de 2026, así que no registró ventas en ese período." |
| `GET /api/chat/status` | Incluye `mcp: { server: "ventas", configured: true, command, args }` |
| Flujo completo por el backend (SSE) | `message.start` -> deltas -> `message.completed` con el mismo `turnId`; respuesta basada en datos reales |
| Modelo con cobertura parcial | El modelo advirtio solo: los datos llegan al 15/07 y no invento el mes completo |
| MCP compilado (`dist/mcp`) | El entrypoint de `dist` responde igual que en desarrollo (29ms por consulta) |
| Cierre limpio | app-server y el MCP hijo terminan con SIGTERM; sin procesos huerfanos |

### Notas

- Los procesos MCP stdio de Codex se lanzan con entorno restringido
  (`env_clear` + whitelist): en desarrollo el entrypoint calcula `DATABASE_URL`
  contra `<raiz>/prisma/distribuidora.db` si no esta en el entorno; en la app
  empaquetada el MCP resuelve su propio data dir y engine via
  `resolvePrismaEnv()` (Fase 8), sin depender del env heredado.
- El log de Fastify registra las notificaciones `mcpServer/*` con sus params
  y los requests del servidor: util para depurar la conexion MCP en Etapa 7.
- Las respuestas de las herramientas son texto con estructura simple para el
  modelo; el frontend no necesita conocer el MCP (Etapa 7 muestra las tool
  calls resumidas si se desea).

## Fase 7 - Interfaz del chat

Estado al 10/08/2026. El chat queda integrado en la aplicacion como un panel
de dos columnas: el usuario puede crear y continuar conversaciones, elegir
modelo, ver las consultas de herramientas (MCP de ventas) resumidas y usar el
chat sin abrir una terminal. Criterio de finalizacion cumplido.

### Implementacion

Backend (`distribuidora-backend`):

- `src/chat/codexProtocol.ts` - el item `mcpToolCall` se agrega al union de
  `CodexThreadItem` (`server`, `tool`, `status`, `error`). Los tipos siguen el
  schema generado del app-server (`McpToolCallStatus`: inProgress/completed/
  failed).
- `src/chat/conversationService.ts` - `ChatMensaje` gana `toolCalls?` y
  `turnToMessages` las mapea: cada tool call se adjunta a la respuesta del
  asistente del mismo turno (la burbuja se abre con las consultas y se
  completa con el texto final si el texto llega despues). No se exponen los
  `arguments` ni los `result` de las herramientas (solo nombre, servidor y
  estado).
- `src/chat/chatStreamService.ts` - nuevo evento SSE `message.tool_call`
  (`{ server, tool }`), emitido desde `item/started` cuando el item es un
  `mcpToolCall`. Igual que los deltas, las tool calls que llegan antes del
  arranque del turno se encolan y se emiten despues de `message.start`.

Contrato SSE de la aplicacion (Etapa 5 + Etapa 7):

```text
message.start     — { turnId } al arrancar el turno (id para cancelar)
message.delta     — { text } cada fragmento de texto del asistente
message.tool_call — { server, tool } cuando el asistente consulta una herramienta
message.completed — { turnId } el turno termino sin errores
message.error     — { message } fallo, turno failed o generacion cancelada
```

Frontend (`distribuidora-front`):

- `src/components/chat/ChatPanel.tsx` (nuevo) - panel principal del chat con
  layout de dos columnas:
  - Columna izquierda (sticky en desktop): selector de modelo con descripcion
    y `ConversacionesPanel` con la lista scrollable y el boton "Nueva
    conversación".
  - Columna derecha: `HistorialMensajes` (mensajes + editor), que ocupa la
    altura del viewport en desktop.
  - `conversacionesError` se muestra dentro del panel lateral.
- `src/components/chat/Historial.tsx` - burbujas del asistente con chips de
  herramientas resumidas (icono de base de datos + nombre legible, p. ej.
  "Ventas por vendedor"; "· falló" si la consulta fallo). Mientras el turno
  esta en curso, los chips en vivo muestran las consultas con animacion de
  "consultando…" encima del texto que se va acumulando.
- `src/components/chat/Conversaciones.tsx` - la lista queda scrollable dentro
  del panel lateral (`max-h-[45vh]`, y en desktop `calc(100vh - 420px)`).
- `src/lib/chat.ts` - `ChatMensaje.toolCalls`, evento `message.tool_call` en
  `ChatSseEvent` y en el parseo del SSE, y `nombreHerramienta()` que traduce
  los nombres de las herramientas del MCP de ventas a texto legible.
- `src/routes/chat.tsx` - el bloque autenticado ahora renderiza `ChatPanel`;
  en `onEvent` acumula `herramientasEnCurso` (nombres legibles) que se pasan
  al historial y se limpian al terminar el turno o cambiar de conversacion.
- Script de desarrollo: `scripts/test-tool-calls.ts` en el backend (turno
  real que verifica `message.tool_call` y las `toolCalls` del historial;
  parametrizable con `CODEX_TEST_MODEL` y `CODEX_TEST_PREGUNTA`).

### Comportamiento verificado en vivo

| Caso | Resultado |
| --- | --- |
| Turno con pregunta comercial | SSE: `message.start` -> deltas -> `message.tool_call` (`ventas` / `resumen_ventas`) -> deltas -> `message.completed` |
| `thread/read` tras el turno | El mensaje del asistente incluye `toolCalls: [{ server: "ventas", tool: "resumen_ventas", status: "completed" }]` con su texto |
| Tool call antes del arranque | Se encola y se emite despues de `message.start` (misma logica que los deltas) |
| Herramienta fallida | `status: "failed"` en el historial; el chip muestra "· falló" |
| `tsc` backend y `tsc --noEmit` + `vite build` frontend | Sin errores; `ChatPanel` incluido en el bundle |

### Notas

- El contrato SSE de la aplicacion crece a 5 eventos: el frontend no conoce el
  protocolo de Codex; `message.tool_call` es la unica traduccion nueva y es
  opcional de consumir (los clientes viejos ignoran el evento).
- Las tool calls se muestran resumidas a proposito: nombre de la herramienta
  y estado. Los argumentos y resultados de las consultas (que pueden contener
  datos de ventas) no se exponen al frontend; el texto del asistente es la
  respuesta autorizada.
- `scripts/test-tool-calls.ts` no importa `src/server.js` (levantaria Fastify
  y el proceso nunca terminaria); crea su propio `PrismaClient` con la URL de
  la base de desarrollo.

## Fase 8 - Persistencia y empaquetado

Estado al 11/08/2026. Una aplicacion empaquetada inicia el backend, encuentra
Codex y conserva el historial local. Alcance cross-platform: el desarrollo se
hace en macOS y el cliente final es Windows. Criterio de finalizacion cumplido.

### Decisiones

| Tema | Decision |
| --- | --- |
| Base activa | El data dir de la app (macOS: `~/Library/Application Support/com.distribuidora.app`; Windows: `%APPDATA%\com.distribuidora.app`). `src-tauri/resources` es solo la semilla de primera instalacion. |
| Semilla del instalador | **DB vacia con el schema** (solo tablas, sin filas), generada en `scripts/copy-assets.js` con `prisma db push` contra un archivo temporal. El cliente arranca sin datos y carga su propio Excel por "Cargar Excel". La DB de desarrollo queda fuera del empaquetado. |
| Empaquetado | Dos binarios compilados con `bun build --compile`: el sidecar principal (`distribuidora-backend`) y el MCP de ventas (`distribuidora-ventas-mcp`). Ambos se declaran en `externalBin` de Tauri. El MCP no depende de Node (no existe en la app empaquetada). |
| Deteccion de Codex | `CODEX_CLI_COMMAND` (override estricto) -> `codex` en PATH -> rutas conocidas por plataforma (Homebrew, npm global, scoop, winget). En macOS/Windows el CLI npm es un wrapper de node: se resuelve al binario nativo `vendor/<triple>/bin/codex(.exe)`. |
| CODEX_HOME | `CODEX_HOME` o `~/.codex` (`%USERPROFILE%\.codex` en Windows). Se expone en `/api/chat/status` junto con el comando resuelto para diagnosticar en maquinas nuevas. |
| Backups | Semanales (clave ISO `YYYY-Www`), una sola copia retenida, con `VACUUM INTO` (consistente aun con WAL). En `backups/` dentro del data dir. |
| Actualizaciones | La DB no se borra al reinstalar (vive en el data dir). `ensureChatSchema` crea tablas nuevas (p. ej. `ChatConversation`) en instalaciones existentes; `bootstrap` mueve a un lado una DB sin tablas core y re-siembra. |

### Implementacion

Backend (`distribuidora-backend`):

- `src/lib/appPaths.ts` (nuevo) - rutas compartidas: `appDataDir()`,
  `backupDir()`, `isPackaged()` (deteccion del binario bun), `resourceDirs()`,
  `findResource()`, `prismaEnginePath()`, `resolvePrismaEnv()`.
- `src/bootstrap.ts` - siembra la DB desde los resources al data dir solo si
  no existe; si existe pero no tiene las tablas core (`Venta`/`Carga`), la
  mueve a `distribuidora.db.corrupt-<ts>` y re-siembra (recuperacion
  automatica de bases vacias o corruptas). Configura `DATABASE_URL` y
  `PRISMA_QUERY_ENGINE_LIBRARY` para el entorno empaquetado.
- `src/backups.ts` (nuevo) - `runWeeklyBackup`: copia consistente semanal
  con `VACUUM INTO`, nombre `distribuidora-YYYY-Www.db`, retiene una sola
  copia (poda de mas viejas). Se ejecuta al arrancar `server.ts`, sin bloquear
  si falla.
- `src/mcp/ventasMcpServer.ts` - cuando esta empaquetado resuelve `DATABASE_URL`
  y el engine de Prisma con `resolvePrismaEnv()` (no depende del env heredado,
  porque `app-server` lanza los MCP con entorno restringido).
- `src/mcp/ventasMcpConfig.ts` - orden de resolucion del comando MCP:
  1. `VENTAS_MCP_CMD` + `VENTAS_MCP_ARGS`.
  2. Empaquetado: `distribuidora-ventas-mcp(.exe)` junto al sidecar.
  3. `dist/mcp/ventasMcpServer.js` con node (backend compilado en dev).
  4. `node --import tsx src/mcp/ventasMcpServer.ts` (desarrollo).
- `src/chat/codexResolver.ts` (nuevo) - resolucion cross-platform de Codex:
  - En Windows traduce shims `.cmd` de npm: primero busca el `codex.exe`
    nativo del paquete de plataforma; si no, `node <cli.js>`.
  - En macOS/Linux resuelve symlinks y el wrapper `codex.js` al binario
    nativo (`@openai/codex-<plataforma>/vendor/<triple>/bin/codex`).
  - `codexHomeInfo()` expone `{ path, fromEnv, authExists }`.
- `src/chat/codexService.ts` - usa el resolver (`resolvedInfo()`), pasa
  `prefixArgs` al proceso y `status()` agrega `codexCommand`, `codexSource` y
  `codexHome`. `CodexNotInstalledError` indica el comando buscado.
- `src/chat/jsonrpc.ts` - `prefixArgs` (p. ej. `node cli.js`), y en Windows el
  cierre usa `taskkill /pid <pid> /T /F` para no dejar huerfanos (SIGTERM no
  es un mecanismo real en Windows).
- `src/server.ts` - `ensureChatSchema` crea `ChatConversation` en bases
  existentes sin esa tabla (actualizaciones sin perder conversaciones), y
  `runWeeklyBackup` al arrancar.
- `src/routes/chat.ts` - ya no pasa `command` al `CodexService`: la resolucion
  queda en el resolver (respeta `CODEX_CLI_COMMAND` como override).
- `scripts/build-binary.js` (restaurado y ampliado) - compila los dos binarios
  con bun para el triple local y limpia los artefactos `<hash>.bun-build`.
- `scripts/copy-assets.js` (restaurado) - copia `schema.prisma`, el engine de
  Prisma a `dist/` y genera la DB semilla del instalador: **vacia, con el
  schema actual**, ejecutando `prisma db push` contra un archivo temporal
  (`--skip-generate`). Asi el cliente arranca sin datos y sin depender de la
  DB de desarrollo (que tiene WAL activo y no debe copiarse tal cual).

Frontend (`distribuidora-front`):

- `src/lib/chat.ts` - `ChatStatus` agrega `codexCommand`, `codexSource` y
  `codexHome` (solo diagnostico; nunca tokens).
- `src/routes/chat.tsx` - las tarjetas de instalacion/login muestran el
  comando buscado, la ruta de `CODEX_HOME` y si existe el archivo de sesion
  (util en maquinas nuevas).
- `src/routes/index.tsx` - la carga inicial del dashboard y de los filtros
  se reintenta (8 intentos x 800ms en la primera carga) para cubrir el
  arranque lento del sidecar en el primer launch.
- `scripts/setup-sidecar.js` - copia los DOS sidecars (backend + MCP) con el
  triple de Tauri y los resources (engine, schema, DB semilla).
- `src-tauri/tauri.conf.json` - `externalBin` incluye
  `binaries/distribuidora-ventas-mcp`.
- `src-tauri/src/main.rs` - warning de Rust corregido (`_child`).

### El wrapper de node y su causa

En la instalacion npm, `/opt/homebrew/bin/codex` es un symlink a
`@openai/codex/bin/codex.js`, un wrapper que ejecuta `node <cli.js>` y lanza
el binario nativo como hijo. La app empaquetada (lanzada desde Finder) tiene
PATH minimo (`/usr/bin:/bin:/usr/sbin:/sbin`) y no encuentra `node`, por lo
que `codex --version` fallaba con exit 127 y el chat reportaba
"Codex CLI no encontrado" (HTTP 503). La solucion fue resolver al binario
nativo que el paquete de plataforma incluye en
`vendor/<triple>/bin/codex(.exe)`, replicando la logica del propio wrapper.
En Windows pasa lo mismo con los shims `.cmd` de npm; se resuelve el
`codex.exe` nativo o, como fallback, `node <cli.js>`.

### Comportamiento verificado en vivo

| Caso | Resultado |
| --- | --- |
| `npm run package` (macOS arm64) | Dos binarios bun (`distribuidora-backend`, `distribuidora-ventas-mcp`) + assets; la semilla generada es una DB vacia (schema, 0 filas); sin artefactos `.bun-build` |
| Primer arranque empaquetado | DB vacia sembrada desde resources al data dir; backup semanal creado; `/health` OK en <1s |
| Primer arranque con semilla vacia | `Venta`, `Carga` y `ChatConversation` creadas; dashboard con 0 facturas y periodo vacio (estado correcto para el cliente) |
| Segundo arranque | No re-siembra ni mueve la DB (la base vacia con schema es valida) |
| DB sin tablas core en el data dir | Se mueve a `distribuidora.db.corrupt-<ts>` y se re-siembra (recuperacion de bases corruptas) |
| Instalacion existente sin `ChatConversation` | `ensureChatSchema` crea la tabla al arrancar y las conversaciones siguen funcionando |
| Entorno Finder (PATH minimo, sin CODEX_HOME) | `installed: true`, `authenticated: true`; `codexCommand` apunta al binario nativo (`source: "shim"`); `codexHome` = `~/.codex` con `authExists` |
| `GET /api/chat/models` en la app empaquetada | 4 modelos visibles con `defaultModel: "gpt-5.6-terra"` |
| Turno real con MCP compilado | SSE: `message.start` -> deltas -> `message.tool_call` (`ventas` / `resumen_ventas`) -> `message.completed`; respuesta con datos reales (3,838 facturas julio 2026) |
| Reinicio del sidecar | El historial persiste (conversaciones y mensajes releidos via `thread/read`) |
| Cierre con SIGTERM | app-server y el MCP hijo terminan; sin procesos huerfanos (en Windows se usa `taskkill /T`) |
| `tsc` backend, `tsc --noEmit` + `vite build` + lint frontend | Sin errores |

### Notas

- La restauracion de `scripts/build-binary.js` y `copy-assets.js` era
  obligatoria: los scripts fueron borrados por error en el commit 659fb21 y
  `npm run package` fallaba.
- La semilla del instalador se genera en cada `npm run package` con
  `prisma db push` sobre el schema vigente: siempre queda al dia con el
  schema y no arrastra datos de desarrollo ni WAL de la DB local.
- `CODEX_CLI_COMMAND` sigue siendo el override para simular "no instalado" en
  pruebas (`codex-inexistente`) y para forzar una ruta especifica.
- Para reconstruir la app con cambios de backend: `node scripts/setup-sidecar.js`
  (backend + sidecars) y despues `npm run tauri:build` (frontend). Si solo
  cambio el frontend, alcanza con `tauri:build`.
- El `.dmg` de macOS puede fallar por permisos de Automatizacion de Finder
  (`bundle_dmg.sh` usa AppleScript); el `.app` en
  `target/release/bundle/macos/` se puede copiar directamente a Aplicaciones.
- Restaurar un backup: cerrar la app, reemplazar `distribuidora.db` por el
  backup en el data dir, reabrir.

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
