"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ThemeToggle } from "@/components/ThemeToggle";

const TABS = [
  { href: "/proyectos", label: "Proyectos activos" },
  { href: "/mis-tareas", label: "Mis tareas" },
  { href: "/kpis", label: "KPIs e informes", soloRoles: ["gerente_general", "administrador"] },
];

export function NavBar() {
  const pathname = usePathname();
  const supabase = createClient();
  const [rol, setRol] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("usuarios").select("rol_id").eq("auth_user_id", user.id).single();
      setRol(data?.rol_id ?? null);
    })();
  }, []);

  async function cerrarSesion() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  const tabsVisibles = TABS.filter((tab) => !tab.soloRoles || (rol && tab.soloRoles.includes(rol)));

  return (
    <header
      className="border-b"
      style={{ borderColor: "var(--border-default)", background: "var(--surface-card)" }}
    >
      <div className="flex items-center justify-between px-4 sm:px-5 py-2.5 gap-3">
        <img src="/logo.png" alt="INSSAL" className="h-7 sm:h-8 shrink-0" />

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <ThemeToggle />
          <button
            onClick={cerrarSesion}
            className="text-xs whitespace-nowrap"
            style={{ color: "var(--text-secondary)" }}
          >
            Cerrar sesión
          </button>
        </div>
      </div>

      {/* Las pestañas van en su propia fila, con scroll horizontal si
          no entran en pantallas angostas (celular) — así nunca se
          cortan ni obligan a hacer zoom out. */}
      <nav
        className="flex gap-1 px-3 sm:px-4 pb-2 overflow-x-auto"
        style={{ scrollbarWidth: "none" }}
      >
        {tabsVisibles.map((tab) => {
          const activo = pathname?.startsWith(tab.href);
          return (
            <a
              key={tab.href}
              href={tab.href}
              className="text-sm px-3 py-1.5 rounded-md whitespace-nowrap"
              style={{
                color: activo ? "#3B82F6" : "var(--text-secondary)",
                background: activo ? "var(--surface-page)" : "transparent",
                fontWeight: activo ? 500 : 400,
              }}
            >
              {tab.label}
            </a>
          );
        })}
      </nav>
    </header>
  );
}
