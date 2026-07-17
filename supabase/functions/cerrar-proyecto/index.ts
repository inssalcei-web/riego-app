// ============================================================
// Edge Function: cerrar-proyecto
//
// Permite al Gerente general cerrar un proyecto anticipadamente,
// en cualquier etapa, con un motivo obligatorio.
// ============================================================

import { createClient } from "npm:@supabase/supabase-js@2";

const MOTIVOS_VALIDOS = [
  "rechazo_presupuesto",
  "falta_documentos_legales",
  "falta_presupuesto",
  "cliente_desiste",
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

  const { proyecto_id, usuario_id, motivo } = await req.json();

  if (!MOTIVOS_VALIDOS.includes(motivo)) {
    return jsonError("Motivo de cierre inválido", 400);
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
    return jsonError("Solo el Gerente general puede cerrar un proyecto anticipadamente", 403);
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
    return jsonError("El proyecto ya está cerrado", 400);
  }

  await supabase
    .from("proyectos")
    .update({ finalizado: true, motivo_cierre: motivo })
    .eq("id", proyecto_id);

  await supabase.from("timeline_eventos").insert({
    proyecto_id,
    tipo: "observacion",
    descripcion: `Proyecto cerrado anticipadamente. Motivo: ${motivo}`,
    usuario_id,
  });

  await supabase.from("auditoria").insert({
    usuario_id,
    proyecto_id,
    accion: "cerrar_proyecto_anticipado",
    estado_anterior: "activo",
    estado_nuevo: `cerrado (${motivo})`,
  });

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
