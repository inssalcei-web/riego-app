import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { obtenerMisProyectos, obtenerUsuarioActual } from "@/lib/data/proyectos";
import { ProjectCard } from "@/components/ProjectCard";
import { NavBar } from "@/components/NavBar";

export default async function MisTareasPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const usuario = await obtenerUsuarioActual(supabase);
  if (!usuario) redirect("/login");

  const proyectos = await obtenerMisProyectos(supabase, usuario.id);

  return (
    <div className="min-h-screen">
      <NavBar />
      <main className="p-5 max-w-md mx-auto">
        <p className="font-medium text-sm mb-4">
          Mis tareas <span style={{ color: "var(--text-secondary)" }}>({proyectos.length})</span>
        </p>

        {proyectos.length === 0 && (
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            No tenés proyectos asignados en este momento.
          </p>
        )}

        {proyectos.map((p) => (
          <ProjectCard key={p.id} proyecto={p} />
        ))}
      </main>
    </div>
  );
}
