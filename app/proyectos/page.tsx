import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { obtenerProyectosActivos, obtenerProyectosTerminados, obtenerUsuarioActual, FASES_ORDENADAS } from "@/lib/data/proyectos";
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

  const [proyectosActivos, proyectosTerminados] = await Promise.all([
    obtenerProyectosActivos(supabase),
    obtenerProyectosTerminados(supabase),
  ]);

  return (
    <div className="min-h-screen">
      <NavBar />
      <main className="p-5">
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {FASES_ORDENADAS.map((fase) => {
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
                  <p className="text-base italic" style={{ color: "var(--text-secondary)" }}>
                    Sin proyectos
                  </p>
                )}
                {proyectosDeLaFase.map((p) => (
                  <CollapsibleProjectCard key={p.id} proyecto={p} />
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
              <p className="text-base italic" style={{ color: "var(--text-secondary)" }}>
                Sin proyectos
              </p>
            )}
            {proyectosTerminados.map((p) => (
              <CollapsibleProjectCard key={p.id} proyecto={p} />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
