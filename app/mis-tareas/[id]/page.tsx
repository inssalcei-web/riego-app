import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { obtenerUsuarioActual } from "@/lib/data/proyectos";
import { ChecklistPanel } from "@/components/ChecklistPanel";
import { NavBar } from "@/components/NavBar";
import { ChecklistItemConEstado } from "@/lib/types";

export default async function DetalleProyectoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const usuario = await obtenerUsuarioActual(supabase);
  if (!usuario) redirect("/login");

  const { data: proyecto } = await supabase
    .from("proyectos")
    .select("*")
    .eq("id", id)
    .single();

  if (!proyecto) notFound();

  const [{ data: cliente }, { data: etapa }] = await Promise.all([
    supabase.from("clientes").select("*").eq("id", proyecto.cliente_id).single(),
    supabase.from("etapas_definicion").select("*").eq("id", proyecto.etapa_actual_id).single(),
  ]);

  // Trae el checklist de la etapa actual, uniendo definición + instancia del proyecto
  const { data: itemsDefinicion } = await supabase
    .from("checklist_items_definicion")
    .select("*")
    .eq("etapa_id", etapa!.id)
    .order("orden");

  const { data: instancias } = await supabase
    .from("checklist_instancia")
    .select("*")
    .eq("proyecto_id", id);

  const items: ChecklistItemConEstado[] = (itemsDefinicion ?? []).map((def) => {
    const instancia = instancias?.find((i) => i.item_definicion_id === def.id);
    return {
      ...def,
      instancia_id: instancia?.id ?? "",
      completado: instancia?.completado ?? false,
    };
  });

  return (
    <div className="min-h-screen">
      <NavBar />
      <main className="p-5 max-w-md mx-auto">
        <div className="rounded-xl border p-4" style={{ borderColor: "var(--border-default)", background: "var(--surface-card)" }}>
          <p className="font-medium text-base mb-0.5">{proyecto.nombre}</p>
          <p className="text-xs mb-4" style={{ color: "var(--text-secondary)" }}>
            {cliente?.nombre} · Etapa {etapa?.orden} de 30 · {etapa?.nombre}
          </p>

          <ChecklistPanel proyectoId={id} itemsIniciales={items} usuarioId={usuario.id} />
        </div>
      </main>
    </div>
  );
}
