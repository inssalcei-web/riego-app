"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { completarEtapa as llamarCompletarEtapa } from "@/lib/complete-stage-client";
import { CAMPOS_FORMULARIO_INGRESO } from "@/lib/formulario-ingreso-config";

export function FormularioIngresoPanel({
  proyectoId,
  usuarioId,
  codigoProyecto,
  nombreAgricultor,
  datosIniciales,
}: {
  proyectoId: string;
  usuarioId: string;
  codigoProyecto: string;
  nombreAgricultor: string;
  datosIniciales: Record<string, string | number>;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [datos, setDatos] = useState<Record<string, string>>(
    Object.fromEntries(
      CAMPOS_FORMULARIO_INGRESO.map((c) => [c.key, String(datosIniciales?.[c.key] ?? "")])
    )
  );
  const [guardando, setGuardando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const faltanCampos = CAMPOS_FORMULARIO_INGRESO.filter(
    (c) => c.obligatorio && !datos[c.key]?.trim()
  );

  function actualizarCampo(key: string, value: string) {
    setDatos((prev) => ({ ...prev, [key]: value }));
  }

  async function guardarBorrador() {
    setGuardando(true);
    await supabase.from("proyectos").update({ datos_formulario: datos }).eq("id", proyectoId);
    setGuardando(false);
  }

  async function completarEtapa() {
    setEnviando(true);
    setError(null);

    // Guarda los datos actuales antes de intentar cerrar la etapa
    await supabase.from("proyectos").update({ datos_formulario: datos }).eq("id", proyectoId);

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
      <p className="text-sm font-medium mb-3" style={{ color: "var(--text-secondary)" }}>
        Formulario de ingreso de proyecto
      </p>

      <div className="flex flex-col gap-3 mb-3">
        <div>
          <label className="text-sm block mb-1" style={{ color: "var(--text-secondary)" }}>
            Código proyecto
          </label>
          <input
            value={codigoProyecto}
            disabled
            className="w-full h-9 px-2 rounded-md border text-base"
            style={{ borderColor: "var(--border-default)", background: "var(--surface-page)", color: "var(--text-secondary)" }}
          />
        </div>
        <div>
          <label className="text-sm block mb-1" style={{ color: "var(--text-secondary)" }}>
            Nombre agricultor
          </label>
          <input
            value={nombreAgricultor}
            disabled
            className="w-full h-9 px-2 rounded-md border text-base"
            style={{ borderColor: "var(--border-default)", background: "var(--surface-page)", color: "var(--text-secondary)" }}
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 mb-4">
        {CAMPOS_FORMULARIO_INGRESO.map((campo) => (
          <div key={campo.key}>
            <label className="text-sm block mb-1" style={{ color: "var(--text-secondary)" }}>
              {campo.label}
              {campo.obligatorio && <span style={{ color: "var(--status-overdue-text)" }}> *</span>}
            </label>

            {campo.tipo === "select" ? (
              <select
                value={datos[campo.key]}
                onChange={(e) => actualizarCampo(campo.key, e.target.value)}
                className="w-full h-9 px-2 rounded-md border text-base"
                style={{ borderColor: "var(--border-default)" }}
              >
                <option value="">Seleccionar...</option>
                {campo.opciones.map((op) => (
                  <option key={op} value={op}>
                    {op}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type={campo.tipo === "numero" ? "number" : "text"}
                value={datos[campo.key]}
                onChange={(e) => actualizarCampo(campo.key, e.target.value)}
                className="w-full h-9 px-2 rounded-md border text-base"
                style={{ borderColor: "var(--border-default)" }}
              />
            )}
          </div>
        ))}
      </div>

      {error && (
        <p className="text-sm mb-2" style={{ color: "var(--status-overdue-text)" }}>
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <button
          onClick={guardarBorrador}
          disabled={guardando}
          className="flex-1 h-10 rounded-lg text-base font-medium border"
          style={{ borderColor: "var(--border-default)", color: "var(--text-secondary)" }}
        >
          {guardando ? "Guardando..." : "Guardar borrador"}
        </button>

        <button
          onClick={completarEtapa}
          disabled={faltanCampos.length > 0 || enviando}
          className="flex-1 h-10 rounded-lg text-base font-medium"
          style={{
            background: faltanCampos.length > 0 ? "var(--surface-page)" : "#3B82F6",
            color: faltanCampos.length > 0 ? "var(--text-secondary)" : "#fff",
            border: faltanCampos.length > 0 ? "1px solid var(--border-default)" : "none",
          }}
        >
          {enviando
            ? "Procesando..."
            : faltanCampos.length > 0
            ? `Completar etapa · faltan ${faltanCampos.length} campos`
            : "Completar etapa"}
        </button>
      </div>
    </div>
  );
}
