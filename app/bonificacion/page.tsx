import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { obtenerUsuarioActual } from "@/lib/data/proyectos";
import { NavBar } from "@/components/NavBar";
import { BonificacionProfesionales } from "@/components/bonificacion/BonificacionProfesionales";
import {
  aConfig,
  aPago,
  aPrograma,
  aProyecto,
  type ProyectoApp,
} from "@/lib/bonificacion";

export const dynamic = "force-dynamic";

export default async function BonificacionPage() {
  const supabase = await createClient();

  const usuario = await obtenerUsuarioActual(supabase);
  if (!usuario) redirect("/login");

  // El rol de solo lectura no ve esta pestaña. Además de este
  // redirect, la base de datos (RLS) le niega los datos igualmente.
  if (usuario.rol_id === "visualizador") redirect("/proyectos");

  const [programas, proyectos, pagos, config, proyectosApp] = await Promise.all([
    supabase.from("bonif_programas").select("*").order("orden", { ascending: true }),
    supabase.from("bonif_proyectos").select("*").order("fecha_adjudicacion", { ascending: false }),
    supabase.from("bonif_pagos").select("*").order("fecha", { ascending: false }),
    supabase.from("bonif_config").select("*").eq("id", 1).maybeSingle(),
    supabase
      .from("proyectos")
      .select("id, codigo_proyecto, nombre_agricultor, datos_formulario")
      .order("codigo_proyecto", { ascending: true }),
  ]);

  const errorTablas = programas.error || proyectos.error || pagos.error || config.error;
  if (errorTablas) {
    return (
      <div className="min-h-screen">
        <NavBar />
        <main className="p-5 max-w-3xl mx-auto">
          <p className="font-medium text-base mb-2">Bonificación Profesionales</p>
          <p className="text-base" style={{ color: "var(--text-secondary)" }}>
            No se pudieron cargar los datos. Si es la primera vez que se abre esta pestaña, falta
            ejecutar la migración 028 (bonificacion_profesionales) en Supabase.
          </p>
          <p className="text-sm mt-2" style={{ color: "var(--text-secondary)" }}>
            Detalle: {errorTablas.message}
          </p>
        </main>
      </div>
    );
  }

  const listaProyectosApp: ProyectoApp[] = (proyectosApp.data ?? []).map((p: any) => {
    const monto = Number(p.datos_formulario?.monto_total_proyecto);
    return {
      id: p.id,
      codigo_proyecto: p.codigo_proyecto ?? "",
      nombre_agricultor: p.nombre_agricultor ?? "",
      monto_total: Number.isFinite(monto) && monto > 0 ? monto : null,
    };
  });

  return (
    <div className="min-h-screen">
      <NavBar />
      <main className="p-4 sm:p-5 max-w-6xl mx-auto">
        <p className="font-medium text-lg mb-1">Bonificación Profesionales</p>
        <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
          Registro de proyectos adjudicados, bonos generados y pagos a los profesionales.
        </p>
        <BonificacionProfesionales
          usuarioId={usuario.id}
          programasIniciales={(programas.data ?? []).map(aPrograma)}
          proyectosIniciales={(proyectos.data ?? []).map(aProyecto)}
          pagosIniciales={(pagos.data ?? []).map(aPago)}
          configInicial={aConfig(config.data)}
          proyectosApp={listaProyectosApp}
        />
      </main>
    </div>
  );
}
