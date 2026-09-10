// ============================================================
// Ruta PÚBLICA (sin sesión): busca proyectos por RUT o por nombre
// de agricultor. Solo devuelve los datos mínimos para identificar
// el/los proyecto(s) encontrados, más el RUT normalizado de cada
// uno (necesario para armar el link de descarga en
// /api/agricultor/informe-pdf, que revalida el RUT igual que antes
// — buscar por nombre no se salta esa revalidación, solo evita que
// el agricultor tenga que escribir su RUT a mano).
//
// Usa la service role key (no hay sesión de usuario acá), así que
// SUPABASE_SERVICE_ROLE_KEY debe estar configurada como variable
// de entorno del servidor (Vercel), NUNCA con el prefijo
// NEXT_PUBLIC_.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { normalizarRut } from "@/lib/rut";

function normalizarTexto(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

// Tope de resultados por nombre: una búsqueda de nombre parcial (ej.
// "Juan") podría calzar con muchos proyectos — se limita para no
// exponer un listado masivo de agricultores a quien solo prueba
// nombres comunes.
const MAX_RESULTADOS_POR_NOMBRE = 15;

export async function GET(req: NextRequest) {
  const rutParam = req.nextUrl.searchParams.get("rut") ?? "";
  const nombreParam = req.nextUrl.searchParams.get("nombre") ?? "";
  const rut = normalizarRut(rutParam);
  const nombre = normalizarTexto(nombreParam);

  if (rut.length < 3 && nombre.length < 3) {
    return NextResponse.json(
      { ok: false, error: "Ingresa tu RUT o tu nombre completo (al menos 3 letras)" },
      { status: 400 }
    );
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

  let encontrados =
    rut.length >= 3
      ? (proyectos ?? []).filter(
          (p: any) => normalizarRut(String(p.datos_formulario?.rut_agricultor ?? "")) === rut
        )
      : (proyectos ?? []).filter((p: any) => normalizarTexto(p.nombre_agricultor ?? "").includes(nombre));

  if (encontrados.length === 0) {
    return NextResponse.json(
      { ok: false, error: "No encontramos ningún proyecto con ese RUT o ese nombre" },
      { status: 404 }
    );
  }

  encontrados = encontrados.slice(0, MAX_RESULTADOS_POR_NOMBRE);

  return NextResponse.json({
    ok: true,
    proyectos: encontrados.map((p: any) => ({
      id: p.id,
      codigo_proyecto: p.codigo_proyecto,
      nombre_agricultor: p.nombre_agricultor,
      rut_agricultor: normalizarRut(String(p.datos_formulario?.rut_agricultor ?? "")),
    })),
  });
}
