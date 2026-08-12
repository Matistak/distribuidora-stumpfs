import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { getRouter } from "./router";
import { API_URL } from "./lib/api";
import "./styles.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Sin reintentos: si la petición falla se muestra el error directo.
      retry: false,
      // Sin caché por defecto: los datos se descartan al desmontar el
      // componente. Si un endpoint debe cachearse, se configura con
      // `staleTime`/`gcTime` en su queryOptions (src/lib/queries.ts).
      staleTime: 0,
      gcTime: 0,
      refetchOnWindowFocus: false,
    },
  },
});
const router = getRouter(queryClient);

// Necessary for TanStack Router SPA hydration
// @ts-expect-error router is not typed for window
window.__TSR_DEHYDRATED__ = undefined;

async function esperarBackend(timeoutMs = 30_000) {
  if (!API_URL) return;
  const limite = Date.now() + timeoutMs;
  while (Date.now() < limite) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 1_000);
    try {
      const res = await fetch(`${API_URL}/health`, { signal: controller.signal });
      if (res.ok) return;
    } catch {
      // The sidecar may still be starting or the probe may have timed out.
    } finally {
      window.clearTimeout(timeout);
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  console.warn("El backend no respondio a tiempo; se renderiza igual.");
}

const rootElement = document.getElementById("root")!;
const root = createRoot(rootElement);

esperarBackend().then(() => {
  root.render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>,
  );
});
