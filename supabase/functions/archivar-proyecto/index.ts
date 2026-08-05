// ============================================================
// Edge Function: archivar-proyecto
//
// Permite a Gerente general y Administrador archivar o desarchivar
// manualmente un proyecto, independiente del archivado automático
// por 61 días sin movimiento.
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

  const { proyecto_id, usuario_id, accion, motivo } = await req.json();

  if (!["archivar", "desarchivar"].includes(accion)) {
    return jsonError("Acción inválida", 400);
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

  if (errUsuario || !usuario || !["gerente_general", "administrador", "ingeniero_proyectos"].includes(usuario.rol_id)) {
    return jsonError("No tienes permiso para archivar proyectos", 403);
  }

  const { data: proyecto, error: errProyecto } = await supabase
    .from("proyectos")
    .select("*")
    .eq("id", proyecto_id)
    .single();

  if (errProyecto || !proyecto) {
    return jsonError("Proyecto no encontrado", 404);
  }

  if (proyecto.finalizado) {
    return jsonError("No se puede archivar un proyecto ya finalizado", 400);
  }

  if (accion === "archivar") {
    if (!motivo?.trim()) {
      return jsonError("Falta el motivo del archivado", 400);
    }

    await supabase
      .from("proyectos")
      .update({
        archivado_manual: true,
        archivado_motivo: motivo.trim(),
        archivado_en: new Date().toISOString(),
        archivado_por: usuario_id,
      })
      .eq("id", proyecto_id);

    await supabase.from("timeline_eventos").insert({
      proyecto_id,
      tipo: "observacion",
      descripcion: `Proyecto archivado manualmente por ${usuario.nombre}. Motivo: ${motivo.trim()}`,
      usuario_id,
    });
  } else {
    await supabase
      .from("proyectos")
      .update({
        archivado_manual: false,
        archivado_motivo: null,
        archivado_en: null,
        archivado_por: null,
        // Al desarchivar, el semáforo vuelve a empezar de cero —
        // como si el proyecto recién entrara a esta etapa hoy.
        etapa_actual_desde: new Date().toISOString(),
      })
      .eq("id", proyecto_id);

    await supabase.from("timeline_eventos").insert({
      proyecto_id,
      tipo: "observacion",
      descripcion: `Proyecto desarchivado manualmente por ${usuario.nombre}.`,
      usuario_id,
    });
  }

  return json({ ok: true });
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
