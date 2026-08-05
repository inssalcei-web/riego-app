"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cerrarProyectoAnticipado } from "@/lib/cerrar-proyecto-client";
import { MOTIVOS_CIERRE } from "@/lib/types";

export function CerrarProyectoButton({
  proyectoId,
  usuarioId,
  onSuccess,
}: {
  proyectoId: string;
  usuarioId: string;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [abierto, setAbierto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [fechaRetomar, setFechaRetomar] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmar() {
    if (!motivo) {
      setError("Selecciona un motivo");
      return;
    }
    setEnviando(true);
    setError(null);

    const resultado = await cerrarProyectoAnticipado(supabase, proyectoId, usuarioId, motivo, fechaRetomar || null);

    setEnviando(false);

    if (!resultado.ok) {
      setError(resultado.error ?? "No se pudo cerrar el proyecto");
      return;
    }

    onSuccess?.();
    router.push("/proyectos");
    router.refresh();
  }

  if (!abierto) {
    return (
      <button
        onClick={() => setAbierto(true)}
        className="w-full h-10 rounded-lg text-sm font-medium border mt-2 flex items-center justify-center gap-2"
        style={{ borderColor: "var(--status-due-soon-fill)", background: "var(--status-due-soon-bg)", color: "var(--status-due-soon-text)" }}
      >
        ⏸ Cerrar proyecto anticipadamente
      </button>
    );
  }

  return (
    <div
      className="mt-3 p-3 rounded-lg border"
      style={{ borderColor: "var(--status-overdue-fill)", background: "var(--status-overdue-bg)" }}
    >
      <p className="text-sm font-medium mb-2" style={{ color: "var(--status-overdue-text)" }}>
        Cerrar este proyecto anticipadamente
      </p>

      <select
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
        className="w-full h-9 px-2 mb-2 rounded-md border text-base"
        style={{ borderColor: "var(--border-default)" }}
      >
        <option value="">Selecciona un motivo...</option>
        {Object.entries(MOTIVOS_CIERRE).map(([valor, etiqueta]) => (
          <option key={valor} value={valor}>
            {etiqueta}
          </option>
        ))}
      </select>

      <label className="text-sm block mb-1" style={{ color: "var(--status-overdue-text)" }}>
        Fecha para retomar (opcional)
      </label>
      <input
        type="date"
        value={fechaRetomar}
        onChange={(e) => setFechaRetomar(e.target.value)}
        className="w-full h-9 px-2 mb-2 rounded-md border text-base"
        style={{ borderColor: "var(--border-default)" }}
      />
      <p className="text-sm mb-2" style={{ color: "var(--status-overdue-text)" }}>
        Si la completas, al Gerente general le va a llegar un aviso apenas entre a la
        aplicación en o después de esa fecha.
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
          style={{ background: "var(--status-overdue-fill)" }}
        >
          {enviando ? "Cerrando..." : "Confirmar cierre"}
        </button>
      </div>
    </div>
  );
}
