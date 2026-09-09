import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generarInformeProyectoPdf } from "@/lib/pdf/generar-informe-proyecto";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("No autorizado", { status: 401 });

  const { data: proyecto } = await supabase.from("proyectos").select("*").eq("id", id).single();
  if (!proyecto) return new NextResponse("Proyecto no encontrado", { status: 404 });

  const logoUrl = new URL("/logo.png", req.url).toString();

  const bytes = await generarInformeProyectoPdf({
    supabase,
    proyecto,
    generadoPor: `Generado por ${user.email}`,
    logoUrl,
  });

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Ficha_Proyecto_${proyecto.codigo_proyecto ?? proyecto.id}.pdf"`,
    },
  });
}
