"use client";

import { useState } from "react";
import { PROFESIONALES, type BonifPrograma } from "@/lib/bonificacion";
import {
  BotonBorrar,
  CampoPorcentaje,
  CampoTexto,
  ESTILO_BOTON_PRIMARIO,
  ESTILO_INPUT,
  ESTILO_TD,
  ESTILO_TH,
  Tarjeta,
} from "./CamposBonificacion";

export function BonificacionPorcentajes({
  programas,
  onAgregar,
  onEditar,
  onBorrar,
}: {
  programas: BonifPrograma[];
  onAgregar: (datos: Omit<BonifPrograma, "id" | "orden">) => Promise<boolean>;
  onEditar: (id: string, parche: Partial<BonifPrograma>) => void;
  onBorrar: (id: string) => void;
}) {
  const [nombre, setNombre] = useState("");
  const [pcts, setPcts] = useState({ oliver: "", valentina: "", elizabeth: "" });
  const [enviando, setEnviando] = useState(false);

  const aFraccion = (t: string) => {
    const n = Number(t.replace(",", "."));
    return Number.isFinite(n) && n >= 0 && n <= 100 ? Math.round(n * 100) / 10000 : null;
  };

  async function agregar(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) return;
    const o = pcts.oliver === "" ? 0 : aFraccion(pcts.oliver);
    const v = pcts.valentina === "" ? 0 : aFraccion(pcts.valentina);
    const el = pcts.elizabeth === "" ? 0 : aFraccion(pcts.elizabeth);
    if (o === null || v === null || el === null) return;
    setEnviando(true);
    const ok = await onAgregar({
      nombre: nombre.trim(),
      pct_oliver: o,
      pct_valentina: v,
      pct_elizabeth: el,
    });
    setEnviando(false);
    if (ok) {
      setNombre("");
      setPcts({ oliver: "", valentina: "", elizabeth: "" });
    }
  }

  return (
    <div>
      <Tarjeta titulo="Porcentajes de bono por programa">
        <p className="text-sm mb-3" style={{ color: "var(--text-secondary)" }}>
          Cada porcentaje se aplica sobre el monto total del proyecto. Los cambios que hagas aquí
          solo afectan a los proyectos que registres después: los ya registrados conservan los
          porcentajes con que se ingresaron.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-base">
            <thead>
              <tr>
                <th className="text-left font-normal py-2 px-2 text-sm" style={ESTILO_TH}>
                  Programa
                </th>
                {PROFESIONALES.map((p) => (
                  <th key={p.clave} className="text-left font-normal py-2 px-2 text-sm" style={ESTILO_TH}>
                    {p.nombre}
                  </th>
                ))}
                <th style={ESTILO_TH}></th>
              </tr>
            </thead>
            <tbody>
              {programas.map((pr) => (
                <tr key={pr.id}>
                  <td className="py-2 px-2" style={ESTILO_TD}>
                    <CampoTexto
                      valor={pr.nombre}
                      onGuardar={(t) => t.trim() && onEditar(pr.id, { nombre: t.trim() })}
                      className="w-64"
                    />
                  </td>
                  {PROFESIONALES.map((p) => (
                    <td key={p.clave} className="py-2 px-2" style={ESTILO_TD}>
                      <CampoPorcentaje
                        valor={pr[`pct_${p.clave}` as const]}
                        onGuardar={(f) => onEditar(pr.id, { [`pct_${p.clave}`]: f })}
                      />
                    </td>
                  ))}
                  <td className="py-2 px-2" style={ESTILO_TD}>
                    <BotonBorrar onConfirmar={() => onBorrar(pr.id)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Tarjeta>

      <Tarjeta titulo="Agregar programa">
        <form onSubmit={agregar} className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[12rem]">
            <label className="text-sm block mb-1" style={{ color: "var(--text-secondary)" }}>
              Nombre del programa
            </label>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full h-9 px-2 rounded-md border text-base"
              style={ESTILO_INPUT}
            />
          </div>
          {PROFESIONALES.map((p) => (
            <div key={p.clave}>
              <label className="text-sm block mb-1" style={{ color: "var(--text-secondary)" }}>
                {p.nombre} (%)
              </label>
              <input
                inputMode="decimal"
                value={pcts[p.clave]}
                onChange={(e) => setPcts((prev) => ({ ...prev, [p.clave]: e.target.value }))}
                placeholder="0"
                className="h-9 px-2 w-20 rounded-md border text-base"
                style={ESTILO_INPUT}
              />
            </div>
          ))}
          <button
            type="submit"
            disabled={!nombre.trim() || enviando}
            className="h-9 px-4 rounded-md text-base font-medium text-white"
            style={{ ...ESTILO_BOTON_PRIMARIO, opacity: nombre.trim() && !enviando ? 1 : 0.5 }}
          >
            Agregar
          </button>
        </form>
      </Tarjeta>
    </div>
  );
}
