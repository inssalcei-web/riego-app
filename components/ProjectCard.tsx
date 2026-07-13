import Link from "next/link";
import { ProyectoConDetalle } from "@/lib/types";

const ESTADO_ESTILO: Record<string, { bg: string; text: string; label: string }> = {
  en_plazo: { bg: "var(--status-on-track-bg)", text: "var(--status-on-track-text)", label: "En plazo" },
  por_vencer: { bg: "var(--status-due-soon-bg)", text: "var(--status-due-soon-text)", label: "Por vencer" },
  atrasado: { bg: "var(--status-overdue-bg)", text: "var(--status-overdue-text)", label: "Atrasado" },
};

export function ProjectCard({ proyecto }: { proyecto: ProyectoConDetalle }) {
  const estilo = ESTADO_ESTILO[proyecto.estado_cumplimiento];
  const colorBarra =
    proyecto.estado_cumplimiento === "atrasado"
      ? "var(--status-overdue-fill)"
      : proyecto.estado_cumplimiento === "por_vencer"
      ? "var(--status-due-soon-fill)"
      : "var(--status-on-track-fill)";

  return (
    <Link
      href={`/mis-tareas/${proyecto.id}`}
      className="block rounded-xl border p-3 mb-2.5 hover:opacity-90 transition"
      style={{ borderColor: "var(--border-default)", background: "var(--surface-card)" }}
    >
      <span
        className="inline-block text-[10px] px-2 py-0.5 rounded-full mb-2"
        style={{ background: estilo.bg, color: estilo.text }}
      >
        {estilo.label}
      </span>
      <p className="font-medium text-[13px] leading-tight mb-0.5">{proyecto.nombre}</p>
      <p className="text-[11px] mb-2" style={{ color: "var(--text-secondary)" }}>
        {proyecto.etapa_nombre}
      </p>
      <div className="h-1.5 rounded-full mb-1.5 overflow-hidden" style={{ background: "var(--border-default)" }}>
        <div
          className="h-full"
          style={{ width: `${proyecto.porcentaje_avance}%`, background: colorBarra }}
        />
      </div>
      <div className="flex justify-between text-[10px]" style={{ color: "var(--text-secondary)" }}>
        <span>{proyecto.cliente_nombre}</span>
        <span>{proyecto.responsable_nombre}</span>
      </div>
    </Link>
  );
}
