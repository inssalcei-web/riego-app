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
    if (item.usuario_asignado_id && item.usuario_asignado_id !== usuarioId) {
      return;
    }

    const nuevoValor = !item.completado;
    const idAntesDeTocar = item.instancia_id;

    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, completado: nuevoValor } : i))
    );

    function revertir() {
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, completado: !nuevoValor } : i))
      );
    }

    const cambios = {
      completado: nuevoValor,
      completado_en: nuevoValor ? new Date().toISOString() : null,
      completado_por: nuevoValor ? usuarioId : null,
    };

    // Si ya existe la fila, se actualiza. Pedimos .select() a
    // propósito: un update contra un id que no coincide con
    // ninguna fila NO devuelve error en Supabase, solo un arreglo
    // vacío — sin este chequeo, ese caso quedaba silenciosamente
    // sin guardar aunque la UI mostrara el check marcado.
    if (idAntesDeTocar) {
      const { data, error } = await supabase
        .from("checklist_instancia")
        .update(cambios)
        .eq("id", idAntesDeTocar)
        .select("id");

      if (!error && data && data.length > 0) return;
      if (error) {
        revertir();
        return;
      }
    }

    // No había fila (o el update no encontró ninguna): la creamos
    // ahora. Esto es lo que hace que el checklist se autorepare en
    // vez de quedar marcado solo en pantalla sin guardarse.
    const { data: creada, error: errorInsert } = await supabase
      .from("checklist_instancia")
      .insert({
        proyecto_id: proyectoId,
        item_definicion_id: item.id,
        ...cambios,
      })
      .select("id")
      .single();

    if (errorInsert || !creada) {
      revertir();
      return;
    }

    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, instancia_id: creada.id } : i))
    );
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

    sessionStorage.setItem("riego-app-etapa-completada", "1");
    router.push("/mis-tareas");
    router.refresh();
  }

  return (
    <div>
      <p className="text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
        Checklist de la etapa
      </p>

      <div className="flex flex-col gap-2 mb-4">
        {items.map((item) => {
          const esDeOtraPersona = item.usuario_asignado_id && item.usuario_asignado_id !== usuarioId;
          return (
            <button
              key={item.id}
              onClick={() => toggleItem(item)}
              disabled={!!esDeOtraPersona}
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left"
              style={{
                background: "var(--surface-page)",
                opacity: esDeOtraPersona ? 0.55 : 1,
                cursor: esDeOtraPersona ? "not-allowed" : "pointer",
              }}
            >
              <span
                className="w-4 h-4 rounded border flex items-center justify-center text-sm"
                style={{
                  borderColor: item.completado ? "var(--status-on-track-fill)" : "var(--border-strong)",
                  background: item.completado ? "var(--status-on-track-fill)" : "transparent",
                  color: "#fff",
                }}
              >
                {item.completado ? "✓" : ""}
              </span>
              <span
                className="text-lg flex-1"
                style={{
                  textDecoration: item.completado ? "line-through" : "none",
                  color: item.completado ? "var(--text-secondary)" : "var(--text-primary)",
                }}
              >
                {item.descripcion}
                {item.usuario_asignado_nombre && (
                  <span className="block text-sm" style={{ color: "var(--text-secondary)" }}>
                    Asignado a: {item.usuario_asignado_nombre}
                  </span>
                )}
              </span>
              <span className="text-sm" style={{ color: item.obligatorio ? "var(--status-due-soon-text)" : "var(--text-secondary)" }}>
                {item.obligatorio ? "obligatorio" : "opcional"}
              </span>
            </button>
          );
        })}
      </div>

      {error && (
        <p className="text-sm mb-2" style={{ color: "var(--status-overdue-text)" }}>
          {error}
        </p>
      )}

      <button
        onClick={completarEtapa}
        disabled={faltaObligatorio || enviando}
        className="w-full h-10 rounded-lg text-base font-medium"
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
