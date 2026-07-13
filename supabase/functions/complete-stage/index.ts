// ============================================================
// Módulo 09 — Motor de Flujo
// Edge Function de Supabase: complete_stage
//
// Se ejecuta cuando el responsable presiona "Completar etapa".
// Es la ÚNICA vía por la que un proyecto cambia de etapa —
// nunca se hace desde el frontend directamente, para garantizar
// que la secuencia de efectos ocurra siempre completa y en orden.
// ============================================================

import { createClient } from "npm:@supabase/supabase-js@2";

interface CompleteStageInput {
  proyecto_id: string;
  usuario_id: string; // quien presiona el botón
}

serve_complete_stage: async function handler(req: Request) {
  const { proyecto_id, usuario_id }: CompleteStageInput = await req.json();
  const startedAt = Date.now();

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // 1. Cargar proyecto y etapa actual
  const { data: proyecto, error: errProyecto } = await supabase
    .from("proyectos")
    .select("*, etapas_definicion(*)")
    .eq("id", proyecto_id)
    .single();

  if (errProyecto || !proyecto) {
    return jsonError("Proyecto no encontrado", 404);
  }

  // 2. Autorización: solo el responsable asignado a ESTA etapa puede cerrarla
  if (proyecto.responsable_actual_id !== usuario_id) {
    return jsonError("Solo el responsable de la etapa puede completarla", 403);
  }

  // 3. Validar checklist: todos los ítems obligatorios deben estar completos
  const { data: pendientes } = await supabase
    .from("checklist_instancia")
    .select("id, checklist_items_definicion(obligatorio)")
    .eq("proyecto_id", proyecto_id)
    .eq("completado", false);

  const faltaObligatorio = (pendientes ?? []).some(
    (item: any) => item.checklist_items_definicion.obligatorio
  );

  if (faltaObligatorio) {
    return jsonError("Hay ítems obligatorios sin completar", 400);
  }

  // 4. Determinar siguiente etapa (flujo lineal, sin bifurcaciones)
  const etapaActual = proyecto.etapas_definicion;
  const { data: siguienteEtapa } = await supabase
    .from("etapas_definicion")
    .select("*")
    .eq("orden", etapaActual.orden + 1)
    .maybeSingle();

  const esUltimaEtapa = !siguienteEtapa;

  // 5. Determinar el responsable de la siguiente etapa para ESTE proyecto
  //    (se resuelve contra proyecto_responsables, definido al crear el proyecto)
  let siguienteResponsableId: string | null = null;
  if (!esUltimaEtapa) {
    const { data: asignacion } = await supabase
      .from("proyecto_responsables")
      .select("usuario_id")
      .eq("proyecto_id", proyecto_id)
      .eq("etapa_id", siguienteEtapa.id)
      .single();
    siguienteResponsableId = asignacion?.usuario_id ?? null;
  }

  // 6. Actualizar el proyecto (avance automático de columna en el Kanban)
  await supabase
    .from("proyectos")
    .update({
      etapa_actual_id: esUltimaEtapa ? etapaActual.id : siguienteEtapa.id,
      responsable_actual_id: siguienteResponsableId ?? proyecto.responsable_actual_id,
      finalizado: esUltimaEtapa,
    })
    .eq("id", proyecto_id);

  // 7. Registrar timeline (historial legible para el usuario)
  await supabase.from("timeline_eventos").insert({
    proyecto_id,
    tipo: "cambio_etapa",
    descripcion: esUltimaEtapa
      ? `Proyecto finalizado. Última etapa completada: ${etapaActual.nombre}`
      : `Etapa "${etapaActual.nombre}" completada. Pasa a "${siguienteEtapa.nombre}"`,
    usuario_id,
  });

  // 8. Registrar auditoría (técnica, completa)
  await supabase.from("auditoria").insert({
    usuario_id,
    proyecto_id,
    etapa_id: etapaActual.id,
    accion: "completar_etapa",
    estado_anterior: etapaActual.nombre,
    estado_nuevo: esUltimaEtapa ? "finalizado" : siguienteEtapa.nombre,
    tiempo_ejecucion_ms: Date.now() - startedAt,
  });

  // 9. Notificación interna al nuevo responsable
  if (siguienteResponsableId) {
    await supabase.from("notificaciones").insert({
      usuario_id: siguienteResponsableId,
      proyecto_id,
      mensaje: `Te asignaron la etapa "${siguienteEtapa.nombre}" en el proyecto "${proyecto.nombre}"`,
    });
  }

  // 10. Efectos externos desacoplados (no bloquean la respuesta si fallan)
  //     - envío de correo (módulo 11)
  //     - registro en Google Sheets (módulo 16)
  //     - actualización de KPIs (módulo 15)
  //     Se disparan como tareas independientes; un fallo en Sheets
  //     nunca debe impedir que el proyecto avance de etapa.
  triggerExternalEffects({ proyecto_id, etapaCompletada: etapaActual, esUltimaEtapa });

  return json({
    ok: true,
    nueva_etapa: esUltimaEtapa ? null : siguienteEtapa.nombre,
    finalizado: esUltimaEtapa,
  });
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function jsonError(mensaje: string, status: number) {
  return json({ ok: false, error: mensaje }, status);
}

function triggerExternalEffects(_params: unknown) {
  // Implementación desacoplada — ver módulo 16 (Google Sheets)
  // e integración de email (módulo 11). Se documenta por separado
  // para no acoplar el motor de flujo a proveedores externos.
}
