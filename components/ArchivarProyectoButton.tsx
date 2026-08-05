"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { archivarProyecto } from "@/lib/archivar-proyecto-client";

export function ArchivarProyectoButton({
  proyectoId,
  usuarioId,
  yaArchivado,
  onSuccess,
}: {
  proyectoId: string;
  usuarioId: string;
  yaArchivado: boolean;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [abierto, setAbierto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmarArchivar() {
    if (!motivo.trim()) {
      setError("Escribe un motivo");
      return;
    }
    setEnviando(true);
    setError(null);

    const resultado = await archivarProyecto(supabase, proyectoId, usuarioId, "archivar", motivo);

    setEnviando(false);

    if (!resultado.ok) {
      setError(resultado.error ?? "No se pudo archivar el proyecto");
      return;
    }

    onSuccess?.();
    router.refresh();
  }

  async function desarchivar() {
    setEnviando(true);
    setError(null);

    const resultado = await archivarProyecto(supabase, proyectoId, usuarioId, "desarchivar");

    setEnviando(false);

    if (!resultado.ok) {
      setError(resultado.error ?? "No se pudo desarchivar el proyecto");
      return;
    }

    onSuccess?.();
    router.refresh();
  }

  if (yaArchivado) {
    return (
      <div>
        {error && (
          <p className="text-sm mb-2" style={{ color: "var(--status-overdue-text)" }}>
            {error}
          </p>
        )}
        <button
          onClick={desarchivar}
          disabled={enviando}
          className="w-full h-10 rounded-lg text-sm font-medium border mt-2 flex items-center justify-center gap-2"
          style={{ borderColor: "var(--border-strong)", background: "var(--surface-page)", color: "var(--text-primary)" }}
        >
          📤 {enviando ? "Desarchivando..." : "Desarchivar proyecto"}
        </button>
      </div>
    );
  }

  if (!abierto) {
    return (
      <button
        onClick={() => setAbierto(true)}
        className="w-full h-10 rounded-lg text-sm font-medium border mt-2 flex items-center justify-center gap-2"
        style={{ borderColor: "var(--border-strong)", background: "var(--surface-page)", color: "var(--text-primary)" }}
      >
        📥 Archivar proyecto
      </button>
    );
  }

  return (
    <div
      className="mt-3 p-3 rounded-lg border"
      style={{ borderColor: "var(--border-default)", background: "var(--surface-page)" }}
    >
      <p className="text-sm font-medium mb-2">Archivar este proyecto</p>

      <input
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
        placeholder="Motivo del archivado"
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
          onClick={() => setAbierto(false)}
          className="flex-1 h-9 rounded-md text-sm font-medium border"
          style={{ borderColor: "var(--border-default)" }}
        >
          Cancelar
        </button>
        <button
          onClick={confirmarArchivar}
          disabled={enviando}
          className="flex-1 h-9 rounded-md text-sm font-medium border"
          style={{ borderColor: "var(--border-default)", color: "var(--text-secondary)" }}
        >
          {enviando ? "Archivando..." : "Confirmar"}
        </button>
      </div>
    </div>
  );
}
