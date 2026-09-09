"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ThemeToggle } from "@/components/ThemeToggle";

const TABS = [
  { href: "/proyectos", label: "Proyectos activos" },
  { href: "/mis-tareas", label: "Mis tareas" },
  { href: "/archivados", label: "Archivados" },
  { href: "/kpis", label: "KPIs e informes" },
];

const CLAVE_SESION = "riego-app-sesion-id";
const CLAVE_INICIO_SESION = "riego-app-sesion-iniciada-en";
const INTERVALO_LATIDO_MS = 60_000;

function formatoFechaCorta(iso: string) {
  return new Date(iso).toLocaleString("es-CL", { dateStyle: "short", timeStyle: "short" });
}

export function NavBar() {
  const pathname = usePathname();
  const supabase = createClient();
  const [rol, setRol] = useState<string | null>(null);
  const [nombreUsuario, setNombreUsuario] = useState<string | null>(null);
  const [ultimaConexionAnterior, setUltimaConexionAnterior] = useState<string | null>(null);
  const sesionIdRef = useRef<string | null>(null);
  const iniciadaEnRef = useRef<string | null>(null);

  useEffect(() => {
    let intervalo: ReturnType<typeof setInterval> | null = null;

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("usuarios").select("id, rol_id, nombre").eq("auth_user_id", user.id).single();
      setRol(data?.rol_id ?? null);
      setNombreUsuario(data?.nombre ?? null);
      if (!data?.id) return;

      // "Última conexión": la sesión anterior a la que se está
      // iniciando ahora mismo (así se puede mostrar "estuviste acá
      // por última vez el ..." en vez de la sesión actual).
      const { data: sesionAnterior } = await supabase
        .from("sesiones_usuario")
        .select("iniciada_en")
        .eq("usuario_id", data.id)
        .order("iniciada_en", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (sesionAnterior) setUltimaConexionAnterior(sesionAnterior.iniciada_en);

      // Una fila de sesiones_usuario = una pestaña abierta, desde
      // que se abre hasta que se cierra (sessionStorage es por
      // pestaña). Mientras la pestaña siga abierta y visible, se
      // manda un "latido" cada minuto que extiende su duración.
      let sesionId = sessionStorage.getItem(CLAVE_SESION);
      let iniciadaEn = sessionStorage.getItem(CLAVE_INICIO_SESION);

      if (!sesionId) {
        const { data: nueva } = await supabase
          .from("sesiones_usuario")
          .insert({ usuario_id: data.id })
          .select("id, iniciada_en")
          .single();
        if (nueva) {
          sesionId = nueva.id as string;
          iniciadaEn = nueva.iniciada_en as string;
          sessionStorage.setItem(CLAVE_SESION, sesionId);
          sessionStorage.setItem(CLAVE_INICIO_SESION, iniciadaEn);
        }
      }

      sesionIdRef.current = sesionId;
      iniciadaEnRef.current = iniciadaEn;

      async function latir() {
        if (!sesionIdRef.current || !iniciadaEnRef.current) return;
        const ahora = Date.now();
        const duracionSegundos = Math.max(0, Math.floor((ahora - new Date(iniciadaEnRef.current).getTime()) / 1000));
        await supabase
          .from("sesiones_usuario")
          .update({ ultima_actividad: new Date(ahora).toISOString(), duracion_segundos: duracionSegundos })
          .eq("id", sesionIdRef.current);
      }

      await latir();
      intervalo = setInterval(() => {
        if (document.visibilityState === "visible") latir();
      }, INTERVALO_LATIDO_MS);
    })();

    return () => {
      if (intervalo) clearInterval(intervalo);
    };
  }, []);

  async function cerrarSesion() {
    sessionStorage.removeItem(CLAVE_SESION);
    sessionStorage.removeItem(CLAVE_INICIO_SESION);
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  // El rol "visualizador" (solo lectura) ve el tablero de proyectos
  // y el detalle de cada uno, pero no el panel de KPIs.
  const tabsVisibles = rol === "visualizador" ? TABS.filter((t) => t.href !== "/kpis") : TABS;

  return (
    <header
      className="border-b"
      style={{ borderColor: "var(--border-default)", background: "var(--surface-card)" }}
    >
      <div className="flex items-center justify-between px-4 sm:px-5 py-2.5 gap-3">
        <img src="/logo.png" alt="INSSAL" className="h-7 sm:h-8 shrink-0" />

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {nombreUsuario && (
            <span
              className="text-sm whitespace-nowrap hidden sm:flex flex-col items-end leading-tight"
              style={{ color: "var(--text-secondary)" }}
            >
              <span>
                Usuario activo: <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{nombreUsuario}</span>
              </span>
              {ultimaConexionAnterior && (
                <span className="text-sm" style={{ color: "var(--text-secondary)", opacity: 0.75 }}>
                  Última conexión: {formatoFechaCorta(ultimaConexionAnterior)}
                </span>
              )}
            </span>
          )}
          <ThemeToggle />
          <button
            onClick={cerrarSesion}
            className="text-sm whitespace-nowrap"
            style={{ color: "var(--text-secondary)" }}
          >
            Cerrar sesión
          </button>
        </div>
      </div>

      {nombreUsuario && (
        <p
          className="text-sm px-4 -mt-1 mb-1 sm:hidden"
          style={{ color: "var(--text-secondary)" }}
        >
          Usuario activo: <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{nombreUsuario}</span>
        </p>
      )}

      <nav
        className="flex gap-1 px-3 sm:px-4 pb-2 overflow-x-auto"
        style={{ scrollbarWidth: "none" }}
      >
        {tabsVisibles.map((tab) => {
          const activo = pathname?.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              prefetch
              className="text-base px-3 py-1.5 rounded-md whitespace-nowrap"
              style={{
                color: activo ? "#3B82F6" : "var(--text-secondary)",
                background: activo ? "var(--surface-page)" : "transparent",
                fontWeight: activo ? 500 : 400,
              }}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
