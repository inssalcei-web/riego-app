// ============================================================
// Módulo 09 — Motor de Flujo
// Edge Function de Supabase: complete-stage
//
// Valida la etapa según su tipo (checkbox, formulario, o
// documentos legales), avanza el proyecto, y notifica al
// siguiente responsable con el mensaje personalizado del Excel.
// ============================================================

import { createClient } from "npm:@supabase/supabase-js@2";

interface CompleteStageInput {
  proyecto_id: string;
  usuario_id: string;
}

const CAMPOS_OBLIGATORIOS_FORMULARIO = [
  "codigo_proyecto",
  "nombre_agricultor",
  "rut_agricultor",
  "tipo_proyecto",
  "cantidad_hectareas",
  "empresa_formuladora",
  "empresa_constructora",
  "fuente_financiamiento",
  "monto_formulacion",
  "monto_construccion",
  "monto_aporte_propio",
  "monto_total_proyecto",
  "comuna",
  "direccion",
  "coordenadas_n",
  "coordenadas_e",
  "area_agencia",
];

Deno.serve(async (req: Request) => {
  const { proyecto_id, usuario_id }: CompleteStageInput = await req.json();
  const startedAt = Date.now();

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: proyecto, error: errProyecto } = await supabase
    .from("proyectos")
    .select("*, etapas_definicion(*)")
    .eq("id", proyecto_id)
    .single();

  if (errProyecto || !proyecto) {
    return jsonError("Proyecto no encontrado", 404);
  }

  if (proyecto.responsable_actual_id !== usuario_id) {
    return jsonError("Solo el responsable de la etapa puede completarla", 403);
  }

  const etapaActual = proyecto.etapas_definicion;

  // Validación según el tipo de acción de la etapa actual
  if (etapaActual.tipo_accion === "formulario") {
    const datos = proyecto.datos_formulario ?? {};
    const faltantes = CAMPOS_OBLIGATORIOS_FORMULARIO.filter(
      (campo) => datos[campo] === undefined || datos[campo] === null || datos[campo] === ""
    );
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
    // Tipo "checkbox": validación de checklist estándar
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
  }

  const { data: siguienteEtapa } = await supabase
    .from("etapas_definicion")
    .select("*")
    .eq("orden", etapaActual.orden + 1)
    .maybeSingle();

  const esUltimaEtapa = !siguienteEtapa;

  let siguienteResponsableId: string | null = null;
  if (!esUltimaEtapa) {
    const { data: asignacion } = await supabase
      .from("proyecto_responsables")
      .select("usuario_id")
      .eq("proyecto_id", proyecto_id)
      .eq("etapa_id", siguienteEtapa.id)
      .single();
    siguienteResponsableId = asignacion?.usuario_id ?? null;

    // Si no hay una asignación específica para esta etapa en este proyecto,
    // se usa como respaldo cualquier usuario que tenga el rol requerido.
    if (!siguienteResponsableId) {
      const { data: usuarioPorRol } = await supabase
        .from("usuarios")
        .select("id")
        .eq("rol_id", siguienteEtapa.rol_id)
        .eq("activo", true)
        .limit(1)
        .maybeSingle();
      siguienteResponsableId = usuarioPorRol?.id ?? null;
    }
  }

  await supabase
    .from("proyectos")
    .update({
      etapa_actual_id: esUltimaEtapa ? etapaActual.id : siguienteEtapa.id,
      responsable_actual_id: siguienteResponsableId ?? proyecto.responsable_actual_id,
      finalizado: esUltimaEtapa,
    })
    .eq("id", proyecto_id);

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

  if (siguienteResponsableId) {
    // Usa el mensaje personalizado de la etapa (columna H del Excel)
    // en vez de un texto genérico.
    const mensaje =
      siguienteEtapa.mensaje_notificacion ??
      `Te asignaron la etapa "${siguienteEtapa.nombre}" en el proyecto "${proyecto.nombre}"`;

    await supabase.from("notificaciones").insert({
      usuario_id: siguienteResponsableId,
      proyecto_id,
      mensaje: `${mensaje} — Proyecto: ${proyecto.nombre}`,
    });
  }

  fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/google-sheets`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fecha: new Date().toISOString(),
      proyecto: proyecto.nombre,
      cliente: proyecto.cliente_id,
      etapa_completada: etapaActual.nombre,
      etapa_nueva: esUltimaEtapa ? null : siguienteEtapa.nombre,
      responsable_anterior: usuario_id,
      responsable_nuevo: siguienteResponsableId,
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
    headers: { "Content-Type": "application/json" },
  });
}

function jsonError(mensaje: string, status: number) {
  return json({ ok: false, error: mensaje }, status);
}
