// ============================================================
// Ruta PÚBLICA (sin sesión): busca proyectos por RUT de agricultor.
// Solo devuelve los datos mínimos para identificar el/los
// proyecto(s) encontrados — el informe completo se pide aparte,
// en /api/agricultor/informe-pdf, revalidando el mismo RUT.
//
// Usa la service role key (no hay sesión de usuario acá), así que
// SUPABASE_SERVICE_ROLE_KEY debe estar configurada como variable
// de entorno del servidor (Vercel), NUNCA con el prefijo
// NEXT_PUBLIC_.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { normalizarRut } from "@/lib/rut";

export async function GET(req: NextRequest) {
  const rutParam = req.nextUrl.searchParams.get("rut") ?? "";
  const rut = normalizarRut(rutParam);

  if (rut.length < 3) {
    return NextResponse.json({ ok: false, error: "Ingresa un RUT válido" }, { status: 400 });
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { ok: false, error: "El buscador de proyectos todavía no está configurado. Contacta a INSSAL." },
      { status: 500 }
    );
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  const { data: proyectos, error } = await supabase
    .from("proyectos")
    .select("id, codigo_proyecto, nombre_agricultor, datos_formulario")
    .not("datos_formulario->rut_agricultor", "is", null);

  if (error) {
    return NextResponse.json({ ok: false, error: "No se pudo buscar el proyecto en este momento" }, { status: 500 });
  }

  const encontrados = (proyectos ?? []).filter(
    (p: any) => normalizarRut(String(p.datos_formulario?.rut_agricultor ?? "")) === rut
  );

  if (encontrados.length === 0) {
    return NextResponse.json({ ok: false, error: "No encontramos ningún proyecto asociado a ese RUT" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    proyectos: encontrados.map((p: any) => ({
      id: p.id,
      codigo_proyecto: p.codigo_proyecto,
      nombre_agricultor: p.nombre_agricultor,
    })),
  });
}
