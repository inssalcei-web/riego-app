"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface EtapaConResponsable {
  orden: number;
  nombre: string;
  esActual: boolean;
  responsable: string;
}

export function DetalleProyectoModal({
  proyectoId,
  codigoProyecto,
  etapaOrdenActual,
  onClose,
}: {
  proyectoId: string;
  codigoProyecto: string;
  etapaOrdenActual: number;
  onClose: () => void;
}) {
  const supabase = createClient();
  const [etapas, setEtapas] = useState<EtapaConResponsable[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: etapasDefinicion }, { data: usuarios }, { data: itemsMulti }] = await Promise.all([
        supabase
          .from("etapas_definicion")
          .select("*")
          .gte("orden", etapaOrdenActual)
          .order("orden"),
        supabase.from("usuarios").select("id, nombre, rol_id"),
        supabase
          .from("checklist_items_definicion")
          .select("etapa_id, usuario_asignado_id")
          .not("usuario_asignado_id", "is", null),
      ]);

      const usuariosPorId = new Map((usuarios ?? []).map((u: any) => [u.id, u.nombre]));

      const lista: EtapaConResponsable[] = (etapasDefinicion ?? []).map((e: any) => {
        let responsable = "—";

        if (e.multi_responsable) {
          const nombres = (itemsMulti ?? [])
            .filter((i: any) => i.etapa_id === e.id)
            .map((i: any) => usuariosPorId.get(i.usuario_asignado_id))
            .filter(Boolean);
          responsable = nombres.length > 0 ? nombres.join(", ") : "Varios responsables";
        } else if (e.usuario_asignado_id) {
          responsable = usuariosPorId.get(e.usuario_asignado_id) ?? "—";
        } else if (e.rol_id === "administrador") {
          responsable = "Administrador";
        } else {
          const personaDelRol = (usuarios ?? []).find((u: any) => u.rol_id === e.rol_id);
          responsable = personaDelRol?.nombre ?? "—";
        }

        return {
          orden: e.orden,
          nombre: e.nombre,
          esActual: e.orden === etapaOrdenActual,
          responsable,
        };
      });

      setEtapas(lista);
      setCargando(false);
    })();
  }, [etapaOrdenActual]);

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 z-50"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={onClose}
    >
      <div
        className="rounded-xl border max-w-md w-full max-h-[80vh] overflow-y-auto p-4"
        style={{ borderColor: "var(--border-default)", background: "var(--surface-card)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <p className="font-medium text-lg">{codigoProyecto}</p>
          <button onClick={onClose} className="text-lg" style={{ color: "var(--text-secondary)" }}>
            ✕
          </button>
        </div>

        <p className="text-sm mb-3" style={{ color: "var(--text-secondary)" }}>
          Etapa actual y etapas pendientes — solo lectura
        </p>

        {cargando && <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Cargando...</p>}

        <div className="flex flex-col gap-1.5">
          {etapas.map((e) => (
            <div
              key={e.orden}
              className="flex justify-between items-center px-2.5 py-2 rounded-lg text-sm"
              style={{
                background: e.esActual ? "var(--surface-page)" : "transparent",
                fontWeight: e.esActual ? 500 : 400,
              }}
            >
              <span>
                {e.orden} · {e.nombre}
                {e.esActual && (
                  <span className="ml-1.5 text-sm" style={{ color: "#3B82F6" }}>
                    (etapa actual)
                  </span>
                )}
              </span>
              <span style={{ color: "var(--text-secondary)" }}>{e.responsable}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
