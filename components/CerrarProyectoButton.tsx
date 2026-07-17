"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cerrarProyectoAnticipado } from "@/lib/cerrar-proyecto-client";
import { MOTIVOS_CIERRE } from "@/lib/types";

export function CerrarProyectoButton({
  proyectoId,
  usuarioId,
}: {
  proyectoId: string;
  usuarioId: string;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [abierto, setAbierto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmar() {
    if (!motivo) {
      setError("Selecciona un motivo");
      return;
    }
    setEnviando(true);
    setError(null);

    const resultado = await cerrarProyectoAnticipado(supabase, proyectoId, usuarioId, motivo);

    setEnviando(false);

    if (!resultado.ok) {
      setError(resultado.error ?? "No se pudo cerrar el proyecto");
      return;
    }

    router.push("/proyectos");
    router.refresh();
  }

  if (!abierto) {
    return (
      <button
        onClick={() => setAbierto(true)}
        className="text-xs mt-3"
        style={{ color: "var(--status-overdue-text)" }}
      >
        Cerrar proyecto anticipadamente
      </button>
    );
  }

  return (
    <div
      className="mt-3 p-3 rounded-lg border"
      style={{ borderColor: "var(--status-overdue-fill)", background: "var(--status-overdue-bg)" }}
    >
      <p className="text-xs font-medium mb-2" style={{ color: "var(--status-overdue-text)" }}>
        Cerrar este proyecto anticipadamente
      </p>

      <select
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
        className="w-full h-9 px-2 mb-2 rounded-md border text-sm"
        style={{ borderColor: "var(--border-default)" }}
      >
        <option value="">Selecciona un motivo...</option>
        {Object.entries(MOTIVOS_CIERRE).map(([valor, etiqueta]) => (
          <option key={valor} value={valor}>
            {etiqueta}
          </option>
        ))}
      </select>

      {error && (
        <p className="text-xs mb-2" style={{ color: "var(--status-overdue-text)" }}>
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => setAbierto(false)}
          className="flex-1 h-9 rounded-md text-xs font-medium border"
          style={{ borderColor: "var(--border-default)" }}
        >
          Cancelar
        </button>
        <button
          onClick={confirmar}
          disabled={enviando}
          className="flex-1 h-9 rounded-md text-xs font-medium text-white"
          style={{ background: "var(--status-overdue-fill)" }}
        >
          {enviando ? "Cerrando..." : "Confirmar cierre"}
        </button>
      </div>
    </div>
  );
}
