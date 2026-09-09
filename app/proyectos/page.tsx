import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  obtenerProyectosActivos,
  obtenerProyectosTerminados,
  obtenerUsuarioActual,
  obtenerFasesOrdenadas,
  obtenerProyectosPendientesRetomar,
} from "@/lib/data/proyectos";
import { ROLES_GESTION } from "@/lib/types";
import { TableroProyectos } from "@/components/TableroProyectos";
import { NavBar } from "@/components/NavBar";

export const dynamic = "force-dynamic";

export default async function ProyectosPage() {
  const supabase = await createClient();

  const usuario = await obtenerUsuarioActual(supabase);
  if (!usuario) redirect("/login");

  const puedeVerRetomar = usuario ? ROLES_GESTION.includes(usuario.rol_id) : false;

  const [proyectosActivos, proyectosTerminados, fases, proyectosPendientesRetomar] = await Promise.all([
    obtenerProyectosActivos(supabase),
    obtenerProyectosTerminados(supabase),
    obtenerFasesOrdenadas(supabase),
    puedeVerRetomar ? obtenerProyectosPendientesRetomar(supabase) : Promise.resolve([]),
  ]);

  return (
    <div className="min-h-screen">
      <NavBar />
      <main className="p-5">
        <TableroProyectos
          fases={fases}
          proyectosActivos={proyectosActivos}
          proyectosTerminados={proyectosTerminados}
          proyectosPendientesRetomar={proyectosPendientesRetomar}
          usuario={usuario ? { id: usuario.id, rol_id: usuario.rol_id } : null}
        />
      </main>
    </div>
  );
}
