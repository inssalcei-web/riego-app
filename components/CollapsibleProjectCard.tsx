"use client";

import { useState } from "react";
import Link from "next/link";
import { ProyectoConDetalle, MOTIVOS_CIERRE } from "@/lib/types";
import { DetalleProyectoModal } from "@/components/DetalleProyectoModal";

const COLORES_FASE = [
  null,
  { bg: "var(--fase1-bg)", border: "var(--fase1-border)", text: "var(--fase1-text)", track: "var(--fase1-track)", fill: "var(--fase1-fill)" },
  { bg: "var(--fase2-bg)", border: "var(--fase2-border)", text: "var(--fase2-text)", track: "var(--fase2-track)", fill: "var(--fase2-fill)" },
  { bg: "var(--fase3-bg)", border: "var(--fase3-border)", text: "var(--fase3-text)", track: "var(--fase3-track)", fill: "var(--fase3-fill)" },
  { bg: "var(--fase4-bg)", border: "var(--fase4-border)", text: "var(--fase4-text)", track: "var(--fase4-track)", fill: "var(--fase4-fill)" },
];

export function CollapsibleProjectCard({
  proyecto,
  modo = "panel",
  rolUsuario = null,
  usuarioId = null,
}: {
  proyecto: ProyectoConDetalle;
  modo?: "panel" | "mis-tareas";
  rolUsuario?: string | null;
  usuarioId?: string | null;
}) {
  const [abierta, setAbierta] = useState(false);
  const [modalAbierto, setModalAbierto] = useState(false);

  const puedeVerDetalle =
    modo === "mis-tareas" || rolUsuario === "gerente_general" || rolUsuario === "administrador";

  const cerradoAnticipado = proyecto.finalizado && proyecto.motivo_cierre;
  const colores = COLORES_FASE[proyecto.fase_orden] ?? COLORES_FASE[1]!;

  // El color de fondo de la tarjeta representa la FASE del proyecto
  // (dónde va en el camino). El puntito representa el SEMÁFORO por
  // días en la etapa actual — son dos señales independientes.
  const fondoTarjeta = proyecto.finalizado ? "var(--surface-card)" : colores.bg;
  const bordeTarjeta = proyecto.finalizado ? "var(--border-default)" : colores.border;

  const colorSemaforo = proyecto.finalizado
    ? cerradoAnticipado
      ? "var(--status-due-soon-fill)"
      : "var(--status-on-track-fill)"
    : proyecto.color_semaforo === "rojo"
    ? "var(--status-overdue-fill)"
    : proyecto.color_semaforo === "amarillo"
    ? "var(--status-due-soon-fill)"
    : "var(--status-on-track-fill)";

  const etiquetaEstado = cerradoAnticipado
    ? `Cerrado anticipado · ${MOTIVOS_CIERRE[proyecto.motivo_cierre!] ?? proyecto.motivo_cierre}`
    : proyecto.finalizado
    ? "Completado"
    : null;

  return (
    <div
      className="rounded-xl border mb-2.5 overflow-hidden transition-all"
      style={{ borderColor: bordeTarjeta, background: fondoTarjeta, boxShadow: "var(--shadow-card)" }}
    >
      <button
        onClick={() => setAbierta((v) => !v)}
        className="w-full flex items-center gap-2.5 p-3 text-left"
        aria-expanded={abierta}
      >
        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: colorSemaforo }} />
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
          {etiquetaEstado && (
            <span
              className="inline-block text-sm px-2 py-0.5 rounded-full mb-2"
              style={{ background: "var(--surface-page)", color: "var(--text-secondary)" }}
            >
              {etiquetaEstado}
            </span>
          )}

          {!proyecto.finalizado && (
            <>
              <p className="text-sm mb-1" style={{ color: colores.text }}>
                {proyecto.etapa_nombre}
              </p>
              <p className="text-sm mb-2" style={{ color: "var(--text-secondary)" }}>
                {proyecto.dias_en_etapa} día{proyecto.dias_en_etapa === 1 ? "" : "s"} en esta etapa
              </p>
              <div className="h-1.5 rounded-full mb-2 overflow-hidden" style={{ background: colores.track }}>
                <div
                  className="h-full"
                  style={{ width: `${proyecto.porcentaje_avance}%`, background: colores.fill }}
                />
              </div>
            </>
          )}

          <p className="text-sm mb-2" style={{ color: "var(--text-secondary)" }}>
            {proyecto.responsable_nombre}
          </p>

          {puedeVerDetalle && !proyecto.finalizado && modo === "mis-tareas" && (
            <Link href={`/mis-tareas/${proyecto.id}`} className="text-sm font-medium" style={{ color: "#3B82F6" }}>
              Ir a la tarea →
            </Link>
          )}

          {puedeVerDetalle && modo === "panel" && (
            <button
              onClick={() => setModalAbierto(true)}
              className="text-sm font-medium"
              style={{ color: "#3B82F6" }}
            >
              Ver detalle completo →
            </button>
          )}
        </div>
      )}

      {modalAbierto && (
        <DetalleProyectoModal
          proyectoId={proyecto.id}
          codigoProyecto={proyecto.codigo_proyecto ?? "Sin código"}
          etapaOrdenActual={proyecto.etapa_orden}
          finalizado={proyecto.finalizado}
          archivado={proyecto.archivado}
          usuarioId={usuarioId}
          rolUsuario={rolUsuario}
          onClose={() => setModalAbierto(false)}
        />
      )}
    </div>
  );
}
