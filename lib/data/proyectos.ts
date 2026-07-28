import { SupabaseClient } from "@supabase/supabase-js";
import { ProyectoConDetalle, calcularEstadoCumplimiento } from "@/lib/types";

// Las fases se leen siempre directo de la base de datos.
export async function obtenerFasesOrdenadas(supabase: SupabaseClient) {
  const { data } = await supabase.from("fases").select("*").order("orden");
  return data ?? [];
}

async function enriquecerProyectos(
  supabase: SupabaseClient,
  proyectos: any[]
): Promise<ProyectoConDetalle[]> {
  if (proyectos.length === 0) return [];

  const [{ data: etapas }, { data: usuarios }, { data: fases }, { data: itemsMulti }] = await Promise.all([
    supabase.from("etapas_definicion").select("*"),
    supabase.from("usuarios").select("*"),
    supabase.from("fases").select("*"),
    supabase
      .from("checklist_items_definicion")
      .select("id, etapa_id, usuario_asignado_id")
      .not("usuario_asignado_id", "is", null),
  ]);

  const etapasPorId = new Map((etapas ?? []).map((e) => [e.id, e]));
  const usuariosPorId = new Map((usuarios ?? []).map((u) => [u.id, u]));
  const fasesPorId = new Map((fases ?? []).map((f) => [f.id, f]));

  // Para las etapas de 3 personas, se necesita saber quién ya marcó
  // su parte y quién falta, para cada proyecto en particular.
  const idsItemsMulti = (itemsMulti ?? []).map((i: any) => i.id);
  const proyectoIds = proyectos.map((p) => p.id);
  let instanciasMulti: any[] = [];
  if (idsItemsMulti.length > 0) {
    const { data } = await supabase
      .from("checklist_instancia")
      .select("proyecto_id, item_definicion_id, completado")
      .in("proyecto_id", proyectoIds)
      .in("item_definicion_id", idsItemsMulti);
    instanciasMulti = data ?? [];
  }

  return proyectos.map((p: any) => {
    const etapa = etapasPorId.get(p.etapa_actual_id);
    const fase = etapa ? fasesPorId.get(etapa.fase_id) : undefined;
    const responsable = usuariosPorId.get(p.responsable_actual_id);

    let responsableNombre = "—";

    if (etapa?.multi_responsable) {
      // Solo se muestran los nombres de quienes TODAVÍA NO marcaron
      // su parte — quien ya completó la suya deja de figurar acá.
      const itemsDeEstaEtapa = (itemsMulti ?? []).filter((i: any) => i.etapa_id === etapa.id);
      const faltantes = itemsDeEstaEtapa
        .filter((item: any) => {
          const instancia = instanciasMulti.find(
            (ins) => ins.proyecto_id === p.id && ins.item_definicion_id === item.id
          );
          return !instancia || !instancia.completado;
        })
        .map((item: any) => usuariosPorId.get(item.usuario_asignado_id)?.nombre)
        .filter(Boolean);
      responsableNombre = faltantes.length > 0 ? faltantes.join(", ") : "Todos completaron";
    } else if (etapa?.rol_id === "administrador") {
      responsableNombre = "Administrador";
    } else {
      responsableNombre = responsable?.nombre ?? "—";
    }

    return {
      ...p,
      cliente_nombre: p.nombre_agricultor ?? "—",
      etapa_nombre: etapa?.nombre ?? "—",
      etapa_orden: etapa?.orden ?? 0,
      fase_id: etapa?.fase_id ?? "",
      fase_nombre: fase?.nombre ?? "—",
      responsable_nombre: responsableNombre,
      fuente_financiamiento: p.datos_formulario?.fuente_financiamiento ?? null,
      porcentaje_avance: Math.round(((etapa?.orden ?? 0) / 27) * 100),
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

  const { data: etapas } = await supabase
    .from("etapas_definicion")
    .select("id, rol_id, multi_responsable, requiere_montos");
  const etapaInfoPorId = new Map((etapas ?? []).map((e: any) => [e.id, e]));

  // Ítems de checklist de etapas de 3 personas asignados a MÍ,
  // junto con su estado (para saber si ya marqué mi parte o no).
  const { data: misItemsMulti } = await supabase
    .from("checklist_items_definicion")
    .select("id, etapa_id")
    .eq("usuario_asignado_id", usuarioId);
  const misItemsPorEtapa = new Map((misItemsMulti ?? []).map((i: any) => [i.etapa_id, i.id]));

  const idsMisItems = (misItemsMulti ?? []).map((i: any) => i.id);
  let misInstancias: any[] = [];
  if (idsMisItems.length > 0) {
    const { data } = await supabase
      .from("checklist_instancia")
      .select("proyecto_id, item_definicion_id, completado")
      .in("item_definicion_id", idsMisItems);
    misInstancias = data ?? [];
  }

  return todos.filter((p) => {
    if (p.responsable_actual_id === usuarioId) return true;

    const info = etapaInfoPorId.get(p.etapa_actual_id);
    if (!info) return false;

    // Administrador ve cualquier proyecto en etapa de Administrador.
    if (usuario?.rol_id === "administrador" && info.rol_id === "administrador") return true;

    // Administrador también ve las etapas que requieren montos de
    // postulación, aunque el checklist general sea de otro rol.
    if (usuario?.rol_id === "administrador" && info.requiere_montos) return true;

    // Etapas de 3 personas: aparece SOLO si todavía no marqué mi
    // propio ítem — apenas lo marco, deja de aparecerme a mí, y
    // sigue viéndose para quienes falten.
    if (info.multi_responsable) {
      const miItemId = misItemsPorEtapa.get(p.etapa_actual_id);
      if (miItemId) {
        const miInstancia = misInstancias.find(
          (ins) => ins.proyecto_id === p.id && ins.item_definicion_id === miItemId
        );
        const yaCompleteMiParte = miInstancia?.completado === true;
        if (!yaCompleteMiParte) return true;
      }
    }

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
