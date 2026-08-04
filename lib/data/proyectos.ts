import { SupabaseClient } from "@supabase/supabase-js";
import { ProyectoConDetalle, ColorSemaforo } from "@/lib/types";

const CAMPOS_MONTOS = ["monto_formulacion", "monto_construccion", "monto_aporte_propio", "monto_total_proyecto"];
export const DIAS_PARA_ARCHIVAR = 61;

export function montosCompletos(datosFormulario: Record<string, any> | null | undefined): boolean {
  const datos = datosFormulario ?? {};
  return CAMPOS_MONTOS.every((c) => datos[c] !== undefined && datos[c] !== null && datos[c] !== "");
}

export function diasEnEtapa(etapaActualDesde: string | null | undefined): number {
  if (!etapaActualDesde) return 0;
  const ms = Date.now() - new Date(etapaActualDesde).getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

function colorSemaforo(dias: number): ColorSemaforo {
  if (dias <= 14) return "verde";
  if (dias <= 21) return "amarillo";
  return "rojo";
}

export function estaArchivado(p: any): boolean {
  if (p.finalizado) return false;
  if (p.archivado_manual) return true;
  return diasEnEtapa(p.etapa_actual_desde) >= DIAS_PARA_ARCHIVAR;
}

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

  const etapasConMontos = (etapas ?? []).filter((e: any) => e.requiere_montos).map((e: any) => e.id);
  let itemsChecklistMontos: any[] = [];
  let instanciasChecklistMontos: any[] = [];
  if (etapasConMontos.length > 0) {
    const { data: items } = await supabase
      .from("checklist_items_definicion")
      .select("id, etapa_id, obligatorio")
      .in("etapa_id", etapasConMontos);
    itemsChecklistMontos = items ?? [];

    const idsItemsMontos = itemsChecklistMontos.map((i: any) => i.id);
    if (idsItemsMontos.length > 0) {
      const { data: instancias } = await supabase
        .from("checklist_instancia")
        .select("proyecto_id, item_definicion_id, completado")
        .in("item_definicion_id", idsItemsMontos);
      instanciasChecklistMontos = instancias ?? [];
    }
  }

  function checklistCompleto(proyectoId: string, etapaId: number) {
    const itemsDeEstaEtapa = itemsChecklistMontos.filter((i: any) => i.etapa_id === etapaId);
    if (itemsDeEstaEtapa.length === 0) return false;
    return itemsDeEstaEtapa.every((item: any) => {
      if (!item.obligatorio) return true;
      const instancia = instanciasChecklistMontos.find(
        (ins) => ins.proyecto_id === proyectoId && ins.item_definicion_id === item.id
      );
      return instancia?.completado === true;
    });
  }

  return proyectos.map((p: any) => {
    const etapa = etapasPorId.get(p.etapa_actual_id);
    const fase = etapa ? fasesPorId.get(etapa.fase_id) : undefined;
    const responsable = usuariosPorId.get(p.responsable_actual_id);

    let responsableNombre = "—";

    if (etapa?.multi_responsable) {
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
    } else if (etapa?.requiere_montos) {
      const faltantes: string[] = [];
      if (!checklistCompleto(p.id, etapa.id)) {
        faltantes.push(responsable?.nombre ?? "Ingeniero(a) de proyectos");
      }
      if (!montosCompletos(p.datos_formulario)) {
        faltantes.push("Administrador");
      }
      responsableNombre = faltantes.length > 0 ? faltantes.join(", ") : "Todos completaron";
    } else if (etapa?.rol_id === "administrador") {
      responsableNombre = "Administrador";
    } else {
      responsableNombre = responsable?.nombre ?? "—";
    }

    const dias = diasEnEtapa(p.etapa_actual_desde);

    return {
      ...p,
      cliente_nombre: p.nombre_agricultor ?? "—",
      etapa_nombre: etapa?.nombre ?? "—",
      etapa_orden: etapa?.orden ?? 0,
      fase_id: etapa?.fase_id ?? "",
      fase_nombre: fase?.nombre ?? "—",
      fase_orden: fase?.orden ?? 0,
      responsable_nombre: responsableNombre,
      fuente_financiamiento: p.datos_formulario?.fuente_financiamiento ?? null,
      porcentaje_avance: Math.round(((etapa?.orden ?? 0) / 27) * 100),
      dias_en_etapa: dias,
      color_semaforo: colorSemaforo(dias),
      archivado: estaArchivado(p),
    };
  });
}

