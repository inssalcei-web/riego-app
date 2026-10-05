"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CAMPOS_MONTOS_POSTULACION } from "@/lib/montos-postulacion-config";

export function MontosPostulacionPanel({
  proyectoId,
  esAdministrador,
  datosIniciales,
  programas = [],
}: {
  proyectoId: string;
  esAdministrador: boolean;
  datosIniciales: Record<string, any>;
  // Nombres de los programas de bonificación (tabla de Porcentajes).
  programas?: string[];
}) {
  const supabase = createClient();
  const router = useRouter();

  const [programa, setPrograma] = useState<string>(String(datosIniciales?.programa_bonificacion ?? ""));
  // Si el programa guardado ya no está en la lista (se borró o
  // renombró), se sigue mostrando para no perder el dato.
  const opcionesPrograma =
    programa && !programas.includes(programa) ? [programa, ...programas] : programas;

  const [montos, setMontos] = useState<Record<string, string>>(
    Object.fromEntries(
      CAMPOS_MONTOS_POSTULACION.map((c) => [c.key, String(datosIniciales?.[c.key] ?? "")])
    )
  );
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);

  async function guardar() {
    setGuardando(true);
    setGuardado(false);
    await supabase
      .from("proyectos")
      .update({ datos_formulario: { ...datosIniciales, ...montos, programa_bonificacion: programa } })
      .eq("id", proyectoId);
    setGuardando(false);
    setGuardado(true);
    // Refresca la pantalla para que el botón "Completar etapa" se
    // desbloquee apenas el programa quede guardado.
    router.refresh();
  }

  return (
    <div
      className="mb-4 p-3 rounded-lg border"
      style={{ borderColor: "var(--border-default)", background: "var(--surface-page)" }}
    >
      <p className="text-sm font-medium mb-1">Montos de postulación</p>
      <p className="text-sm mb-3" style={{ color: "var(--text-secondary)" }}>
        {esAdministrador
          ? "Estos montos son necesarios para poder completar esta etapa."
          : "Estos montos los completa el Administrador. No puedes editarlos."}
      </p>

      <div className="flex flex-col gap-3 mb-3">
        {CAMPOS_MONTOS_POSTULACION.map((campo) => (
          <div key={campo.key}>
            <label className="text-sm block mb-1" style={{ color: "var(--text-secondary)" }}>
              {campo.label} <span style={{ color: "var(--status-overdue-text)" }}>*</span>
            </label>
            <input
              type="number"
              disabled={!esAdministrador}
              value={montos[campo.key]}
              onChange={(e) => setMontos((prev) => ({ ...prev, [campo.key]: e.target.value }))}
              className="w-full h-9 px-2 rounded-md border text-base"
              style={{
                borderColor: "var(--border-default)",
                background: esAdministrador ? "var(--surface-card)" : "var(--border-default)",
                opacity: esAdministrador ? 1 : 0.7,
              }}
            />
          </div>
        ))}
      </div>

      <div className="mb-3">
        <label className="text-sm block mb-1" style={{ color: "var(--text-secondary)" }}>
          Programa de bonificación <span style={{ color: "var(--status-overdue-text)" }}>*</span>
        </label>
        <select
          disabled={!esAdministrador}
          value={programa}
          onChange={(e) => setPrograma(e.target.value)}
          className="w-full h-9 px-2 rounded-md border text-base"
          style={{
            borderColor: "var(--border-default)",
            background: esAdministrador ? "var(--surface-card)" : "var(--border-default)",
            opacity: esAdministrador ? 1 : 0.7,
          }}
        >
          <option value="">Selecciona un programa</option>
          {opcionesPrograma.map((nombre) => (
            <option key={nombre} value={nombre}>
              {nombre}
            </option>
          ))}
        </select>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          Define los porcentajes de bonificación de los profesionales. El bono se calcula sobre el
          Monto de formulación y se carga solo al aprobar la etapa 17.
        </p>
      </div>

      {esAdministrador && (
        <button
          onClick={guardar}
          disabled={guardando}
          className="w-full h-9 rounded-md text-sm font-medium border"
          style={{ borderColor: "var(--border-default)", color: "var(--text-secondary)" }}
        >
          {guardando ? "Guardando..." : guardado ? "Guardado ✓" : "Guardar montos"}
        </button>
      )}
    </div>
  );
}
