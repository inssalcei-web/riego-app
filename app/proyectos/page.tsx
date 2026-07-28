import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { obtenerProyectosActivos, obtenerProyectosTerminados, obtenerUsuarioActual, obtenerFasesOrdenadas } from "@/lib/data/proyectos";
import { CollapsibleProjectCard } from "@/components/CollapsibleProjectCard";
import { NavBar } from "@/components/NavBar";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ProyectosPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const usuario = await obtenerUsuarioActual(supabase);

  const [proyectosActivos, proyectosTerminados, fases] = await Promise.all([
    obtenerProyectosActivos(supabase),
    obtenerProyectosTerminados(supabase),
    obtenerFasesOrdenadas(supabase),
  ]);

  // Mejora 1: si soy Gerente general, reviso si hay proyectos
  // cerrados anticipadamente cuya fecha de retomar ya se cumplió, y
  // que todavía no se avisaron. Se muestra un aviso simple acá
  // mismo, al primer ingreso del día.
  let proyectosParaRetomar: { codigo_proyecto: string; nombre_agricultor: string }[] = [];
  if (usuario?.rol_id === "gerente_general") {
    const hoy = new Date().toISOString().slice(0, 10);
    const { data: pendientes } = await supabase
      .from("proyectos")
      .select("id, codigo_proyecto, nombre_agricultor")
      .eq("finalizado", true)
      .not("motivo_cierre", "is", null)
      .not("fecha_retomar", "is", null)
      .lte("fecha_retomar", hoy)
      .eq("aviso_retomar_enviado", false);

    if (pendientes && pendientes.length > 0) {
      proyectosParaRetomar = pendientes.map((p: any) => ({
        codigo_proyecto: p.codigo_proyecto,
        nombre_agricultor: p.nombre_agricultor,
      }));
      await supabase
        .from("proyectos")
        .update({ aviso_retomar_enviado: true })
        .in("id", pendientes.map((p: any) => p.id));
    }
  }

  return (
    <div className="min-h-screen">
      <NavBar />
      <main className="p-5">
        {proyectosParaRetomar.length > 0 && (
          <div
            className="mb-4 p-3 rounded-lg border"
            style={{ borderColor: "var(--status-due-soon-fill)", background: "var(--status-due-soon-bg)" }}
          >
            <p className="text-sm font-medium mb-1" style={{ color: "var(--status-due-soon-text)" }}>
              📅 Es momento de revisar si conviene retomar:
            </p>
            {proyectosParaRetomar.map((p, i) => (
              <p key={i} className="text-sm" style={{ color: "var(--status-due-soon-text)" }}>
                {p.codigo_proyecto} — {p.nombre_agricultor}
              </p>
            ))}
          </div>
        )}

        {usuario?.rol_id === "gerente_general" && (
          <div className="flex justify-end mb-4">
            <Link
              href="/proyectos/nuevo"
              className="text-base px-4 py-2 rounded-lg text-white font-medium"
              style={{ background: "#3B82F6" }}
            >
              + Crear nuevo proyecto
            </Link>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {fases.map((fase: any) => {
            const proyectosDeLaFase = proyectosActivos.filter((p) => p.fase_id === fase.id);
            return (
              <div key={fase.id}>
                <p className="text-sm font-medium mb-2.5" style={{ color: "var(--text-secondary)" }}>
                  {fase.orden} · {fase.nombre}
                  <span className="ml-1.5 text-sm" style={{ color: "var(--text-secondary)" }}>
                    ({proyectosDeLaFase.length})
                  </span>
                </p>
                {proyectosDeLaFase.length === 0 && (
                  <p className="text-sm italic" style={{ color: "var(--text-secondary)" }}>
                    Sin proyectos
                  </p>
                )}
                {proyectosDeLaFase.map((p) => (
                  <CollapsibleProjectCard
                    key={p.id}
                    proyecto={p}
                    rolUsuario={usuario?.rol_id ?? null}
                    usuarioId={usuario?.id ?? null}
                  />
                ))}
              </div>
            );
          })}

          <div>
            <p className="text-sm font-medium mb-2.5" style={{ color: "var(--status-on-track-text)" }}>
              ✓ Proyectos terminados
              <span className="ml-1.5 text-sm" style={{ color: "var(--text-secondary)" }}>
                ({proyectosTerminados.length})
              </span>
            </p>
            {proyectosTerminados.length === 0 && (
              <p className="text-sm italic" style={{ color: "var(--text-secondary)" }}>
                Sin proyectos
              </p>
            )}
            {proyectosTerminados.map((p) => (
              <CollapsibleProjectCard
                key={p.id}
                proyecto={p}
                rolUsuario={usuario?.rol_id ?? null}
                usuarioId={usuario?.id ?? null}
              />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
