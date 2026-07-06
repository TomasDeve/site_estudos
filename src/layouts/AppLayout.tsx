import { NavLink, Outlet } from "react-router";
import { Home, CalendarCheck, BarChart3, Wrench, LogOut } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/AuthProvider";

const nav = [
  { to: "/", label: "Início", icon: Home, end: true },
  { to: "/metas", label: "Metas", icon: CalendarCheck, end: false },
  { to: "/metricas", label: "Métricas", icon: BarChart3, end: false },
  { to: "/apoio", label: "Apoio", icon: Wrench, end: false },
];

function navClass(isActive: boolean, base: string) {
  return `${base} ${
    isActive ? "bg-gold/12 text-gold" : "text-dim hover:bg-navy-700/70 hover:text-txt"
  }`;
}

export function AppLayout() {
  const { session } = useAuth();

  return (
    <div className="min-h-dvh md:flex">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-line/50 bg-navy-900/90 md:flex">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <span className="text-2xl">🎯</span>
          <div>
            <p className="text-sm font-bold leading-tight">Meus Estudos</p>
            <p className="text-[11px] text-mut">Concursos</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                navClass(
                  isActive,
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors"
                )
              }
            >
              <Icon className="size-4.5" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-line/40 px-4 py-4">
          <p className="truncate text-[11px] text-mut">{session?.user.email}</p>
          <button
            onClick={() => supabase.auth.signOut()}
            className="mt-2 flex cursor-pointer items-center gap-2 text-xs text-dim transition-colors hover:text-red"
          >
            <LogOut className="size-3.5" /> Sair
          </button>
        </div>
      </aside>

      {/* Topo mobile */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-line/50 bg-navy-900/95 px-4 py-3 backdrop-blur md:hidden">
        <div className="flex items-center gap-2">
          <span className="text-xl">🎯</span>
          <span className="text-sm font-bold">Meus Estudos</span>
        </div>
        <button
          onClick={() => supabase.auth.signOut()}
          className="cursor-pointer p-1 text-mut hover:text-red"
          aria-label="Sair"
        >
          <LogOut className="size-4" />
        </button>
      </header>

      {/* Conteúdo */}
      <main className="min-w-0 flex-1 pb-20 md:ml-60 md:pb-8">
        <div className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6 md:py-8">
          <Outlet />
        </div>
      </main>

      {/* Tab bar mobile */}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-line/50 bg-navy-900/95 backdrop-blur md:hidden">
        {nav.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              navClass(
                isActive,
                "flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors"
              )
            }
          >
            <Icon className="size-5" />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
