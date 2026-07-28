"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { decidirRetomarProyecto } from "@/lib/retomar-proyecto-client";

export function RetomarProyectoCard({
  proyectoId,
  codigoProyecto,
  nombreAgricultor,
  usuarioId,
}: {
  proyectoId: string;
  codigoProyecto: string;
  nombreAgricultor: string;
  usuarioId: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function decidir(decision: "si" | "no") {
    setEnviando(true);
    setError(null);

    const resultado = await decidirRetomarProyecto(supabase, proyectoId, usuarioId, decision);

    setEnviando(false);

    if (!resultado.ok) {
      setError(resultado.error ?? "No se pudo procesar la decisión");
      return;
    }

    router.refresh();
  }

  return (
    <div
      className="rounded-xl border mb-2.5 p-3"
      style={{ borderColor: "var(--status-due-soon-fill)", background: "var(--status-due-soon-bg)" }}
    >
      <p className="font-medium text-base mb-0.5">{codigoProyecto}</p>
      <p className="text-sm mb-2" style={{ color: "var(--text-secondary)" }}>
        {nombreAgricultor}
      </p>
      <p className="text-sm font-medium mb-2" style={{ color: "var(--status-due-soon-text)" }}>
        ¿Retomar proyecto?
      </p>

      {error && (
        <p className="text-sm mb-2" style={{ color: "var(--status-overdue-text)" }}>
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => decidir("si")}
          disabled={enviando}
          className="flex-1 h-9 rounded-md text-sm font-medium text-white"
          style={{ background: "var(--status-on-track-fill)" }}
        >
          Sí
        </button>
        <button
          onClick={() => decidir("no")}
          disabled={enviando}
          className="flex-1 h-9 rounded-md text-sm font-medium border"
          style={{ borderColor: "var(--border-default)" }}
        >
          No
        </button>
      </div>
    </div>
  );
}
