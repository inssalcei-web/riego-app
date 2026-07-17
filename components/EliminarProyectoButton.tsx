"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { eliminarProyecto } from "@/lib/eliminar-proyecto-client";

export function EliminarProyectoButton({
  proyectoId,
  usuarioId,
  codigoProyecto,
}: {
  proyectoId: string;
  usuarioId: string;
  codigoProyecto: string;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [abierto, setAbierto] = useState(false);
  const [confirmacion, setConfirmacion] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const textoEsperado = codigoProyecto || "ELIMINAR";
  const puedeConfirmar = confirmacion.trim() === textoEsperado;

  async function confirmar() {
    if (!puedeConfirmar) return;
    setEnviando(true);
    setError(null);

    const resultado = await eliminarProyecto(supabase, proyectoId, usuarioId);

    setEnviando(false);

    if (!resultado.ok) {
      setError(resultado.error ?? "No se pudo eliminar el proyecto");
      return;
    }

    router.push("/proyectos");
    router.refresh();
  }

  if (!abierto) {
    return (
      <button
        onClick={() => setAbierto(true)}
        className="text-sm mt-3"
        style={{ color: "var(--status-overdue-text)" }}
      >
        Eliminar proyecto por completo
      </button>
    );
  }

  return (
    <div
      className="mt-3 p-3 rounded-lg border"
      style={{ borderColor: "var(--status-overdue-fill)", background: "var(--status-overdue-bg)" }}
    >
      <p className="text-sm font-medium mb-1" style={{ color: "var(--status-overdue-text)" }}>
        Esto va a borrar el proyecto por completo
      </p>
      <p className="text-base mb-2" style={{ color: "var(--status-overdue-text)" }}>
        Se elimina todo su historial, checklist, documentos y datos de KPIs. No se puede deshacer.
        Para confirmar, escribe <strong>{textoEsperado}</strong> abajo.
      </p>

      <input
        value={confirmacion}
        onChange={(e) => setConfirmacion(e.target.value)}
        className="w-full h-9 px-2 mb-2 rounded-md border text-base"
        style={{ borderColor: "var(--border-default)" }}
      />

      {error && (
        <p className="text-sm mb-2" style={{ color: "var(--status-overdue-text)" }}>
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => {
            setAbierto(false);
            setConfirmacion("");
          }}
          className="flex-1 h-9 rounded-md text-sm font-medium border"
          style={{ borderColor: "var(--border-default)" }}
        >
          Cancelar
        </button>
        <button
          onClick={confirmar}
          disabled={!puedeConfirmar || enviando}
          className="flex-1 h-9 rounded-md text-sm font-medium text-white"
          style={{ background: "var(--status-overdue-fill)", opacity: puedeConfirmar ? 1 : 0.5 }}
        >
          {enviando ? "Eliminando..." : "Eliminar definitivamente"}
        </button>
      </div>
    </div>
  );
}
