"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { completarEtapa as llamarCompletarEtapa } from "@/lib/complete-stage-client";
import { CAMPOS_FORMULARIO_INGRESO } from "@/lib/formulario-ingreso-config";

type ValorCampo = string | string[];

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
  datosIniciales: Record<string, any>;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [datos, setDatos] = useState<Record<string, ValorCampo>>(
    Object.fromEntries(
      CAMPOS_FORMULARIO_INGRESO.map((c) => {
        const inicial = datosIniciales?.[c.key];
        if (c.tipo === "multiselect") {
          return [c.key, Array.isArray(inicial) ? inicial : []];
        }
        return [c.key, inicial !== undefined && inicial !== null ? String(inicial) : ""];
      })
    )
  );
  const [guardando, setGuardando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function valorVacio(campo: (typeof CAMPOS_FORMULARIO_INGRESO)[number]) {
    const valor = datos[campo.key];
    if (campo.tipo === "multiselect") return !Array.isArray(valor) || valor.length === 0;
    return !String(valor ?? "").trim();
  }

  const faltanCampos = CAMPOS_FORMULARIO_INGRESO.filter((c) => c.obligatorio && valorVacio(c));

  function actualizarCampo(key: string, value: string) {
    setDatos((prev) => ({ ...prev, [key]: value }));
  }

  function alternarOpcionMultiple(key: string, opcion: string) {
    setDatos((prev) => {
      const actual = Array.isArray(prev[key]) ? (prev[key] as string[]) : [];
      const yaEsta = actual.includes(opcion);
      return {
        ...prev,
        [key]: yaEsta ? actual.filter((o) => o !== opcion) : [...actual, opcion],
      };
    });
  }

  async function guardarBorrador() {
    setGuardando(true);
    await supabase.from("proyectos").update({ datos_formulario: datos }).eq("id", proyectoId);
    setGuardando(false);
  }

  async function completarEtapa() {
    setEnviando(true);
    setError(null);

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
                value={datos[campo.key] as string}
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
            ) : campo.tipo === "multiselect" ? (
              <div className="flex flex-col gap-1.5 p-2 rounded-md border" style={{ borderColor: "var(--border-default)" }}>
                {campo.opciones.map((op) => {
                  const seleccionado = Array.isArray(datos[campo.key]) && (datos[campo.key] as string[]).includes(op);
                  return (
                    <label key={op} className="flex items-center gap-2 text-base cursor-pointer">
                      <input
                        type="checkbox"
                        checked={seleccionado}
                        onChange={() => alternarOpcionMultiple(campo.key, op)}
                      />
                      {op}
                    </label>
                  );
                })}
              </div>
            ) : (
              <input
                type={campo.tipo === "numero" ? "number" : "text"}
                value={datos[campo.key] as string}
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
