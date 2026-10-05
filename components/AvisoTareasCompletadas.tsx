"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// Se activa cuando, justo antes de venir a esta pantalla, se
// completó una etapa desde alguno de los paneles de acción (ver
// complete-stage-client.ts). Si además ya no queda ninguna tarea
// pendiente, muestra el aviso especial de "todo completado".
export function AvisoTareasCompletadas({ quedanTareas }: { quedanTareas: boolean }) {
  const [mostrar, setMostrar] = useState<"nada" | "etapa" | "todo">("nada");
  // Resultado de la carga automática de bonificación (etapa 17).
  const [bonificacion, setBonificacion] = useState<"nada" | "cargada" | "no_cargada">("nada");

  useEffect(() => {
    const bonif = sessionStorage.getItem("riego-app-bonificacion");
    if (!bonif) return;
    sessionStorage.removeItem("riego-app-bonificacion");
    setBonificacion(bonif === "cargada" ? "cargada" : "no_cargada");
    const timeout = setTimeout(() => setBonificacion("nada"), 12000);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    const marca = sessionStorage.getItem("riego-app-etapa-completada");
    if (!marca) return;
    sessionStorage.removeItem("riego-app-etapa-completada");

    setMostrar(quedanTareas ? "etapa" : "todo");
    const timeout = setTimeout(() => setMostrar("nada"), 6000);
    return () => clearTimeout(timeout);
  }, [quedanTareas]);

  const avisoBonificacion =
    bonificacion === "nada" ? null : (
      <div
        role="status"
        aria-live="polite"
        className="mb-4 p-3 rounded-lg border flex items-center justify-between gap-3"
        style={
          bonificacion === "cargada"
            ? { borderColor: "var(--status-on-track-fill)", background: "var(--status-on-track-bg)" }
            : { borderColor: "var(--status-overdue-text)", background: "var(--surface-card)" }
        }
      >
        <p
          className="text-sm font-medium"
          style={{
            color: bonificacion === "cargada" ? "var(--status-on-track-text)" : "var(--status-overdue-text)",
          }}
        >
          {bonificacion === "cargada"
            ? "✓ Cargados los montos de bonificación de profesionales."
            : "La etapa se completó, pero NO se cargó la bonificación de profesionales: falta el programa de bonificación o el monto de formulación del proyecto. Avisa al administrador."}
        </p>
        <button
          onClick={() => setBonificacion("nada")}
          aria-label="Cerrar aviso"
          className="text-sm shrink-0"
          style={{
            color: bonificacion === "cargada" ? "var(--status-on-track-text)" : "var(--status-overdue-text)",
          }}
        >
          ✕
        </button>
      </div>
    );

  if (mostrar === "nada") return avisoBonificacion;

  return (
    <>
      {avisoBonificacion}
      <div
      role="status"
      aria-live="polite"
      className="mb-4 p-3 rounded-lg border flex items-center justify-between gap-3"
      style={{ borderColor: "var(--status-on-track-fill)", background: "var(--status-on-track-bg)" }}
    >
      <p className="text-sm font-medium" style={{ color: "var(--status-on-track-text)" }}>
        {mostrar === "todo" ? "✓ Has completado todas tus tareas" : "✓ Etapa completada"}
      </p>
      {mostrar === "todo" && (
        <Link href="/proyectos" className="text-sm font-medium shrink-0" style={{ color: "var(--status-on-track-text)" }}>
          Volver al panel principal
        </Link>
      )}
      <button
        onClick={() => setMostrar("nada")}
        aria-label="Cerrar aviso"
        className="text-sm shrink-0"
        style={{ color: "var(--status-on-track-text)" }}
      >
        ✕
      </button>
    </div>
    </>
  );
}
