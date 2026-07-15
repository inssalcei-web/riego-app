import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { obtenerMisProyectos } from "@/lib/data/proyectos";
import { ProjectCard } from "@/components/ProjectCard";
import { NavBar } from "@/components/NavBar";

// Fuerza a que esta página siempre se calcule de nuevo en el servidor,
// sin usar ninguna versión guardada en caché por Next.js.
export const dynamic = "force-dynamic";

export default async function MisTareasPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (!user) {
    console.error("[mis-tareas] Sin usuario de sesión. Error de auth:", authError);
    redirect("/login");
  }

  const { data: usuario, error: errorUsuario } = await supabase
    .from("usuarios")
    .select("*")
    .eq("auth_user_id", user.id)
    .single();

  if (errorUsuario || !usuario) {
    console.error("[mis-tareas] No se encontró usuario en tabla `usuarios`:", errorUsuario);
    return (
      <div className="min-h-screen">
        <NavBar />
        <main className="p-5 max-w-md mx-auto">
          <p className="font-medium text-sm mb-2">No se pudo cargar tu usuario</p>
          <p className="text-xs mb-1" style={{ color: "var(--text-secondary)" }}>
            Sesión conectada como: {user.email}
          </p>
          <p className="text-xs mb-1" style={{ color: "var(--text-secondary)" }}>
            ID de sesión (auth_user_id): {user.id}
          </p>
          <p className="text-xs" style={{ color: "var(--status-overdue-text)" }}>
            Error de base de datos: {errorUsuario?.message ?? "sin datos"}
          </p>
        </main>
      </div>
    );
  }

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
            No tienes proyectos asignados en este momento.
          </p>
        )}

        {proyectos.map((p) => (
          <ProjectCard key={p.id} proyecto={p} />
        ))}
      </main>
    </div>
  );
}
