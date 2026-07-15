"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { completarEtapa as llamarCompletarEtapa } from "@/lib/complete-stage-client";
import { ChecklistItemConEstado } from "@/lib/types";

export function ChecklistPanel({
  proyectoId,
  itemsIniciales,
  usuarioId,
}: {
  proyectoId: string;
  itemsIniciales: ChecklistItemConEstado[];
  usuarioId: string;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [items, setItems] = useState(itemsIniciales);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const faltaObligatorio = items.some((i) => i.obligatorio && !i.completado);

  async function toggleItem(item: ChecklistItemConEstado) {
    const nuevoValor = !item.completado;

    // Actualización optimista: se ve el cambio al instante, sin esperar la red
    setItems((prev) =>
      prev.map((i) => (i.instancia_id === item.instancia_id ? { ...i, completado: nuevoValor } : i))
    );

    const { error } = await supabase
      .from("checklist_instancia")
      .update({
        completado: nuevoValor,
        completado_en: nuevoValor ? new Date().toISOString() : null,
        completado_por: nuevoValor ? usuarioId : null,
      })
      .eq("id", item.instancia_id);

    if (error) {
      // Revertir si falló
      setItems((prev) =>
        prev.map((i) => (i.instancia_id === item.instancia_id ? { ...i, completado: !nuevoValor } : i))
      );
    }
  }

  async function completarEtapa() {
    setEnviando(true);
    setError(null);

    const resultado = await llamarCompletarEtapa(supabase, proyectoId, usuarioId);

    setEnviando(false);

    if (!resultado.ok) {
      setError(resultado.error ?? "No se pudo completar la etapa. Intenta de nuevo.");
      return;
    }

    router.push("/mis-tareas");
    router.refresh();
  }

  return (
    <div>
      <p className="text-xs font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
        Checklist de la etapa
      </p>

      <div className="flex flex-col gap-2 mb-4">
        {items.map((item) => (
          <button
            key={item.instancia_id}
            onClick={() => toggleItem(item)}
            className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left"
            style={{ background: "var(--surface-page)" }}
          >
            <span
              className="w-4 h-4 rounded border flex items-center justify-center text-[10px]"
              style={{
                borderColor: item.completado ? "var(--status-on-track-fill)" : "var(--border-strong)",
                background: item.completado ? "var(--status-on-track-fill)" : "transparent",
                color: "#fff",
              }}
            >
              {item.completado ? "✓" : ""}
            </span>
            <span
              className="text-[13px] flex-1"
              style={{
                textDecoration: item.completado ? "line-through" : "none",
                color: item.completado ? "var(--text-secondary)" : "var(--text-primary)",
              }}
            >
              {item.descripcion}
            </span>
            <span className="text-[10px]" style={{ color: item.obligatorio ? "var(--status-due-soon-text)" : "var(--text-secondary)" }}>
              {item.obligatorio ? "obligatorio" : "opcional"}
            </span>
          </button>
        ))}
      </div>

      {error && (
        <p className="text-xs mb-2" style={{ color: "var(--status-overdue-text)" }}>
          {error}
        </p>
      )}

      <button
        onClick={completarEtapa}
        disabled={faltaObligatorio || enviando}
        className="w-full h-10 rounded-lg text-sm font-medium"
        style={{
          background: faltaObligatorio ? "var(--surface-page)" : "#3B82F6",
          color: faltaObligatorio ? "var(--text-secondary)" : "#fff",
          border: faltaObligatorio ? "1px solid var(--border-default)" : "none",
        }}
      >
        {enviando
          ? "Procesando..."
          : faltaObligatorio
          ? "Completar etapa · faltan obligatorios"
          : "Completar etapa"}
      </button>
    </div>
  );
}
