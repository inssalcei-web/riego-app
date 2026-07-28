// ============================================================
// Edge Function: eliminar-proyecto
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

  const { proyecto_id, usuario_id } = await req.json();

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: usuario, error: errUsuario } = await supabase
    .from("usuarios")
    .select("rol_id")
    .eq("id", usuario_id)
    .single();

  if (errUsuario || !usuario || !["gerente_general", "administrador"].includes(usuario.rol_id)) {
    return jsonError("No tienes permiso para eliminar proyectos", 403);
  }

  const { data: proyecto, error: errProyecto } = await supabase
    .from("proyectos")
    .select("id")
    .eq("id", proyecto_id)
    .single();

  if (errProyecto || !proyecto) {
    return jsonError("Proyecto no encontrado", 404);
  }

  await supabase.from("checklist_instancia").delete().eq("proyecto_id", proyecto_id);
  await supabase.from("proyecto_documentos_legales").delete().eq("proyecto_id", proyecto_id);
  await supabase.from("proyecto_responsables").delete().eq("proyecto_id", proyecto_id);
  await supabase.from("timeline_eventos").delete().eq("proyecto_id", proyecto_id);
  await supabase.from("auditoria").delete().eq("proyecto_id", proyecto_id);
  await supabase.from("notificaciones").delete().eq("proyecto_id", proyecto_id);

  const { error: errBorrar } = await supabase.from("proyectos").delete().eq("id", proyecto_id);

  if (errBorrar) {
    return jsonError(`No se pudo eliminar el proyecto: ${errBorrar.message}`, 500);
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
