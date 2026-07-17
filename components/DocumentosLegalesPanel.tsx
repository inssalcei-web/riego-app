"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { completarEtapa as llamarCompletarEtapa } from "@/lib/complete-stage-client";
import { DocumentoLegalCatalogo, ProyectoDocumentoLegal } from "@/lib/types";

interface DocumentoSeleccionado extends ProyectoDocumentoLegal {
  nombre: string;
}

export function DocumentosLegalesPanel({
  proyectoId,
  usuarioId,
  catalogo,
  seleccionadosIniciales,
}: {
  proyectoId: string;
  usuarioId: string;
  catalogo: DocumentoLegalCatalogo[];
  seleccionadosIniciales: DocumentoSeleccionado[];
}) {
  const router = useRouter();
  const supabase = createClient();

  const [seleccionados, setSeleccionados] = useState(seleccionadosIniciales);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const idsSeleccionados = new Set(seleccionados.map((s) => s.documento_id));
  const disponibles = catalogo.filter((d) => !idsSeleccionados.has(d.id));
  const faltaMarcar = seleccionados.some((s) => !s.completado);

  async function agregarDocumento(doc: DocumentoLegalCatalogo) {
    const { data } = await supabase
      .from("proyecto_documentos_legales")
      .insert({ proyecto_id: proyectoId, documento_id: doc.id, completado: false })
      .select()
      .single();

    if (data) {
      setSeleccionados((prev) => [...prev, { ...data, nombre: doc.nombre }]);
    }
  }

  async function quitarDocumento(id: string) {
    await supabase.from("proyecto_documentos_legales").delete().eq("id", id);
    setSeleccionados((prev) => prev.filter((s) => s.id !== id));
  }

  async function toggleCompletado(item: DocumentoSeleccionado) {
    const nuevoValor = !item.completado;
    setSeleccionados((prev) =>
      prev.map((s) => (s.id === item.id ? { ...s, completado: nuevoValor } : s))
    );
    await supabase
      .from("proyecto_documentos_legales")
      .update({ completado: nuevoValor })
      .eq("id", item.id);
  }

  async function completarEtapa() {
    setEnviando(true);
    setError(null);

    const resultado = await llamarCompletarEtapa(supabase, proyectoId, usuarioId);

    setEnviando(false);

    if (!resultado.ok) {
      setError(resultado.error ?? "No se pudo completar la etapa. Intenta de nuevo.");
      if (resultado.error?.includes("completada por otra persona")) {
        setTimeout(() => router.refresh(), 1800);
      }
      return;
    }

    router.push("/mis-tareas");
    router.refresh();
  }

  return (
    <div>
      <p className="text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
        Documentos disponibles — agrega los que apliquen a este proyecto
      </p>

      <div className="flex flex-col gap-1.5 mb-4 max-h-48 overflow-y-auto">
        {disponibles.map((doc) => (
          <button
            key={doc.id}
            onClick={() => agregarDocumento(doc)}
            className="flex items-center justify-between px-2.5 py-2 rounded-lg text-left text-lg"
            style={{ background: "var(--surface-page)" }}
          >
            <span>{doc.nombre}</span>
            <span style={{ color: "#3B82F6" }}>+ Agregar</span>
          </button>
        ))}
        {disponibles.length === 0 && (
          <p className="text-sm italic" style={{ color: "var(--text-secondary)" }}>
            Ya agregaste todos los documentos del catálogo.
          </p>
        )}
      </div>

      <p className="text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
        Documentos solicitados para este proyecto ({seleccionados.length})
      </p>

      <div className="flex flex-col gap-1.5 mb-4">
        {seleccionados.length === 0 && (
          <p className="text-sm italic" style={{ color: "var(--text-secondary)" }}>
            Todavía no agregaste ningún documento.
          </p>
        )}

        {seleccionados.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg"
            style={{ background: "var(--surface-page)" }}
          >
            <button
              onClick={() => toggleCompletado(item)}
              className="w-4 h-4 rounded border flex items-center justify-center text-sm shrink-0"
              style={{
                borderColor: item.completado ? "var(--status-on-track-fill)" : "var(--border-strong)",
                background: item.completado ? "var(--status-on-track-fill)" : "transparent",
                color: "#fff",
              }}
            >
              {item.completado ? "✓" : ""}
            </button>
            <span
              className="text-lg flex-1"
              style={{
                textDecoration: item.completado ? "line-through" : "none",
                color: item.completado ? "var(--text-secondary)" : "var(--text-primary)",
              }}
            >
              {item.nombre}
            </span>
            <button
              onClick={() => quitarDocumento(item.id)}
              className="text-base"
              style={{ color: "var(--status-overdue-text)" }}
            >
              Quitar
            </button>
          </div>
        ))}
      </div>

      {error && (
        <p className="text-sm mb-2" style={{ color: "var(--status-overdue-text)" }}>
          {error}
        </p>
      )}

      <button
        onClick={completarEtapa}
        disabled={seleccionados.length === 0 || faltaMarcar || enviando}
        className="w-full h-10 rounded-lg text-base font-medium"
        style={{
          background: seleccionados.length === 0 || faltaMarcar ? "var(--surface-page)" : "#3B82F6",
          color: seleccionados.length === 0 || faltaMarcar ? "var(--text-secondary)" : "#fff",
          border: seleccionados.length === 0 || faltaMarcar ? "1px solid var(--border-default)" : "none",
        }}
      >
        {enviando
          ? "Procesando..."
          : seleccionados.length === 0
          ? "Agrega al menos un documento"
          : faltaMarcar
          ? "Completar etapa · faltan documentos por marcar"
          : "Completar etapa"}
      </button>
    </div>
  );
}
