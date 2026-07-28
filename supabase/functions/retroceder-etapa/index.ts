// ============================================================
// Edge Function: retroceder-etapa
//
// Permite a Gerente general y Administrador devolver un proyecto
// una etapa hacia atrás, para corregir errores de carga. Resetea
// el checklist de la etapa a la que se vuelve (no los datos de
// formulario, documentos legales, ni montos).
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
    .select("*")
    .eq("id", usuario_id)
    .single();

  if (errUsuario || !usuario || !["gerente_general", "administrador"].includes(usuario.rol_id)) {
    return jsonError("Solo el Gerente general o el Administrador pueden devolver etapas", 403);
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
    return jsonError("No se puede retroceder un proyecto ya finalizado", 400);
  }

  const { data: etapaActual, error: errEtapaActual } = await supabase
    .from("etapas_definicion")
    .select("*")
    .eq("id", proyecto.etapa_actual_id)
    .single();

  if (errEtapaActual || !etapaActual) {
    return jsonError("Etapa actual no encontrada", 404);
  }

  if (etapaActual.orden <= 1) {
    return jsonError("Ya está en la primera etapa, no se puede retroceder más", 400);
  }

  const { data: etapaAnterior, error: errEtapaAnterior } = await supabase
    .from("etapas_definicion")
    .select("*")
    .eq("orden", etapaActual.orden - 1)
    .single();

  if (errEtapaAnterior || !etapaAnterior) {
    return jsonError("No se encontró la etapa anterior", 404);
  }

  // Resolver quién queda como responsable de la etapa anterior,
  // con la misma lógica que se usa al avanzar normalmente.
  let nuevoResponsableId: string | null = null;
  let personasParaNotificar: string[] = [];

  if (etapaAnterior.multi_responsable) {
    const { data: asignados } = await supabase
      .from("checklist_items_definicion")
      .select("usuario_asignado_id")
      .eq("etapa_id", etapaAnterior.id)
      .not("usuario_asignado_id", "is", null);
    personasParaNotificar = (asignados ?? []).map((a: any) => a.usuario_asignado_id);
    nuevoResponsableId = personasParaNotificar[0] ?? null;
  } else if (etapaAnterior.usuario_asignado_id) {
    nuevoResponsableId = etapaAnterior.usuario_asignado_id;
  } else if (etapaAnterior.rol_id === "administrador") {
    const { data: administradores } = await supabase
      .from("usuarios")
      .select("id")
      .eq("rol_id", "administrador")
      .eq("activo", true);
    personasParaNotificar = (administradores ?? []).map((a: any) => a.id);
    nuevoResponsableId = personasParaNotificar[0] ?? null;
  } else {
    const { data: usuarioPorRol } = await supabase
      .from("usuarios")
      .select("id")
      .eq("rol_id", etapaAnterior.rol_id)
      .eq("activo", true)
      .limit(1)
      .maybeSingle();
    nuevoResponsableId = usuarioPorRol?.id ?? null;
  }

  if (etapaAnterior.requiere_montos) {
    const { data: administradores } = await supabase
      .from("usuarios")
      .select("id")
      .eq("rol_id", "administrador")
      .eq("activo", true);
    const idsAdmin = (administradores ?? []).map((a: any) => a.id);
    personasParaNotificar = Array.from(new Set([...personasParaNotificar, ...idsAdmin]));
  }

  // Resetear el checklist de la etapa a la que se vuelve.
  const { data: itemsEtapaAnterior } = await supabase
    .from("checklist_items_definicion")
    .select("id")
    .eq("etapa_id", etapaAnterior.id);

  const idsItems = (itemsEtapaAnterior ?? []).map((i: any) => i.id);
  if (idsItems.length > 0) {
    await supabase
      .from("checklist_instancia")
      .update({ completado: false, completado_en: null, completado_por: null })
      .eq("proyecto_id", proyecto_id)
      .in("item_definicion_id", idsItems);
  }

  await supabase
    .from("proyectos")
    .update({
      etapa_actual_id: etapaAnterior.id,
      responsable_actual_id: nuevoResponsableId ?? proyecto.responsable_actual_id,
    })
    .eq("id", proyecto_id);

  await supabase.from("timeline_eventos").insert({
    proyecto_id,
    tipo: "cambio_etapa",
    descripcion: `Etapa devuelta manualmente por ${usuario.nombre}: de "${etapaActual.nombre}" a "${etapaAnterior.nombre}"`,
    usuario_id,
  });

  await supabase.from("auditoria").insert({
    usuario_id,
    proyecto_id,
    etapa_id: etapaAnterior.id,
    accion: "retroceder_etapa",
    estado_anterior: etapaActual.nombre,
    estado_nuevo: etapaAnterior.nombre,
  });

  if (personasParaNotificar.length > 0) {
    await supabase.from("notificaciones").insert(
      personasParaNotificar.map((id) => ({
        usuario_id: id,
        proyecto_id,
        mensaje: `El proyecto "${proyecto.nombre}" fue devuelto a la etapa "${etapaAnterior.nombre}" — revisa qué falta.`,
      }))
    );
  } else if (nuevoResponsableId) {
    await supabase.from("notificaciones").insert({
      usuario_id: nuevoResponsableId,
      proyecto_id,
      mensaje: `El proyecto "${proyecto.nombre}" fue devuelto a la etapa "${etapaAnterior.nombre}" — revisa qué falta.`,
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
      proyecto: proyecto.codigo_proyecto ?? proyecto.nombre,
      agricultor: proyecto.nombre_agricultor ?? "—",
      etapa_completada: `${etapaActual.nombre} (devuelta)`,
      etapa_nueva: etapaAnterior.nombre,
      responsable_anterior: usuario.nombre,
      responsable_nuevo: null,
      finalizado: false,
    }),
  }).catch((err) => console.error("No se pudo notificar a google-sheets", err));

  return json({ ok: true, etapa_nueva: etapaAnterior.nombre });
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
