import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { obtenerProyectosActivos, FASES_ORDENADAS } from "@/lib/data/proyectos";
import { ProjectCard } from "@/components/ProjectCard";
import { NavBar } from "@/components/NavBar";

export default async function ProyectosPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const proyectos = await obtenerProyectosActivos(supabase);

  return (
    <div className="min-h-screen">
      <NavBar />
      <main className="p-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {FASES_ORDENADAS.map((fase) => {
            const proyectosDeLaFase = proyectos.filter((p) => p.fase_id === fase.id);
            return (
              <div key={fase.id}>
                <p className="text-xs font-medium mb-2.5" style={{ color: "var(--text-secondary)" }}>
                  {fase.orden} · {fase.nombre}
                  <span className="ml-1.5 text-[10px]" style={{ color: "var(--text-secondary)" }}>
                    ({proyectosDeLaFase.length})
                  </span>
                </p>
                {proyectosDeLaFase.length === 0 && (
                  <p className="text-[11px] italic" style={{ color: "var(--text-secondary)" }}>
                    Sin proyectos
                  </p>
                )}
                {proyectosDeLaFase.map((p) => (
                  <ProjectCard key={p.id} proyecto={p} />
                ))}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
