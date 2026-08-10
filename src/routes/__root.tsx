import { Link, Outlet, createRootRoute, useRouter, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  Bot,
  ClipboardList,
  FileSpreadsheet,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { useEffect } from "react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { UploadStateProvider } from "@/lib/upload-state";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootComponent() {
  return (
    <UploadStateProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <div className="flex min-h-svh flex-col">
            <div className="flex h-14 items-center gap-3 border-b border-border bg-card px-4 md:hidden">
              <SidebarTrigger />
              <span className="text-sm font-semibold">Distribuidora Stumpfs</span>
            </div>
            <Outlet />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </UploadStateProvider>
  );
}

function AppSidebar() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-3 px-2 py-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
            <Truck className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="truncate font-display text-base font-bold text-sidebar-primary">
              Stumpfs SA
            </p>
            <p className="truncate text-[10px] font-bold uppercase tracking-[0.16em] text-sidebar-foreground/60">
              Distribuidora
            </p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-[0.16em] text-sidebar-foreground/50">
            Menú principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarNavItem
                to="/"
                label="Tablero Comercial"
                icon={BarChart3}
                active={pathname === "/"}
              />
              <SidebarNavItem
                to="/carga"
                label="Cargar Excel"
                icon={FileSpreadsheet}
                active={pathname.startsWith("/carga")}
              />
              <SidebarNavItem
                to="/ventas"
                label="Ventas"
                icon={ClipboardList}
                active={pathname.startsWith("/ventas")}
              />
              <SidebarNavItem
                to="/chat"
                label="Asistente IA"
                icon={Bot}
                active={pathname.startsWith("/chat")}
              />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <div className="mt-auto border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-sidebar-primary text-[11px] font-bold text-sidebar-primary-foreground">
            JS
          </span>
          <div className="min-w-0 text-xs">
            <p className="truncate font-semibold text-sidebar-foreground">Pedro Stumpfs</p>
            <p className="truncate text-sidebar-foreground/60">Director General</p>
          </div>
        </div>
      </div>
    </Sidebar>
  );
}

function SidebarNavItem({
  to,
  label,
  icon: Icon,
  active,
}: {
  to: "/" | "/carga" | "/ventas" | "/chat";
  label: string;
  icon: LucideIcon;
  active: boolean;
}) {
  const { setOpenMobile } = useSidebar();

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={active} tooltip={label}>
        <Link to={to} onClick={() => setOpenMobile(false)}>
          <Icon />
          <span>{label}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
