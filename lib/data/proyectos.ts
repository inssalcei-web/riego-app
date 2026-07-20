import { SupabaseClient } from "@supabase/supabase-js";
import { ProyectoConDetalle, calcularEstadoCumplimiento } from "@/lib/types";
import flujoConfig from "@/lib/flujo-config.json";

const fasesPorId = new Map(flujoConfig.fases.map((f) => [f.id, f]));

async function enriquecerProyectos(
  supabase: SupabaseClient,
  proyectos: any[]
): Promise<ProyectoConDetalle[]> {
  if (proyectos.length === 0) return [];

  const [{ data: etapas }, { data: usuarios }] = await Promise.all([
    supabase.from("etapas_definicion").select("*"),
    supabase.from("usuarios").select("*"),
  ]);

  const etapasPorId = new Map((etapas ?? []).map((e) => [e.id, e]));
  const usuariosPorId = new Map((usuarios ?? []).map((u) => [u.id, u]));

  return proyectos.map((p: any) => {
    const etapa = etapasPorId.get(p.etapa_actual_id);
    const fase = etapa ? fasesPorId.get(etapa.fase_id) : undefined;
    const responsable = usuariosPorId.get(p.responsable_actual_id);

    // Para etapas de Administrador (responsabilidad compartida) o de
    // varias personas (etapas 9 y 16), se muestra un texto genérico
    // en vez de un solo nombre, porque no hay un único dueño.
    const responsableNombre = etapa?.multi_responsable
      ? "Varios responsables"
      : etapa?.rol_id === "administrador"
      ? "Administrador"
      : responsable?.nombre ?? "—";

    return {
      ...p,
      cliente_nombre: p.nombre_agricultor ?? "—",
      etapa_nombre: etapa?.nombre ?? "—",
      etapa_orden: etapa?.orden ?? 0,
      fase_id: etapa?.fase_id ?? "",
      fase_nombre: fase?.nombre ?? "—",
      responsable_nombre: responsableNombre,
      fuente_financiamiento: p.datos_formulario?.fuente_financiamiento ?? null,
      porcentaje_avance: Math.round(((etapa?.orden ?? 0) / 30) * 100),
      estado_cumplimiento: calcularEstadoCumplimiento(p.fecha_objetivo, p.finalizado),
    };
  });
}

export async function obtenerProyectosActivos(
  supabase: SupabaseClient
): Promise<ProyectoConDetalle[]> {
  const { data: proyectos, error } = await supabase
    .from("proyectos")
    .select("*")
    .eq("finalizado", false)
    .order("creado_en", { ascending: false });

  if (error) throw error;
  return enriquecerProyectos(supabase, proyectos ?? []);
}

export async function obtenerProyectosTerminados(
  supabase: SupabaseClient
): Promise<ProyectoConDetalle[]> {
  const { data: proyectos, error } = await supabase
    .from("proyectos")
    .select("*")
    .eq("finalizado", true)
    .order("creado_en", { ascending: false });

  if (error) throw error;
  return enriquecerProyectos(supabase, proyectos ?? []);
}

export async function obtenerMisProyectos(
  supabase: SupabaseClient,
  usuarioId: string
): Promise<ProyectoConDetalle[]> {
  const { data: usuario } = await supabase
    .from("usuarios")
    .select("rol_id")
    .eq("id", usuarioId)
    .single();

  const todos = await obtenerProyectosActivos(supabase);
  const { data: etapas } = await supabase.from("etapas_definicion").select("id, rol_id, multi_responsable");
  const etapaInfoPorId = new Map((etapas ?? []).map((e: any) => [e.id, e]));

  // Etapas donde este usuario tiene un ítem de checklist asignado a
  // su nombre (las de 3 personas, etapas 9 y 16).
  const { data: itemsAsignados } = await supabase
    .from("checklist_items_definicion")
    .select("etapa_id")
    .eq("usuario_asignado_id", usuarioId);
  const etapasAsignadasAlUsuario = new Set((itemsAsignados ?? []).map((i: any) => i.etapa_id));

  return todos.filter((p) => {
    if (p.responsable_actual_id === usuarioId) return true;

    const info = etapaInfoPorId.get(p.etapa_actual_id);
    if (!info) return false;

    // Los administradores ven cualquier proyecto que esté en una
    // etapa de Administrador, sin importar quién quedó como
    // "responsable" puntual en la base de datos.
    if (usuario?.rol_id === "administrador" && info.rol_id === "administrador") return true;

    // Etapas de 3 personas (9 y 16): aparece para cualquiera que
    // tenga un ítem de checklist asignado a su nombre ahí.
    if (info.multi_responsable && etapasAsignadasAlUsuario.has(p.etapa_actual_id)) return true;

    return false;
  });
}

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
