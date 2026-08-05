"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { retrocederEtapa } from "@/lib/retroceder-etapa-client";

export function RetrocederEtapaButton({
  proyectoId,
  usuarioId,
  etapaActualNombre,
  onSuccess,
}: {
  proyectoId: string;
  usuarioId: string;
  etapaActualNombre: string;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [abierto, setAbierto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmar() {
    setEnviando(true);
    setError(null);

    const resultado = await retrocederEtapa(supabase, proyectoId, usuarioId);

    setEnviando(false);

    if (!resultado.ok) {
      setError(resultado.error ?? "No se pudo retroceder la etapa");
      return;
    }

    onSuccess?.();
    router.refresh();
  }

  if (!abierto) {
    return (
      <button
        onClick={() => setAbierto(true)}
        className="w-full h-10 rounded-lg text-sm font-medium border mt-2 flex items-center justify-center gap-2"
        style={{ borderColor: "var(--status-due-soon-fill)", background: "var(--status-due-soon-bg)", color: "var(--status-due-soon-text)" }}
      >
        ↩ Retroceder una etapa
      </button>
    );
  }

  return (
    <div
      className="mt-3 p-3 rounded-lg border"
      style={{ borderColor: "var(--status-due-soon-fill)", background: "var(--status-due-soon-bg)" }}
    >
      <p className="text-sm font-medium mb-1" style={{ color: "var(--status-due-soon-text)" }}>
        Devolver este proyecto una etapa hacia atrás
      </p>
      <p className="text-sm mb-2" style={{ color: "var(--status-due-soon-text)" }}>
        Sale de "{etapaActualNombre}" y vuelve a la etapa anterior. El checklist de esa etapa
        anterior queda sin marcar de nuevo (los datos de formularios, documentos y montos no se
        borran). Se le avisa al nuevo responsable.
      </p>

      {error && (
        <p className="text-sm mb-2" style={{ color: "var(--status-overdue-text)" }}>
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => setAbierto(false)}
          className="flex-1 h-9 rounded-md text-sm font-medium border"
          style={{ borderColor: "var(--border-default)" }}
        >
          Cancelar
        </button>
        <button
          onClick={confirmar}
          disabled={enviando}
          className="flex-1 h-9 rounded-md text-sm font-medium text-white"
          style={{ background: "var(--status-due-soon-fill)" }}
        >
          {enviando ? "Retrocediendo..." : "Confirmar"}
        </button>
      </div>
    </div>
  );
}
