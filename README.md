# Distribuidora

Aplicación de escritorio para importar Excels de ventas y consultar un dashboard
comercial. Está pensada para una sola persona y utiliza SQLite como base local.

El volumen esperado es de aproximadamente 25.000 filas por mes. La información
se conserva entre sesiones en la base SQLite administrada por el backend local.

## Arquitectura

```text
React + Tauri
       |
Fastify local como sidecar
       |
Prisma + SQLite
```

- Frontend: React, TypeScript y Vite.
- Backend: proyecto hermano `../distribuidora-backend`.
- Base de datos: SQLite.
- API: Fastify en `127.0.0.1:3001`.
- API del frontend: `src/lib/api.ts`.

La documentación de endpoints, persistencia y reglas de importación está en
`BACKEND.md`. El trabajo pendiente está organizado en `plan.md`.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://distribuidora-stumpfs.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/fb39b15d-08a0-48bd-b16e-6ffc7f77ac4e).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Desarrollo

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
npm i
npm run dev:mock
```

El modo mock es el predeterminado para Lovable: procesa el Excel en el
navegador y no persiste datos. Para conectarte al backend local y guardar en
SQLite, iniciá el backend en otra terminal y levantá el frontend con:

```sh
npm run dev:back
```

También podés usar `npm run dev`, que es un alias de `npm run dev:mock`.

En otra terminal, iniciar el backend:

```sh
cd ../distribuidora-backend
npm i
npm run db:generate
npm run db:push
npm run dev
```

Los modos están definidos en `.env.mock` y `.env.back`. El modo `back` usa
`VITE_API_URL=http://localhost:3001`; el modo `mock` deja esa variable vacía.

## Empaquetado de escritorio

El backend se compila como sidecar y Tauri lo inicia junto con la aplicación:

```sh
node scripts/setup-sidecar.js
npm run tauri:build
```

Tauri usa automáticamente el modo `back` tanto en desarrollo como al compilar,
para que la aplicación de escritorio conserve los datos en SQLite.

La base incluida en `src-tauri/resources/` es únicamente una semilla. La base
activa se copia al directorio de datos de la aplicación para que los datos no se
pierdan al actualizar el instalador.