async function obtenerProyectosNoFinalizados(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("proyectos")
    .select("*")
    .eq("finalizado", false)
    .order("creado_en", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function obtenerProyectosActivos(
  supabase: SupabaseClient
): Promise<ProyectoConDetalle[]> {
  const todos = await obtenerProyectosNoFinalizados(supabase);
  const activos = todos.filter((p) => !estaArchivado(p));
  return enriquecerProyectos(supabase, activos);
}

// Proyectos que llevan 61 días o más sin moverse de etapa, o que
// fueron archivados manualmente por Administrador o Gerente general.
export async function obtenerProyectosArchivados(
  supabase: SupabaseClient
): Promise<ProyectoConDetalle[]> {
  const todos = await obtenerProyectosNoFinalizados(supabase);
  const archivados = todos.filter((p) => estaArchivado(p));
  return enriquecerProyectos(supabase, archivados);
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

  const visibles = (proyectos ?? []).filter(
    (p: any) => !(p.motivo_cierre && p.fecha_retomar && !p.aviso_retomar_enviado)
  );

  return enriquecerProyectos(supabase, visibles);
}

export async function obtenerProyectosPendientesRetomar(
  supabase: SupabaseClient
): Promise<{ id: string; codigo_proyecto: string; nombre_agricultor: string }[]> {
  const hoy = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from("proyectos")
    .select("id, codigo_proyecto, nombre_agricultor")
    .eq("finalizado", true)
    .not("motivo_cierre", "is", null)
    .not("fecha_retomar", "is", null)
    .lte("fecha_retomar", hoy)
    .eq("aviso_retomar_enviado", false);

  return data ?? [];
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

  const etapasConMontos = (etapas ?? []).filter((e: any) => e.requiere_montos).map((e: any) => e.id);
  let itemsChecklistMontos: any[] = [];
  let instanciasChecklistMontos: any[] = [];
  if (etapasConMontos.length > 0) {
    const { data: items } = await supabase
      .from("checklist_items_definicion")
      .select("id, etapa_id, obligatorio")
      .in("etapa_id", etapasConMontos);
    itemsChecklistMontos = items ?? [];

    const idsItemsMontos = itemsChecklistMontos.map((i: any) => i.id);
    if (idsItemsMontos.length > 0) {
      const { data: instancias } = await supabase
        .from("checklist_instancia")
        .select("proyecto_id, item_definicion_id, completado")
        .in("item_definicion_id", idsItemsMontos);
      instanciasChecklistMontos = instancias ?? [];
    }
  }

  function checklistCompleto(proyectoId: string, etapaId: number) {
    const itemsDeEstaEtapa = itemsChecklistMontos.filter((i: any) => i.etapa_id === etapaId);
    if (itemsDeEstaEtapa.length === 0) return false;
    return itemsDeEstaEtapa.every((item: any) => {
      if (!item.obligatorio) return true;
      const instancia = instanciasChecklistMontos.find(
        (ins) => ins.proyecto_id === proyectoId && ins.item_definicion_id === item.id
      );
      return instancia?.completado === true;
    });
  }

  return todos.filter((p) => {
    const info = etapaInfoPorId.get(p.etapa_actual_id);
    if (!info) return p.responsable_actual_id === usuarioId;

    if (info.multi_responsable) {
      const miItemId = misItemsPorEtapa.get(p.etapa_actual_id);
      if (miItemId) {
        const miInstancia = misInstancias.find(
          (ins) => ins.proyecto_id === p.id && ins.item_definicion_id === miItemId
        );
        const yaCompleteMiParte = miInstancia?.completado === true;
        return !yaCompleteMiParte;
      }
      return false;
    }

    if (info.requiere_montos) {
      const esElResponsableDelChecklist = p.responsable_actual_id === usuarioId;
      if (esElResponsableDelChecklist) {
        return !checklistCompleto(p.id, p.etapa_actual_id);
      }
      if (usuario?.rol_id === "administrador") {
        return !montosCompletos(p.datos_formulario);
      }
      return false;
    }

    if (usuario?.rol_id === "administrador" && info.rol_id === "administrador") return true;

    return p.responsable_actual_id === usuarioId;
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

// Carga de trabajo real por persona — a diferencia del texto que se
// ve en la tarjeta ("Oliver García, Administrador"), acá cada
// persona se cuenta por separado, incluyendo su participación en
// etapas de varios responsables. Esto es lo que corrige el KPI 7.
export async function obtenerCargaPorPersona(supabase: SupabaseClient): Promise<Map<string, number>> {
  const todos = await obtenerProyectosNoFinalizados(supabase);
  const activos = todos.filter((p) => !estaArchivado(p));

  const [{ data: etapas }, { data: usuarios }, { data: itemsMulti }] = await Promise.all([
    supabase.from("etapas_definicion").select("*"),
    supabase.from("usuarios").select("id, nombre"),
    supabase
      .from("checklist_items_definicion")
      .select("id, etapa_id, usuario_asignado_id")
      .not("usuario_asignado_id", "is", null),
  ]);

  const etapasPorId = new Map((etapas ?? []).map((e: any) => [e.id, e]));
  const usuariosPorId = new Map((usuarios ?? []).map((u: any) => [u.id, u.nombre]));

  const idsItemsMulti = (itemsMulti ?? []).map((i: any) => i.id);
  const proyectoIds = activos.map((p) => p.id);
  let instanciasMulti: any[] = [];
  if (idsItemsMulti.length > 0 && proyectoIds.length > 0) {
    const { data } = await supabase
      .from("checklist_instancia")
      .select("proyecto_id, item_definicion_id, completado")
      .in("proyecto_id", proyectoIds)
      .in("item_definicion_id", idsItemsMulti);
    instanciasMulti = data ?? [];
  }

  const etapasConMontos = (etapas ?? []).filter((e: any) => e.requiere_montos).map((e: any) => e.id);
  let itemsChecklistMontos: any[] = [];
  let instanciasChecklistMontos: any[] = [];
  if (etapasConMontos.length > 0) {
    const { data: items } = await supabase
      .from("checklist_items_definicion")
      .select("id, etapa_id, obligatorio")
      .in("etapa_id", etapasConMontos);
    itemsChecklistMontos = items ?? [];

    const idsItemsMontos = itemsChecklistMontos.map((i: any) => i.id);
    if (idsItemsMontos.length > 0) {
      const { data: instancias } = await supabase
        .from("checklist_instancia")
        .select("proyecto_id, item_definicion_id, completado")
        .in("item_definicion_id", idsItemsMontos);
      instanciasChecklistMontos = instancias ?? [];
    }
  }

  function checklistCompletoParaMontos(proyectoId: string, etapaId: number) {
    const itemsDeEstaEtapa = itemsChecklistMontos.filter((i: any) => i.etapa_id === etapaId);
    if (itemsDeEstaEtapa.length === 0) return false;
    return itemsDeEstaEtapa.every((item: any) => {
      if (!item.obligatorio) return true;
      const instancia = instanciasChecklistMontos.find(
        (ins) => ins.proyecto_id === proyectoId && ins.item_definicion_id === item.id
      );
      return instancia?.completado === true;
    });
  }

  const carga = new Map<string, number>();
  const sumar = (nombre: string) => carga.set(nombre, (carga.get(nombre) ?? 0) + 1);

  for (const p of activos) {
    const etapa = etapasPorId.get(p.etapa_actual_id);
    if (!etapa) continue;

    if (etapa.multi_responsable) {
      const itemsDeEstaEtapa = (itemsMulti ?? []).filter((i: any) => i.etapa_id === etapa.id);
      itemsDeEstaEtapa.forEach((item: any) => {
        const instancia = instanciasMulti.find(
          (ins) => ins.proyecto_id === p.id && ins.item_definicion_id === item.id
        );
        const completado = instancia?.completado === true;
        if (!completado) {
          const nombre = usuariosPorId.get(item.usuario_asignado_id);
          if (nombre) sumar(nombre);
        }
      });
    } else if (etapa.requiere_montos) {
      if (!montosCompletos(p.datos_formulario)) sumar("Administrador");
      if (!checklistCompletoParaMontos(p.id, etapa.id)) {
        const nombreResponsable = usuariosPorId.get(p.responsable_actual_id);
        if (nombreResponsable) sumar(nombreResponsable);
      }
    } else if (etapa.rol_id === "administrador") {
      sumar("Administrador");
    } else {
      const nombreResponsable = usuariosPorId.get(p.responsable_actual_id);
      if (nombreResponsable) sumar(nombreResponsable);
    }
  }

  return carga;
}
