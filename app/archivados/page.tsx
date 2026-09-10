import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { obtenerProyectosArchivados, obtenerUsuarioActual, DIAS_PARA_ARCHIVAR } from "@/lib/data/proyectos";
import { CollapsibleProjectCard } from "@/components/CollapsibleProjectCard";
import { NavBar } from "@/components/NavBar";

export const dynamic = "force-dynamic";

export default async function ArchivadosPage({
  searchParams,
}: {
  // Viene del buscador de /proyectos: cuando una coincidencia es un
  // proyecto archivado, se navega acá con ?resaltar=<id> para
  // marcarlo automáticamente, igual que hace el tablero principal.
  searchParams: Promise<{ resaltar?: string }>;
}) {
  const supabase = await createClient();

  const usuario = await obtenerUsuarioActual(supabase);
  if (!usuario) redirect("/login");

  const { resaltar } = await searchParams;
  const proyectos = await obtenerProyectosArchivados(supabase);

  return (
    <div className="min-h-screen">
      <NavBar />
      <main className="p-5 max-w-md mx-auto">
        <p className="font-medium text-base mb-1">
          Proyectos archivados <span style={{ color: "var(--text-secondary)" }}>({proyectos.length})</span>
        </p>
        <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
          Proyectos con {DIAS_PARA_ARCHIVAR} días o más sin moverse de etapa, o archivados manualmente. Reaparecen
          solos en el panel principal apenas tengan un movimiento real.
        </p>

        {proyectos.length === 0 && (
          <p className="text-base italic" style={{ color: "var(--text-secondary)" }}>
            No hay proyectos archivados por ahora.
          </p>
        )}

        {proyectos.map((p) => (
          <div key={p.id}>
            <CollapsibleProjectCard
              proyecto={p}
              rolUsuario={usuario?.rol_id ?? null}
              usuarioId={usuario?.id ?? null}
              resaltada={p.id === resaltar}
            />
            <p className="text-sm -mt-2 mb-3 px-1" style={{ color: "var(--text-secondary)" }}>
              {p.archivado_manual
                ? `Archivado manualmente${p.archivado_motivo ? ` — ${p.archivado_motivo}` : ""}`
                : `Archivado automático — ${p.dias_en_etapa} días sin moverse de etapa`}
            </p>
          </div>
        ))}
      </main>
    </div>
  );
}
