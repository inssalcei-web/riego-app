import { SupabaseClient } from "@supabase/supabase-js";
import { ProyectoConDetalle, calcularEstadoCumplimiento } from "@/lib/types";
import flujoConfig from "@/lib/flujo-config.json";

// Se evita pedirle a Supabase que una las tablas automáticamente
// (eso causaba el error PGRST201 por relaciones ambiguas). En vez
// de eso, se traen las tablas por separado y se unen acá mismo,
// en JavaScript — más simple y sin depender de que Supabase adivine
// bien la relación correcta.

const fasesPorId = new Map(flujoConfig.fases.map((f) => [f.id, f]));

export async function obtenerProyectosActivos(
  supabase: SupabaseClient
): Promise<ProyectoConDetalle[]> {
  const { data: proyectos, error } = await supabase
    .from("proyectos")
    .select("*")
    .eq("finalizado", false)
    .order("creado_en", { ascending: false });

  if (error) throw error;
  if (!proyectos || proyectos.length === 0) return [];

  const [{ data: clientes }, { data: etapas }, { data: usuarios }] = await Promise.all([
    supabase.from("clientes").select("*"),
    supabase.from("etapas_definicion").select("*"),
    supabase.from("usuarios").select("*"),
  ]);

  const clientesPorId = new Map((clientes ?? []).map((c) => [c.id, c]));
  const etapasPorId = new Map((etapas ?? []).map((e) => [e.id, e]));
  const usuariosPorId = new Map((usuarios ?? []).map((u) => [u.id, u]));

  return proyectos.map((p: any) => {
    const etapa = etapasPorId.get(p.etapa_actual_id);
    const fase = etapa ? fasesPorId.get(etapa.fase_id) : undefined;
    const cliente = clientesPorId.get(p.cliente_id);
    const responsable = usuariosPorId.get(p.responsable_actual_id);

    return {
      ...p,
      cliente_nombre: cliente?.nombre ?? "—",
      etapa_nombre: etapa?.nombre ?? "—",
      etapa_orden: etapa?.orden ?? 0,
      fase_id: etapa?.fase_id ?? "",
      fase_nombre: fase?.nombre ?? "—",
      responsable_nombre: responsable?.nombre ?? "—",
      porcentaje_avance: Math.round(((etapa?.orden ?? 0) / 30) * 100),
      estado_cumplimiento: calcularEstadoCumplimiento(p.fecha_objetivo, p.finalizado),
    };
  });
}

export async function obtenerMisProyectos(
  supabase: SupabaseClient,
  usuarioId: string
): Promise<ProyectoConDetalle[]> {
  const todos = await obtenerProyectosActivos(supabase);
  return todos.filter((p) => p.responsable_actual_id === usuarioId);
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

export async function obtenerProyectosTerminados(
  supabase: SupabaseClient
): Promise<ProyectoConDetalle[]> {
  const { data: proyectos, error } = await supabase
    .from("proyectos")
    .select("*")
    .eq("finalizado", true)
    .order("creado_en", { ascending: false });

  if (error) throw error;
  if (!proyectos || proyectos.length === 0) return [];

  const [{ data: clientes }, { data: etapas }, { data: usuarios }] = await Promise.all([
    supabase.from("clientes").select("*"),
    supabase.from("etapas_definicion").select("*"),
    supabase.from("usuarios").select("*"),
  ]);

  const clientesPorId = new Map((clientes ?? []).map((c) => [c.id, c]));
  const etapasPorId = new Map((etapas ?? []).map((e) => [e.id, e]));
  const usuariosPorId = new Map((usuarios ?? []).map((u) => [u.id, u]));

  return proyectos.map((p: any) => {
    const etapa = etapasPorId.get(p.etapa_actual_id);
    const cliente = clientesPorId.get(p.cliente_id);
    const responsable = usuariosPorId.get(p.responsable_actual_id);

    return {
      ...p,
      cliente_nombre: cliente?.nombre ?? "—",
      etapa_nombre: etapa?.nombre ?? "—",
      etapa_orden: etapa?.orden ?? 0,
      fase_id: "terminados",
      fase_nombre: "Proyectos terminados",
      responsable_nombre: responsable?.nombre ?? "—",
      porcentaje_avance: 100,
      estado_cumplimiento: "en_plazo" as const,
    };
  });
}

export const FASES_ORDENADAS = flujoConfig.fases;
