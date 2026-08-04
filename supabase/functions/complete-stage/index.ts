// ============================================================
// Módulo 09 — Motor de Flujo
// Edge Function de Supabase: complete-stage
// ============================================================

import { createClient } from "npm:@supabase/supabase-js@2";

interface CompleteStageInput {
  proyecto_id: string;
  usuario_id: string;
}

const CAMPOS_OBLIGATORIOS_FORMULARIO = [
  "rut_agricultor",
  "tipo_proyecto",
  "cantidad_hectareas",
  "empresa_formuladora",
  "empresa_constructora",
  "fuente_financiamiento",
  "comuna",
  "direccion",
  "coordenadas_n",
  "coordenadas_e",
  "area_agencia",
];

const CAMPOS_MONTOS_POSTULACION = [
  "monto_formulacion",
  "monto_construccion",
  "monto_aporte_propio",
  "monto_total_proyecto",
];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const { proyecto_id, usuario_id }: CompleteStageInput = await req.json();
  const startedAt = Date.now();

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: proyecto, error: errProyecto } = await supabase
    .from("proyectos")
    .select("*")
    .eq("id", proyecto_id)
    .single();

  if (errProyecto || !proyecto) {
    return jsonError(
      `Proyecto no encontrado — detalle: ${errProyecto?.message ?? "sin datos"} (id buscado: ${proyecto_id})`,
      404
    );
  }

  const { data: etapaActual, error: errEtapa } = await supabase
    .from("etapas_definicion")
    .select("*")
    .eq("id", proyecto.etapa_actual_id)
    .single();

  if (errEtapa || !etapaActual) {
    return jsonError(`Etapa actual no encontrada — detalle: ${errEtapa?.message ?? "sin datos"}`, 404);
  }

  const { data: usuarioActuante } = await supabase
    .from("usuarios")
    .select("rol_id")
    .eq("id", usuario_id)
    .single();

  let autorizado = false;

  if (etapaActual.multi_responsable) {
    const { data: asignados } = await supabase
      .from("checklist_items_definicion")
      .select("usuario_asignado_id")
      .eq("etapa_id", etapaActual.id)
      .not("usuario_asignado_id", "is", null);
    autorizado = (asignados ?? []).some((a: any) => a.usuario_asignado_id === usuario_id);
  } else if (etapaActual.rol_id === "administrador") {
    autorizado = usuarioActuante?.rol_id === "administrador";
  } else {
    autorizado = proyecto.responsable_actual_id === usuario_id;
  }

  // Etapas con montos de postulación (15): además del responsable
  // normal del checklist, CUALQUIER Administrador puede intentar
  // cerrarla — así, sea quien sea que complete su parte al final
  // (el ingeniero o el administrador), esa misma persona puede
  // presionar "Completar etapa" y que funcione.
  if (etapaActual.requiere_montos && usuarioActuante?.rol_id === "administrador") {
    autorizado = true;
  }

  if (!autorizado) {
    return jsonError("No tienes permiso para completar esta etapa", 403);
  }

  // Validación según el tipo de acción de la etapa actual
  if (etapaActual.tipo_accion === "formulario") {
    const datos = proyecto.datos_formulario ?? {};
    const faltantes = CAMPOS_OBLIGATORIOS_FORMULARIO.filter((campo) => {
      const valor = datos[campo];
      if (Array.isArray(valor)) return valor.length === 0;
      return valor === undefined || valor === null || valor === "";
    });
    if (faltantes.length > 0) {
      return jsonError(`Faltan campos del formulario: ${faltantes.join(", ")}`, 400);
    }
  } else if (etapaActual.tipo_accion === "documentos_legales") {
    const { data: documentos } = await supabase
      .from("proyecto_documentos_legales")
      .select("id, completado")
      .eq("proyecto_id", proyecto_id);

    if (!documentos || documentos.length === 0) {
      return jsonError("Debes agregar al menos un documento legal", 400);
    }
    if (documentos.some((d: any) => !d.completado)) {
      return jsonError("Hay documentos legales sin marcar como completados", 400);
    }
  } else {
    const { data: itemsDeEstaEtapa } = await supabase
      .from("checklist_items_definicion")
      .select("id, obligatorio")
      .eq("etapa_id", etapaActual.id);

    const idsItems = (itemsDeEstaEtapa ?? []).map((i: any) => i.id);

    const { data: instanciasDeEstaEtapa } = await supabase
      .from("checklist_instancia")
      .select("item_definicion_id, completado")
      .eq("proyecto_id", proyecto_id)
      .in("item_definicion_id", idsItems.length > 0 ? idsItems : [-1]);

    const faltaObligatorio = (itemsDeEstaEtapa ?? []).some((item: any) => {
      if (!item.obligatorio) return false;
      const instancia = (instanciasDeEstaEtapa ?? []).find(
        (i: any) => i.item_definicion_id === item.id
      );
      return !instancia || !instancia.completado;
    });

    if (faltaObligatorio) {
      return jsonError("Hay ítems obligatorios sin completar", 400);
    }
  }

  // Validación aparte: si esta etapa requiere los montos de
  // postulación, deben estar todos completos antes de avanzar.
  if (etapaActual.requiere_montos) {
    const datos = proyecto.datos_formulario ?? {};
    const faltantesMontos = CAMPOS_MONTOS_POSTULACION.filter(
      (campo) => datos[campo] === undefined || datos[campo] === null || datos[campo] === ""
    );
    if (faltantesMontos.length > 0) {
      return jsonError(`Faltan los montos de postulación: ${faltantesMontos.join(", ")}`, 400);
    }
  }

  const { data: siguienteEtapa } = await supabase
    .from("etapas_definicion")
    .select("*")
    .eq("orden", etapaActual.orden + 1)
    .maybeSingle();

  const esUltimaEtapa = !siguienteEtapa;

  let siguienteResponsableId: string | null = null;
  let personasParaNotificar: string[] = [];

  if (!esUltimaEtapa) {
    if (siguienteEtapa.multi_responsable) {
      const { data: asignados } = await supabase
        .from("checklist_items_definicion")
        .select("usuario_asignado_id")
        .eq("etapa_id", siguienteEtapa.id)
        .not("usuario_asignado_id", "is", null);
      personasParaNotificar = (asignados ?? []).map((a: any) => a.usuario_asignado_id);
      siguienteResponsableId = personasParaNotificar[0] ?? null;
    } else if (siguienteEtapa.usuario_asignado_id) {
      siguienteResponsableId = siguienteEtapa.usuario_asignado_id;
    } else if (siguienteEtapa.rol_id === "administrador") {
      const { data: administradores } = await supabase
        .from("usuarios")
        .select("id")
        .eq("rol_id", "administrador")
        .eq("activo", true);
      personasParaNotificar = (administradores ?? []).map((a: any) => a.id);
      siguienteResponsableId = personasParaNotificar[0] ?? null;
    } else {
      const { data: usuarioPorRol } = await supabase
        .from("usuarios")
        .select("id")
        .eq("rol_id", siguienteEtapa.rol_id)
        .eq("activo", true)
        .limit(1)
        .maybeSingle();
      siguienteResponsableId = usuarioPorRol?.id ?? null;
    }

    // Si la etapa siguiente requiere montos, también se avisa a
    // todos los administradores (además de quien esté a cargo del
    // checklist normal), porque ellos tienen su propia parte ahí.
    if (siguienteEtapa.requiere_montos) {
      const { data: administradores } = await supabase
        .from("usuarios")
        .select("id")
        .eq("rol_id", "administrador")
        .eq("activo", true);
      const idsAdmin = (administradores ?? []).map((a: any) => a.id);
      personasParaNotificar = Array.from(new Set([...personasParaNotificar, ...idsAdmin]));
      if (personasParaNotificar.length === 0 && siguienteResponsableId) {
        personasParaNotificar = [siguienteResponsableId];
      }
    }
  }

  // Actualización con "seguro": solo avanza si la etapa actual del
  // proyecto sigue siendo exactamente la que esperábamos.
  const { data: filasActualizadas } = await supabase
    .from("proyectos")
    .update({
      etapa_actual_id: esUltimaEtapa ? etapaActual.id : siguienteEtapa.id,
      etapa_actual_desde: new Date().toISOString(),
      responsable_actual_id: siguienteResponsableId ?? proyecto.responsable_actual_id,
      finalizado: esUltimaEtapa,
      archivado_manual: false,
      archivado_motivo: null,
      archivado_en: null,
    })
    .eq("id", proyecto_id)
    .eq("etapa_actual_id", etapaActual.id)
    .select();

  if (!filasActualizadas || filasActualizadas.length === 0) {
    return jsonError(
      "Esta etapa ya fue completada por otra persona un instante antes. La pantalla se va a actualizar sola.",
      409
    );
  }

  // Se registra cuánto duró realmente la etapa que se acaba de
  // completar, para que los KPIs de tiempo no tengan que "adivinar"
  // esto revisando el historial más adelante.
  const horasEnEtapa = (Date.now() - new Date(proyecto.etapa_actual_desde).getTime()) / (1000 * 60 * 60);
  await supabase.from("duraciones_etapa").insert({
    proyecto_id,
    etapa_id: etapaActual.id,
    usuario_id,
    fecha_inicio: proyecto.etapa_actual_desde,
    fecha_fin: new Date().toISOString(),
    duracion_horas: Math.max(0, horasEnEtapa),
    tipo_movimiento: "avance",
  });

  await supabase.from("timeline_eventos").insert({
    proyecto_id,
    tipo: "cambio_etapa",
    descripcion: esUltimaEtapa
      ? `Proyecto finalizado. Última etapa completada: ${etapaActual.nombre}`
      : `Etapa "${etapaActual.nombre}" completada. Pasa a "${siguienteEtapa.nombre}"`,
    usuario_id,
  });

  await supabase.from("auditoria").insert({
    usuario_id,
    proyecto_id,
    etapa_id: etapaActual.id,
    accion: "completar_etapa",
    estado_anterior: etapaActual.nombre,
    estado_nuevo: esUltimaEtapa ? "finalizado" : siguienteEtapa.nombre,
    tiempo_ejecucion_ms: Date.now() - startedAt,
  });

  if (etapaActual.rol_id === "administrador" || etapaActual.multi_responsable || etapaActual.requiere_montos) {
    await supabase.from("notificaciones").delete().eq("proyecto_id", proyecto_id).eq("leida", false);
  }

  if (personasParaNotificar.length > 0) {
    const mensaje =
      siguienteEtapa.mensaje_notificacion ??
      `Te asignaron la etapa "${siguienteEtapa.nombre}" en el proyecto "${proyecto.nombre}"`;

    await supabase.from("notificaciones").insert(
      personasParaNotificar.map((id) => ({
        usuario_id: id,
        proyecto_id,
        mensaje: `${mensaje} — Proyecto: ${proyecto.nombre}`,
      }))
    );
  } else if (siguienteResponsableId) {
    const mensaje =
      siguienteEtapa.mensaje_notificacion ??
      `Te asignaron la etapa "${siguienteEtapa.nombre}" en el proyecto "${proyecto.nombre}"`;

    await supabase.from("notificaciones").insert({
      usuario_id: siguienteResponsableId,
      proyecto_id,
      mensaje: `${mensaje} — Proyecto: ${proyecto.nombre}`,
    });
  }

  const idsAResolver = [usuario_id, siguienteResponsableId].filter(Boolean) as string[];
  const { data: usuariosParaSheet } = await supabase
    .from("usuarios")
    .select("id, nombre")
    .in("id", idsAResolver);
  const nombrePorId = new Map((usuariosParaSheet ?? []).map((u: any) => [u.id, u.nombre]));

  fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/google-sheets`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fecha: new Date().toISOString(),
      proyecto: proyecto.codigo_proyecto ?? proyecto.nombre,
      agricultor: proyecto.nombre_agricultor ?? "—",
      etapa_completada: etapaActual.nombre,
      etapa_nueva: esUltimaEtapa ? null : siguienteEtapa.nombre,
      responsable_anterior: nombrePorId.get(usuario_id) ?? usuario_id,
      responsable_nuevo: siguienteResponsableId ? nombrePorId.get(siguienteResponsableId) ?? siguienteResponsableId : null,
      finalizado: esUltimaEtapa,
    }),
  }).catch((err) => console.error("No se pudo notificar a google-sheets", err));

  return json({
    ok: true,
    nueva_etapa: esUltimaEtapa ? null : siguienteEtapa.nombre,
    finalizado: esUltimaEtapa,
  });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function jsonError(mensaje: string, status: number) {
  return json({ ok: false, error: mensaje }, status);
}
