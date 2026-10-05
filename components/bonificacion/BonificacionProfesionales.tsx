"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  aConfig,
  aPago,
  aPrograma,
  aProyecto,
  type BonifConfig,
  type BonifPago,
  type BonifPrograma,
  type BonifProyecto,
  type Profesional,
  type ProyectoApp,
  PROFESIONALES,
} from "@/lib/bonificacion";
import { BonificacionResumen } from "./BonificacionResumen";
import { BonificacionProyectos } from "./BonificacionProyectos";
import { BonificacionPagos } from "./BonificacionPagos";
import { BonificacionPorcentajes } from "./BonificacionPorcentajes";

type Seccion = "resumen" | "proyectos" | "pagos" | "porcentajes";

const SECCIONES: { id: Seccion; label: string }[] = [
  { id: "resumen", label: "Resumen" },
  { id: "proyectos", label: "Proyectos" },
  { id: "pagos", label: "Pagos" },
  { id: "porcentajes", label: "Porcentajes" },
];

export function BonificacionProfesionales({
  usuarioId,
  programasIniciales,
  proyectosIniciales,
  pagosIniciales,
  configInicial,
  proyectosApp,
  soloLectura = false,
  visibles = PROFESIONALES,
}: {
  // soloLectura: vista de un profesional (solo ve lo suyo, sin editar).
  soloLectura?: boolean;
  visibles?: readonly Profesional[];
  usuarioId: string;
  programasIniciales: BonifPrograma[];
  proyectosIniciales: BonifProyecto[];
  pagosIniciales: BonifPago[];
  configInicial: BonifConfig;
  proyectosApp: ProyectoApp[];
}) {
  const supabase = createClient();

  const [seccion, setSeccion] = useState<Seccion>("resumen");
  const [programas, setProgramas] = useState(programasIniciales);
  const [proyectos, setProyectos] = useState(proyectosIniciales);
  const [pagos, setPagos] = useState(pagosIniciales);
  const [config, setConfig] = useState(configInicial);
  const [error, setError] = useState<string | null>(null);

  function fallo(mensaje: string, detalle?: string) {
    setError(detalle ? `${mensaje} (${detalle})` : mensaje);
  }

  // ---------- Configuración (deuda inicial, fechas) ----------
  async function guardarConfig(parche: Partial<BonifConfig>) {
    setError(null);
    const { data, error: e } = await supabase
      .from("bonif_config")
      .update(parche)
      .eq("id", 1)
      .select()
      .maybeSingle();
    if (e || !data) return fallo("No se pudo guardar", e?.message);
    setConfig(aConfig(data));
  }

  // ---------- Proyectos ----------
  async function agregarProyecto(
    datos: Omit<BonifProyecto, "id">
  ): Promise<boolean> {
    setError(null);
    const { data, error: e } = await supabase
      .from("bonif_proyectos")
      .insert({ ...datos, creado_por: usuarioId })
      .select()
      .single();
    if (e || !data) {
      fallo(
        e?.code === "23505"
          ? "Ese proyecto ya está registrado en la bonificación"
          : "No se pudo registrar el proyecto",
        e?.code === "23505" ? undefined : e?.message
      );
      return false;
    }
    setProyectos((prev) => [...prev, aProyecto(data)]);
    return true;
  }

  async function editarProyecto(id: string, parche: Partial<BonifProyecto>) {
    setError(null);
    const { data, error: e } = await supabase
      .from("bonif_proyectos")
      .update(parche)
      .eq("id", id)
      .select()
      .maybeSingle();
    if (e || !data) return fallo("No se pudo guardar el cambio", e?.message);
    setProyectos((prev) => prev.map((p) => (p.id === id ? aProyecto(data) : p)));
  }

  async function borrarProyecto(id: string) {
    setError(null);
    const { error: e } = await supabase.from("bonif_proyectos").delete().eq("id", id);
    if (e) return fallo("No se pudo eliminar", e.message);
    setProyectos((prev) => prev.filter((p) => p.id !== id));
  }

  // ---------- Pagos ----------
  async function agregarPago(datos: Omit<BonifPago, "id">): Promise<boolean> {
    setError(null);
    const { data, error: e } = await supabase
      .from("bonif_pagos")
      .insert({ ...datos, creado_por: usuarioId })
      .select()
      .single();
    if (e || !data) {
      fallo("No se pudo registrar el pago", e?.message);
      return false;
    }
    setPagos((prev) => [...prev, aPago(data)]);
    return true;
  }

  async function editarPago(id: string, parche: Partial<BonifPago>) {
    setError(null);
    const { data, error: e } = await supabase
      .from("bonif_pagos")
      .update(parche)
      .eq("id", id)
      .select()
      .maybeSingle();
    if (e || !data) return fallo("No se pudo guardar el cambio", e?.message);
    setPagos((prev) => prev.map((p) => (p.id === id ? aPago(data) : p)));
  }

  async function borrarPago(id: string) {
    setError(null);
    const { error: e } = await supabase.from("bonif_pagos").delete().eq("id", id);
    if (e) return fallo("No se pudo eliminar", e.message);
    setPagos((prev) => prev.filter((p) => p.id !== id));
  }

  // ---------- Programas / porcentajes ----------
  async function agregarPrograma(
    datos: Omit<BonifPrograma, "id" | "orden">
  ): Promise<boolean> {
    setError(null);
    const orden = programas.reduce((m, p) => Math.max(m, p.orden), 0) + 1;
    const { data, error: e } = await supabase
      .from("bonif_programas")
      .insert({ ...datos, orden })
      .select()
      .single();
    if (e || !data) {
      fallo(
        e?.code === "23505" ? "Ya existe un programa con ese nombre" : "No se pudo agregar el programa",
        e?.code === "23505" ? undefined : e?.message
      );
      return false;
    }
    setProgramas((prev) => [...prev, aPrograma(data)]);
    return true;
  }

  async function editarPrograma(id: string, parche: Partial<BonifPrograma>) {
    setError(null);
    const { data, error: e } = await supabase
      .from("bonif_programas")
      .update(parche)
      .eq("id", id)
      .select()
      .maybeSingle();
    if (e || !data) {
      return fallo(
        e?.code === "23505" ? "Ya existe un programa con ese nombre" : "No se pudo guardar el cambio",
        e?.code === "23505" ? undefined : e?.message
      );
    }
    setProgramas((prev) => prev.map((p) => (p.id === id ? aPrograma(data) : p)));
  }

  async function borrarPrograma(id: string) {
    setError(null);
    const { error: e } = await supabase.from("bonif_programas").delete().eq("id", id);
    if (e) return fallo("No se pudo eliminar", e.message);
    setProgramas((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <div>
      <div className="flex gap-1 mb-4 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        {SECCIONES.map((s) => {
          const activa = seccion === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setSeccion(s.id)}
              className="text-base px-3 py-1.5 rounded-md whitespace-nowrap"
              style={{
                color: activa ? "#3B82F6" : "var(--text-secondary)",
                background: activa ? "var(--surface-card)" : "transparent",
                fontWeight: activa ? 500 : 400,
                boxShadow: activa ? "var(--shadow-card)" : undefined,
              }}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      {error && (
        <div
          className="mb-4 p-3 rounded-lg border text-sm flex items-start justify-between gap-3"
          style={{ borderColor: "var(--status-overdue-text)", color: "var(--status-overdue-text)" }}
        >
          <span>{error}</span>
          <button onClick={() => setError(null)} aria-label="Cerrar">
            ✕
          </button>
        </div>
      )}

      {seccion === "resumen" && (
        <BonificacionResumen
          config={config}
          proyectos={proyectos}
          pagos={pagos}
          onGuardarConfig={guardarConfig}
          soloLectura={soloLectura}
          visibles={visibles}
        />
      )}
      {seccion === "proyectos" && (
        <BonificacionProyectos
          programas={programas}
          proyectos={proyectos}
          proyectosApp={proyectosApp}
          onAgregar={agregarProyecto}
          onEditar={editarProyecto}
          onBorrar={borrarProyecto}
          soloLectura={soloLectura}
          visibles={visibles}
        />
      )}
      {seccion === "pagos" && (
        <BonificacionPagos
          pagos={pagos}
          onAgregar={agregarPago}
          onEditar={editarPago}
          onBorrar={borrarPago}
          soloLectura={soloLectura}
        />
      )}
      {seccion === "porcentajes" && (
        <BonificacionPorcentajes
          programas={programas}
          onAgregar={agregarPrograma}
          onEditar={editarPrograma}
          onBorrar={borrarPrograma}
          soloLectura={soloLectura}
        />
      )}
    </div>
  );
}
