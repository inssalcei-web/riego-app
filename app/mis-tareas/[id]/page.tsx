import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { obtenerUsuarioActual } from "@/lib/data/proyectos";
import { ChecklistPanel } from "@/components/ChecklistPanel";
import { FormularioIngresoPanel } from "@/components/FormularioIngresoPanel";
import { DocumentosLegalesPanel } from "@/components/DocumentosLegalesPanel";
import { NavBar } from "@/components/NavBar";
import { ChecklistItemConEstado } from "@/lib/types";

export const dynamic = "force-dynamic";

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

  return (
    <div className="min-h-screen">
      <NavBar />
      <main className="p-5 max-w-md mx-auto">
        <div className="rounded-xl border p-4" style={{ borderColor: "var(--border-default)", background: "var(--surface-card)" }}>
          <p className="font-medium text-base mb-0.5">{proyecto.nombre}</p>
          <p className="text-xs mb-4" style={{ color: "var(--text-secondary)" }}>
            {cliente?.nombre} · Etapa {etapa?.orden} de 30 · {etapa?.nombre}
          </p>

          {etapa?.mensaje_pendiente && (
            <p
              className="text-xs mb-4 px-3 py-2 rounded-lg"
              style={{ background: "var(--surface-page)", color: "var(--text-secondary)" }}
            >
              {etapa.mensaje_pendiente}
            </p>
          )}

          {etapa?.tipo_accion === "formulario" && (
            <FormularioIngresoPanel
              proyectoId={id}
              usuarioId={usuario.id}
              datosIniciales={proyecto.datos_formulario ?? {}}
            />
          )}

          {etapa?.tipo_accion === "documentos_legales" && (
            <DocumentosLegalesPanelServerWrapper proyectoId={id} usuarioId={usuario.id} />
          )}

          {(!etapa || etapa.tipo_accion === "checkbox") && (
            <ChecklistPanelServerWrapper proyectoId={id} etapaId={proyecto.etapa_actual_id} usuarioId={usuario.id} />
          )}
        </div>
      </main>
    </div>
  );
}

// Envuelve la carga de datos del checklist para mantener el componente
// principal más simple de leer.
async function ChecklistPanelServerWrapper({
  proyectoId,
  etapaId,
  usuarioId,
}: {
  proyectoId: string;
  etapaId: number;
  usuarioId: string;
}) {
  const supabase = await createClient();

  const { data: itemsDefinicion } = await supabase
    .from("checklist_items_definicion")
    .select("*")
    .eq("etapa_id", etapaId)
    .order("orden");

  const { data: instancias } = await supabase
    .from("checklist_instancia")
    .select("*")
    .eq("proyecto_id", proyectoId);

  const items: ChecklistItemConEstado[] = (itemsDefinicion ?? []).map((def) => {
    const instancia = instancias?.find((i) => i.item_definicion_id === def.id);
    return {
      ...def,
      instancia_id: instancia?.id ?? "",
      completado: instancia?.completado ?? false,
    };
  });

  return <ChecklistPanel proyectoId={proyectoId} itemsIniciales={items} usuarioId={usuarioId} />;
}

async function DocumentosLegalesPanelServerWrapper({
  proyectoId,
  usuarioId,
}: {
  proyectoId: string;
  usuarioId: string;
}) {
  const supabase = await createClient();

  const [{ data: catalogo }, { data: seleccionados }] = await Promise.all([
    supabase.from("documentos_legales_catalogo").select("*").order("nombre"),
    supabase.from("proyecto_documentos_legales").select("*").eq("proyecto_id", proyectoId),
  ]);

  const catalogoPorId = new Map((catalogo ?? []).map((c) => [c.id, c]));
  const seleccionadosConNombre = (seleccionados ?? []).map((s) => ({
    ...s,
    nombre: catalogoPorId.get(s.documento_id)?.nombre ?? "Documento",
  }));

  return (
    <DocumentosLegalesPanel
      proyectoId={proyectoId}
      usuarioId={usuarioId}
      catalogo={catalogo ?? []}
      seleccionadosIniciales={seleccionadosConNombre}
    />
  );
}
