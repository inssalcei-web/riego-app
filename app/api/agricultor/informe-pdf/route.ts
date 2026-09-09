// ============================================================
// Ruta PÚBLICA (sin sesión): descarga el informe PDF de un
// proyecto, para agricultores, desde la pantalla de Login.
//
// Requiere el id del proyecto Y el RUT — se vuelve a validar acá
// que el RUT coincida con el del proyecto (no basta con haberlo
// mostrado antes en /api/agricultor/buscar), para que no se pueda
// simplemente cambiar el id en la URL y bajar el informe de otro
// agricultor sin saber su RUT.
//
// Reutiliza exactamente el mismo generador que usa el equipo
// interno (lib/pdf/generar-informe-proyecto.ts) — mismo contenido,
// durante la marcha blanca, tal como se pidió.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { normalizarRut } from "@/lib/rut";
import { generarInformeProyectoPdf } from "@/lib/pdf/generar-informe-proyecto";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id") ?? "";
  const rutParam = req.nextUrl.searchParams.get("rut") ?? "";
  const rut = normalizarRut(rutParam);

  if (!id || rut.length < 3) {
    return new NextResponse("Faltan datos para generar el informe", { status: 400 });
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return new NextResponse("El informe todavía no está configurado. Contacta a INSSAL.", { status: 500 });
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  const { data: proyecto } = await supabase.from("proyectos").select("*").eq("id", id).single();
  if (!proyecto) return new NextResponse("Proyecto no encontrado", { status: 404 });

  const rutProyecto = normalizarRut(String(proyecto.datos_formulario?.rut_agricultor ?? ""));
  if (!rutProyecto || rutProyecto !== rut) {
    return new NextResponse("El RUT no coincide con este proyecto", { status: 403 });
  }

  const logoUrl = new URL("/logo.png", req.url).toString();

  const bytes = await generarInformeProyectoPdf({
    supabase,
    proyecto,
    generadoPor: "Consulta pública del agricultor",
    logoUrl,
  });

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Ficha_Proyecto_${proyecto.codigo_proyecto ?? proyecto.id}.pdf"`,
    },
  });
}
