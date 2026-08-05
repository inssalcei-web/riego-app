import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  obtenerProyectosActivos,
  obtenerProyectosTerminados,
  obtenerUsuarioActual,
  obtenerFasesOrdenadas,
  obtenerProyectosPendientesRetomar,
} from "@/lib/data/proyectos";
import { ROLES_GESTION, ROLES_CREAR_PROYECTO } from "@/lib/types";
import { CollapsibleProjectCard } from "@/components/CollapsibleProjectCard";
import { RetomarProyectoCard } from "@/components/RetomarProyectoCard";
import { NavBar } from "@/components/NavBar";
import Link from "next/link";

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

  // La fase 1 (Preparación) es donde vive la etapa 2 ("Visita
  // técnica") — ahí es donde debe reaparecer un proyecto retomado,
  // así que la pregunta "¿Retomar proyecto?" se muestra en esa
  // misma columna, como si el proyecto recién se hubiera creado.
  const primeraFase = fases[0];

  return (
    <div className="min-h-screen">
      <NavBar />
      <main className="p-5">
        {usuario && ROLES_CREAR_PROYECTO.includes(usuario.rol_id) && (
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
            const esPrimeraFase = primeraFase && fase.id === primeraFase.id;

            return (
              <div key={fase.id}>
                <p className="text-sm font-medium mb-2.5" style={{ color: "var(--text-secondary)" }}>
                  {fase.orden} · {fase.nombre}
                  <span className="ml-1.5 text-sm" style={{ color: "var(--text-secondary)" }}>
                    ({proyectosDeLaFase.length})
                  </span>
                </p>

                {esPrimeraFase &&
                  proyectosPendientesRetomar.map((p: any) => (
                    <RetomarProyectoCard
                      key={p.id}
                      proyectoId={p.id}
                      codigoProyecto={p.codigo_proyecto ?? "Sin código"}
                      nombreAgricultor={p.nombre_agricultor ?? "Agricultor sin definir"}
                      usuarioId={usuario!.id}
                    />
                  ))}

                {proyectosDeLaFase.length === 0 && proyectosPendientesRetomar.length === 0 && (
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
