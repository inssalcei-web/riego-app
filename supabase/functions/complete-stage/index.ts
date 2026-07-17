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

  // Consultas separadas (sin unión automática) para evitar el error
  // de "relación ambigua" que da Supabase cuando hay más de un
  // camino posible entre dos tablas.
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

  const autorizado =
    etapaActual.rol_id === "administrador"
      ? usuarioActuante?.rol_id === "administrador"
      : proyecto.responsable_actual_id === usuario_id;

  if (!autorizado) {
    return jsonError("No tienes permiso para completar esta etapa", 403);
  }

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
    // Solo se revisan los ítems de checklist que pertenecen a la
    // ETAPA ACTUAL — antes se revisaban los de las 30 etapas juntas,
    // lo cual bloqueaba el avance aunque la etapa actual sí estuviera
    // completa.
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

  const { data: siguienteEtapa } = await supabase
    .from("etapas_definicion")
    .select("*")
    .eq("orden", etapaActual.orden + 1)
    .maybeSingle();

  const esUltimaEtapa = !siguienteEtapa;

  let siguienteResponsableId: string | null = null;
  let administradoresParaNotificar: string[] = [];

  if (!esUltimaEtapa) {
    if (siguienteEtapa.usuario_asignado_id) {
      // Asignación fija por etapa (Ingenieros de proyecto)
      siguienteResponsableId = siguienteEtapa.usuario_asignado_id;
    } else if (siguienteEtapa.rol_id === "administrador") {
      // Responsabilidad compartida: cualquiera de los administradores
      // puede completarla. Se guarda uno como referencia visual, pero
      // se notifica a todos los que tengan ese rol.
      const { data: administradores } = await supabase
        .from("usuarios")
        .select("id")
        .eq("rol_id", "administrador")
        .eq("activo", true);
      administradoresParaNotificar = (administradores ?? []).map((a: any) => a.id);
      siguienteResponsableId = administradoresParaNotificar[0] ?? null;
    } else {
      // Un único usuario tiene ese rol (Gerente general, Encargado legal)
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

  // Si la etapa recién completada era de Administrador, se borran las
  // notificaciones pendientes de ESTE proyecto para el otro administrador
  // (ya no aplica, porque alguien ya la completó).
  if (etapaActual.rol_id === "administrador") {
    await supabase.from("notificaciones").delete().eq("proyecto_id", proyecto_id).eq("leida", false);
  }

  if (administradoresParaNotificar.length > 0) {
    const mensaje =
      siguienteEtapa.mensaje_notificacion ??
      `Te asignaron la etapa "${siguienteEtapa.nombre}" en el proyecto "${proyecto.nombre}"`;

    await supabase.from("notificaciones").insert(
      administradoresParaNotificar.map((id) => ({
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
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function jsonError(mensaje: string, status: number) {
  return json({ ok: false, error: mensaje }, status);
}
