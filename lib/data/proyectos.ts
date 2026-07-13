import { SupabaseClient } from "@supabase/supabase-js";
import { ProyectoConDetalle, calcularEstadoCumplimiento } from "@/lib/types";
import flujoConfig from "@/lib/flujo-config.json";

// Mapas rápidos en memoria a partir de la config real (30 etapas, fases, roles)
const etapasPorId = new Map(
  flujoConfig.etapas.map((e) => [e.orden, e]) // se resuelve por orden -> id real viene de la BD
);
const fasesPorId = new Map(flujoConfig.fases.map((f) => [f.id, f]));

// Trae todos los proyectos activos con la info necesaria para el tablero Kanban
export async function obtenerProyectosActivos(
  supabase: SupabaseClient
): Promise<ProyectoConDetalle[]> {
  const { data, error } = await supabase
    .from("proyectos")
    .select(
      `
      *,
      clientes ( nombre ),
      etapas_definicion ( id, orden, nombre, fase_id ),
      usuarios!proyectos_responsable_actual_id_fkey ( nombre )
    `
    )
    .eq("finalizado", false)
    .order("creado_en", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((p: any) => {
    const fase = fasesPorId.get(p.etapas_definicion.fase_id);
    return {
      ...p,
      cliente_nombre: p.clientes?.nombre ?? "—",
      etapa_nombre: p.etapas_definicion?.nombre ?? "—",
      etapa_orden: p.etapas_definicion?.orden ?? 0,
      fase_id: p.etapas_definicion?.fase_id ?? "",
      fase_nombre: fase?.nombre ?? "—",
      responsable_nombre: p.usuarios?.nombre ?? "—",
      porcentaje_avance: Math.round((p.etapas_definicion.orden / 30) * 100),
      estado_cumplimiento: calcularEstadoCumplimiento(p.fecha_objetivo, p.finalizado),
    };
  });
}

// Trae solo los proyectos donde el usuario conectado es el responsable actual
export async function obtenerMisProyectos(
  supabase: SupabaseClient,
  usuarioId: string
): Promise<ProyectoConDetalle[]> {
  const todos = await obtenerProyectosActivos(supabase);
  return todos.filter((p) => p.responsable_actual_id === usuarioId);
}

// Trae el usuario de la tabla `usuarios` correspondiente a la sesión de Supabase Auth
export async function obtenerUsuarioActual(supabase: SupabaseClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("usuarios")
    .select("*")
    .eq("auth_user_id", user.id)
    .single();

  return data;
}

export const FASES_ORDENADAS = flujoConfig.fases;
