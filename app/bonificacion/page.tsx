import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { obtenerUsuarioActual } from "@/lib/data/proyectos";
import { NavBar } from "@/components/NavBar";
import { BonificacionProfesionales } from "@/components/bonificacion/BonificacionProfesionales";
import {
  aConfig,
  aPago,
  aPrograma,
  aPanelPropio,
  aProyecto,
  type ProyectoApp,
} from "@/lib/bonificacion";

const ROLES_GESTION_BONIFICACION = ["gerente_general", "administrador"];

export const dynamic = "force-dynamic";

export default async function BonificacionPage() {
  const supabase = await createClient();

  const usuario = await obtenerUsuarioActual(supabase);
  if (!usuario) redirect("/login");

  // Gerente general y administrador gestionan todo. Cualquier otra
  // persona solo entra si está vinculada a uno de los tres
  // profesionales, y ve únicamente lo suyo en modo lectura. La base
  // de datos aplica estas mismas reglas (RLS y bonif_mi_panel), no
  // solo esta pantalla.
  if (!ROLES_GESTION_BONIFICACION.includes(usuario.rol_id)) {
    const { data: panelJson, error: errorPanel } = await supabase.rpc("bonif_mi_panel");
    const panel = errorPanel ? null : aPanelPropio(panelJson);
    if (!panel) redirect("/proyectos");

    // Los porcentajes de todos los programas son visibles para los
    // profesionales (transparencia); lo demás es solo lo suyo.
    const { data: programasData } = await supabase
      .from("bonif_programas")
      .select("*")
      .order("orden", { ascending: true });

    return (
      <div className="min-h-screen">
        <NavBar />
        <main className="p-4 sm:p-5 max-w-6xl mx-auto">
          <p className="font-medium text-lg mb-1">Mi bonificación — {panel.profesional.nombre}</p>
          <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
            Solo lectura. Aquí ves tu información (proyectos, bonos y pagos) y los porcentajes de
            bonificación de cada programa.
          </p>
          <BonificacionProfesionales
            soloLectura
            visibles={[panel.profesional]}
            usuarioId={usuario.id}
            programasIniciales={(programasData ?? []).map(aPrograma)}
            proyectosIniciales={panel.proyectos}
            pagosIniciales={panel.pagos}
            configInicial={panel.config}
            proyectosApp={[]}
          />
        </main>
      </div>
    );
  }

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
