import Link from "next/link";
import { ProyectoConDetalle, MOTIVOS_CIERRE } from "@/lib/types";

const ESTADO_ESTILO: Record<string, { bg: string; text: string; label: string }> = {
  en_plazo: { bg: "var(--status-on-track-bg)", text: "var(--status-on-track-text)", label: "En plazo" },
  por_vencer: { bg: "var(--status-due-soon-bg)", text: "var(--status-due-soon-text)", label: "Por vencer" },
  atrasado: { bg: "var(--status-overdue-bg)", text: "var(--status-overdue-text)", label: "Atrasado" },
};

export function ProjectCard({ proyecto }: { proyecto: ProyectoConDetalle }) {
  const cerradoAnticipado = proyecto.finalizado && proyecto.motivo_cierre;
  const estilo = cerradoAnticipado
    ? { bg: "var(--status-due-soon-bg)", text: "var(--status-due-soon-text)", label: "Cerrado anticipado" }
    : proyecto.finalizado
    ? { bg: "var(--status-on-track-bg)", text: "var(--status-on-track-text)", label: "Completado" }
    : ESTADO_ESTILO[proyecto.estado_cumplimiento];

  const colorBarra =
    proyecto.estado_cumplimiento === "atrasado"
      ? "var(--status-overdue-fill)"
      : proyecto.estado_cumplimiento === "por_vencer"
      ? "var(--status-due-soon-fill)"
      : "var(--status-on-track-fill)";

  return (
    <Link
      href={`/mis-tareas/${proyecto.id}`}
      className="project-card block rounded-xl border p-3 mb-2.5 transition-all duration-150 hover:-translate-y-0.5"
      style={{
        borderColor: "var(--border-default)",
        background: "var(--surface-card)",
      }}
    >
      <span
        className="inline-block text-[10px] px-2 py-0.5 rounded-full mb-2"
        style={{ background: estilo.bg, color: estilo.text }}
      >
        {estilo.label}
        {cerradoAnticipado && proyecto.motivo_cierre
          ? ` · ${MOTIVOS_CIERRE[proyecto.motivo_cierre] ?? proyecto.motivo_cierre}`
          : ""}
      </span>

      <p className="font-medium text-[13px] leading-tight mb-0.5">
        {proyecto.codigo_proyecto ?? "Sin código"}
      </p>
      <p className="text-[11px] mb-0.5" style={{ color: "var(--text-secondary)" }}>
        {proyecto.nombre_agricultor ?? "Agricultor sin definir"}
      </p>
      <p className="text-[11px] mb-2" style={{ color: "var(--text-secondary)" }}>
        {proyecto.fuente_financiamiento ?? "Financiamiento: pendiente"}
      </p>

      {!proyecto.finalizado && (
        <>
          <p className="text-[11px] mb-2" style={{ color: "var(--text-secondary)" }}>
            {proyecto.etapa_nombre}
          </p>
          <div className="h-1.5 rounded-full mb-1.5 overflow-hidden" style={{ background: "var(--border-default)" }}>
            <div
              className="h-full"
              style={{ width: `${proyecto.porcentaje_avance}%`, background: colorBarra }}
            />
          </div>
        </>
      )}

      <div className="flex justify-between text-[10px]" style={{ color: "var(--text-secondary)" }}>
        <span>{proyecto.responsable_nombre}</span>
      </div>
    </Link>
  );
}
