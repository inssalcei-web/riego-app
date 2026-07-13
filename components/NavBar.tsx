"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const TABS = [
  { href: "/proyectos", label: "Proyectos activos" },
  { href: "/mis-tareas", label: "Mis tareas" },
  { href: "/kpis", label: "KPIs e informes" },
];

export function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function cerrarSesion() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <header
      className="flex items-center justify-between px-5 py-3 border-b"
      style={{ borderColor: "var(--border-default)" }}
    >
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: "#3B82F6" }}>
            <span className="text-white text-xs">💧</span>
          </div>
          <span className="font-medium text-sm">Riego App</span>
        </div>

        <nav className="flex gap-1">
          {TABS.map((tab) => {
            const activo = pathname?.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="text-sm px-3 py-1.5 rounded-md"
                style={{
                  color: activo ? "#3B82F6" : "var(--text-secondary)",
                  background: activo ? "var(--status-on-track-bg, transparent)" : "transparent",
                  fontWeight: activo ? 500 : 400,
                }}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <button
        onClick={cerrarSesion}
        className="text-xs"
        style={{ color: "var(--text-secondary)" }}
      >
        Cerrar sesión
      </button>
    </header>
  );
}
