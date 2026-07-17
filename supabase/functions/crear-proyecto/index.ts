// ============================================================
// Edge Function: crear-proyecto
//
// La usa el Gerente general desde la etapa 1. Crea el proyecto
// directamente en la etapa 2 (Visita técnica) — el acto de
// crearlo YA representa haber completado la etapa 1 ("Aviso de
// nuevo proyecto"), así que no hace falta un checklist aparte.
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

  const { codigo_proyecto, nombre_agricultor, usuario_id } = await req.json();

  if (!codigo_proyecto?.trim() || !nombre_agricultor?.trim()) {
    return jsonError("Falta el código de proyecto o el nombre del agricultor", 400);
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

  if (errUsuario || !usuario) {
    return jsonError("Usuario no encontrado", 404);
  }

  if (usuario.rol_id !== "gerente_general") {
    return jsonError("Solo el Gerente general puede crear proyectos", 403);
  }

  const { data: etapa1 } = await supabase
    .from("etapas_definicion")
    .select("*")
    .eq("orden", 1)
    .single();

  const { data: etapa2 } = await supabase
    .from("etapas_definicion")
    .select("*")
    .eq("orden", 2)
    .single();

  if (!etapa1 || !etapa2) {
    return jsonError("No se encontró la configuración de etapas", 500);
  }

  const { data: proyecto, error: errCrear } = await supabase
    .from("proyectos")
    .insert({
      codigo_proyecto: codigo_proyecto.trim(),
      nombre_agricultor: nombre_agricultor.trim(),
      nombre: codigo_proyecto.trim(),
      etapa_actual_id: etapa2.id,
      responsable_actual_id: usuario_id,
      fecha_inicio: new Date().toISOString().slice(0, 10),
      finalizado: false,
    })
    .select()
    .single();

  if (errCrear || !proyecto) {
    return jsonError(`No se pudo crear el proyecto: ${errCrear?.message ?? "sin datos"}`, 500);
  }

  await supabase.from("timeline_eventos").insert([
    {
      proyecto_id: proyecto.id,
      tipo: "creacion",
      descripcion: `Proyecto creado (código ${codigo_proyecto}, agricultor ${nombre_agricultor})`,
      usuario_id,
    },
    {
      proyecto_id: proyecto.id,
      tipo: "cambio_etapa",
      descripcion: `Etapa "${etapa1.nombre}" completada. Pasa a "${etapa2.nombre}"`,
      usuario_id,
    },
  ]);

  await supabase.from("auditoria").insert({
    usuario_id,
    proyecto_id: proyecto.id,
    etapa_id: etapa1.id,
    accion: "completar_etapa",
    estado_anterior: etapa1.nombre,
    estado_nuevo: etapa2.nombre,
  });

  return json({ ok: true, proyecto_id: proyecto.id });
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
