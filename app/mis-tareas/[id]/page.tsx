import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { obtenerUsuarioActual, estaArchivado } from "@/lib/data/proyectos";
import { ChecklistPanel } from "@/components/ChecklistPanel";
import { FormularioIngresoPanel } from "@/components/FormularioIngresoPanel";
import { DocumentosLegalesPanel } from "@/components/DocumentosLegalesPanel";
import { MontosPostulacionPanel } from "@/components/MontosPostulacionPanel";
import { CerrarProyectoButton } from "@/components/CerrarProyectoButton";
import { EliminarProyectoButton } from "@/components/EliminarProyectoButton";
import { RetrocederEtapaButton } from "@/components/RetrocederEtapaButton";
import { ArchivarProyectoButton } from "@/components/ArchivarProyectoButton";
import { NavBar } from "@/components/NavBar";
import { ChecklistItemConEstado, MOTIVOS_CIERRE, ROLES_GESTION } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DetalleProyectoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const usuario = await obtenerUsuarioActual(supabase);
  if (!usuario) redirect("/login");
  // El rol de solo lectura no gestiona etapas — ve el detalle desde
  // el modal de /proyectos, no desde esta pantalla de acción.
  if (usuario.rol_id === "visualizador") redirect("/proyectos");

  const { data: proyecto } = await supabase
    .from("proyectos")
    .select("*")
    .eq("id", id)
    .single();

  if (!proyecto) notFound();

  const { data: etapa } = await supabase
    .from("etapas_definicion")
    .select("*")
    .eq("id", proyecto.etapa_actual_id)
    .single();

  return (
    <div className="min-h-screen">
      <NavBar />
      <main className="p-5 max-w-md mx-auto">
        <div className="rounded-xl border p-4" style={{ borderColor: "var(--border-default)", background: "var(--surface-card)" }}>
          <p className="font-medium text-lg mb-0.5">{proyecto.codigo_proyecto ?? "Sin código"}</p>
          <p className="text-sm mb-1" style={{ color: "var(--text-secondary)" }}>
            {proyecto.nombre_agricultor ?? "Agricultor sin definir"}
          </p>

          {proyecto.finalizado ? (
            <p className="text-sm mb-4" style={{ color: "var(--status-overdue-text)" }}>
              {proyecto.motivo_cierre
                ? `Cerrado anticipadamente — ${MOTIVOS_CIERRE[proyecto.motivo_cierre] ?? proyecto.motivo_cierre}`
                : "Proyecto completado"}
            </p>
          ) : (
            <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
              Etapa {etapa?.orden} de 27 · {etapa?.nombre}
            </p>
          )}

          <a
            href={`/api/proyectos/${id}/pdf`}
            className="inline-block mb-4 text-sm font-medium"
            style={{ color: "#3B82F6" }}
          >
            ⬇ Descargar PDF
          </a>

          {!proyecto.finalizado && etapa?.mensaje_pendiente && (
            <p
              className="text-sm mb-4 px-3 py-2 rounded-lg"
              style={{ background: "var(--surface-page)", color: "var(--text-secondary)" }}
            >
              {etapa.mensaje_pendiente}
            </p>
          )}

          {!proyecto.finalizado && etapa?.tipo_accion === "formulario" && (
            <FormularioIngresoPanel
              proyectoId={id}
              usuarioId={usuario.id}
              codigoProyecto={proyecto.codigo_proyecto ?? ""}
              nombreAgricultor={proyecto.nombre_agricultor ?? ""}
              datosIniciales={proyecto.datos_formulario ?? {}}
            />
          )}

          {!proyecto.finalizado && etapa?.tipo_accion === "documentos_legales" && (
            <DocumentosLegalesPanelServerWrapper proyectoId={id} usuarioId={usuario.id} />
          )}

          {!proyecto.finalizado && etapa?.requiere_montos && (
            <MontosPostulacionPanel
              proyectoId={id}
              esAdministrador={usuario.rol_id === "administrador"}
              datosIniciales={proyecto.datos_formulario ?? {}}
            />
          )}

          {!proyecto.finalizado && (!etapa || etapa.tipo_accion === "checkbox") && (
            <ChecklistPanelServerWrapper proyectoId={id} etapaId={proyecto.etapa_actual_id} usuarioId={usuario.id} />
          )}

          {ROLES_GESTION.includes(usuario.rol_id) && (
            <div className="mt-4 pt-3 border-t flex flex-col gap-2" style={{ borderColor: "var(--border-default)" }}>
              {!proyecto.finalizado && (
                <>
                  <CerrarProyectoButton proyectoId={id} usuarioId={usuario.id} />
                  {etapa && etapa.orden > 1 && (
                    <RetrocederEtapaButton
                      proyectoId={id}
                      usuarioId={usuario.id}
                      etapaActualNombre={etapa.nombre}
                    />
                  )}
                  <ArchivarProyectoButton
                    proyectoId={id}
                    usuarioId={usuario.id}
                    yaArchivado={estaArchivado(proyecto)}
                  />
                </>
              )}
              <EliminarProyectoButton
                proyectoId={id}
                usuarioId={usuario.id}
                codigoProyecto={proyecto.codigo_proyecto ?? "ELIMINAR"}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

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

  const [{ data: itemsDefinicion }, { data: instanciasExistentes }, { data: usuarios }] = await Promise.all([
    supabase.from("checklist_items_definicion").select("*").eq("etapa_id", etapaId).order("orden"),
    supabase.from("checklist_instancia").select("*").eq("proyecto_id", proyectoId),
    supabase.from("usuarios").select("id, nombre"),
  ]);

  const usuariosPorId = new Map((usuarios ?? []).map((u: any) => [u.id, u.nombre]));

  // Auto-reparación: a algunos proyectos les falta la fila de
  // checklist_instancia para algún ítem (por ejemplo, ítems
  // agregados en una migración posterior a la creación del
  // proyecto). Sin esta fila, el checkbox se veía marcado en
  // pantalla pero no se guardaba nada — creamos acá lo que falte
  // antes de mostrar el checklist, para que quede consistente.
  let instancias = instanciasExistentes ?? [];
  const faltantes = (itemsDefinicion ?? []).filter(
    (def) => !instancias.some((i) => i.item_definicion_id === def.id)
  );
  if (faltantes.length > 0) {
    const { data: creadas } = await supabase
      .from("checklist_instancia")
      .insert(faltantes.map((def) => ({ proyecto_id: proyectoId, item_definicion_id: def.id, completado: false })))
      .select("*");
    instancias = [...instancias, ...(creadas ?? [])];
  }

  const items: ChecklistItemConEstado[] = (itemsDefinicion ?? []).map((def) => {
    const instancia = instancias.find((i) => i.item_definicion_id === def.id);
    return {
      ...def,
      instancia_id: instancia?.id ?? "",
      completado: instancia?.completado ?? false,
      usuario_asignado_nombre: def.usuario_asignado_id ? usuariosPorId.get(def.usuario_asignado_id) ?? null : null,
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
