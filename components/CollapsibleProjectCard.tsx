"use client";

import { useState } from "react";
import Link from "next/link";
import { ProyectoConDetalle, MOTIVOS_CIERRE } from "@/lib/types";

export function CollapsibleProjectCard({ proyecto }: { proyecto: ProyectoConDetalle }) {
  const [abierta, setAbierta] = useState(false);

  const cerradoAnticipado = proyecto.finalizado && proyecto.motivo_cierre;

  const colorPunto = cerradoAnticipado
    ? "var(--status-due-soon-fill)"
    : proyecto.finalizado
    ? "var(--status-on-track-fill)"
    : proyecto.estado_cumplimiento === "atrasado"
    ? "var(--status-overdue-fill)"
    : proyecto.estado_cumplimiento === "por_vencer"
    ? "var(--status-due-soon-fill)"
    : "var(--status-on-track-fill)";

  const etiquetaEstado = cerradoAnticipado
    ? `Cerrado anticipado · ${MOTIVOS_CIERRE[proyecto.motivo_cierre!] ?? proyecto.motivo_cierre}`
    : proyecto.finalizado
    ? "Completado"
    : proyecto.estado_cumplimiento === "atrasado"
    ? "Atrasado"
    : proyecto.estado_cumplimiento === "por_vencer"
    ? "Por vencer"
    : "En plazo";

  return (
    <div
      className="project-card rounded-xl border mb-2.5 overflow-hidden"
      style={{ borderColor: "var(--border-default)", background: "var(--surface-card)" }}
    >
      <button
        onClick={() => setAbierta((v) => !v)}
        className="w-full flex items-center gap-2.5 p-3 text-left"
        aria-expanded={abierta}
      >
        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: colorPunto }} />
        <span className="flex-1 min-w-0">
          <span className="font-medium text-base block truncate">
            {proyecto.codigo_proyecto ?? "Sin código"}
          </span>
          <span className="text-sm flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
            <span className="truncate">{proyecto.nombre_agricultor ?? "Agricultor sin definir"}</span>
            {proyecto.fuente_financiamiento && (
              <span className="shrink-0 ml-auto">{proyecto.fuente_financiamiento}</span>
            )}
          </span>
        </span>
        <span
          className="text-secondary shrink-0"
          style={{
            color: "var(--text-secondary)",
            transform: abierta ? "rotate(180deg)" : "none",
            transition: "transform 0.15s",
          }}
        >
          ▾
        </span>
      </button>

      {abierta && (
        <div className="px-3 pb-3 -mt-1">
          <span
            className="inline-block text-sm px-2 py-0.5 rounded-full mb-2"
            style={{ background: "var(--surface-page)", color: "var(--text-secondary)" }}
          >
            {etiquetaEstado}
          </span>

          {!proyecto.finalizado && (
            <>
              <p className="text-sm mb-2" style={{ color: "var(--text-secondary)" }}>
                {proyecto.etapa_nombre}
              </p>
              <div className="h-1.5 rounded-full mb-2 overflow-hidden" style={{ background: "var(--border-default)" }}>
                <div
                  className="h-full"
                  style={{ width: `${proyecto.porcentaje_avance}%`, background: colorPunto }}
                />
              </div>
            </>
          )}

          <p className="text-sm mb-2" style={{ color: "var(--text-secondary)" }}>
            {proyecto.responsable_nombre}
          </p>

          <Link href={`/mis-tareas/${proyecto.id}`} className="text-sm font-medium" style={{ color: "#3B82F6" }}>
            Ver detalle completo →
          </Link>
        </div>
      )}
    </div>
  );
}
