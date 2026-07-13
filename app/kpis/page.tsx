import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { obtenerProyectosActivos, FASES_ORDENADAS } from "@/lib/data/proyectos";
import { NavBar } from "@/components/NavBar";

export default async function KpisPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const proyectos = await obtenerProyectosActivos(supabase);

  const total = proyectos.length;
  const enPlazo = proyectos.filter((p) => p.estado_cumplimiento === "en_plazo").length;
  const porVencer = proyectos.filter((p) => p.estado_cumplimiento === "por_vencer").length;
  const atrasados = proyectos.filter((p) => p.estado_cumplimiento === "atrasado").length;

  const maxPorFase = Math.max(
    1,
    ...FASES_ORDENADAS.map((f) => proyectos.filter((p) => p.fase_id === f.id).length)
  );

  return (
    <div className="min-h-screen">
      <NavBar />
      <main className="p-5 max-w-2xl mx-auto">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-6">
          {[
            { label: "Proyectos activos", valor: total, color: "var(--text-primary)" },
            { label: "En plazo", valor: enPlazo, color: "var(--status-on-track-text)" },
            { label: "Por vencer", valor: porVencer, color: "var(--status-due-soon-text)" },
            { label: "Atrasados", valor: atrasados, color: "var(--status-overdue-text)" },
          ].map((m) => (
            <div key={m.label} className="rounded-lg p-3" style={{ background: "var(--surface-page)" }}>
              <p className="text-[11px] mb-1" style={{ color: "var(--text-secondary)" }}>
                {m.label}
              </p>
              <p className="text-xl font-medium" style={{ color: m.color }}>
                {m.valor}
              </p>
            </div>
          ))}
        </div>

        <p className="text-xs font-medium mb-2.5" style={{ color: "var(--text-secondary)" }}>
          Proyectos por fase
        </p>
        <div className="flex items-end gap-3 h-28 mb-8">
          {FASES_ORDENADAS.map((fase) => {
            const cantidad = proyectos.filter((p) => p.fase_id === fase.id).length;
            const alturaPct = (cantidad / maxPorFase) * 100;
            return (
              <div key={fase.id} className="flex flex-col items-center gap-1.5 flex-1">
                <div
                  className="w-full rounded-t"
                  style={{ height: `${Math.max(alturaPct, 4)}%`, background: "#3B82F6" }}
                />
                <span className="text-[10px] text-center" style={{ color: "var(--text-secondary)" }}>
                  {fase.nombre.split(" ")[0]}
                </span>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
