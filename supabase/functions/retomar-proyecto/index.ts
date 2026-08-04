// ============================================================
// Edge Function: retomar-proyecto
//
// Resuelve la pregunta "¿Retomar proyecto? Sí/No" que aparece
// cuando se cumple la fecha de retomar de un proyecto cerrado
// anticipadamente. Solo el Gerente general puede decidir esto.
// ============================================================

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const { proyecto_id, usuario_id, decision } = await req.json();

  if (!["si", "no"].includes(decision)) {
    return jsonError("Decisión inválida", 400);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: usuario, error: errUsuario } = await supabase
    .from("usuarios")
    .select("*")
    .eq("id", usuario_id)
    .single();

  if (errUsuario || !usuario || usuario.rol_id !== "gerente_general") {
    return jsonError("Solo el Gerente general puede decidir esto", 403);
  }

  const { data: proyecto, error: errProyecto } = await supabase
    .from("proyectos")
    .select("*")
    .eq("id", proyecto_id)
    .single();

  if (errProyecto || !proyecto) {
    return jsonError("Proyecto no encontrado", 404);
  }

  if (decision === "no") {
    // Se marca como resuelto: el proyecto pasa a verse como un
    // cierre anticipado normal en "Proyectos terminados".
    await supabase
      .from("proyectos")
      .update({ aviso_retomar_enviado: true })
      .eq("id", proyecto_id);

    await supabase.from("timeline_eventos").insert({
      proyecto_id,
      tipo: "observacion",
      descripcion: "Se decidió NO retomar el proyecto en la fecha programada.",
      usuario_id,
    });

    return json({ ok: true, retomado: false });
  }

  // decision === "si": el proyecto vuelve a estar activo, en la
  // etapa 2 ("Visita técnica"), como si se acabara de crear.
  const { data: etapa2, error: errEtapa2 } = await supabase
    .from("etapas_definicion")
    .select("*")
    .eq("orden", 2)
    .single();

  if (errEtapa2 || !etapa2) {
    return jsonError("No se encontró la etapa 2", 500);
  }

  await supabase
    .from("proyectos")
    .update({
      finalizado: false,
      motivo_cierre: null,
      fecha_retomar: null,
      aviso_retomar_enviado: false,
      etapa_actual_id: etapa2.id,
      etapa_actual_desde: new Date().toISOString(),
      responsable_actual_id: usuario_id,
      archivado_manual: false,
      archivado_motivo: null,
      archivado_en: null,
    })
    .eq("id", proyecto_id);

  await supabase.from("timeline_eventos").insert({
    proyecto_id,
    tipo: "observacion",
    descripcion: `Proyecto retomado. Vuelve a la etapa "${etapa2.nombre}".`,
    usuario_id,
  });

  await supabase.from("auditoria").insert({
    usuario_id,
    proyecto_id,
    etapa_id: etapa2.id,
    accion: "retomar_proyecto",
    estado_anterior: "cerrado",
    estado_nuevo: etapa2.nombre,
  });

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
      etapa_completada: "Cerrado anticipadamente",
      etapa_nueva: etapa2.nombre,
      responsable_anterior: usuario.nombre,
      responsable_nuevo: usuario.nombre,
      finalizado: false,
    }),
  }).catch((err) => console.error("No se pudo notificar a google-sheets", err));

  return json({ ok: true, retomado: true });
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
