"use client";

import { useState } from "react";
import {
  PROFESIONALES,
  formatoMoneda,
  hoyISO,
  type BonifPago,
  type NombreProfesional,
} from "@/lib/bonificacion";
import {
  BotonBorrar,
  CampoFecha,
  CampoNumero,
  CampoTexto,
  ESTILO_BOTON_PRIMARIO,
  ESTILO_INPUT,
  ESTILO_TD,
  ESTILO_TH,
  Tarjeta,
} from "./CamposBonificacion";

export function BonificacionPagos({
  pagos,
  onAgregar,
  onEditar,
  onBorrar,
}: {
  pagos: BonifPago[];
  onAgregar: (datos: Omit<BonifPago, "id">) => Promise<boolean>;
  onEditar: (id: string, parche: Partial<BonifPago>) => void;
  onBorrar: (id: string) => void;
}) {
  const [fecha, setFecha] = useState(hoyISO());
  const [trabajador, setTrabajador] = useState<NombreProfesional | "">("");
  const [monto, setMonto] = useState("");
  const [detalle, setDetalle] = useState("");
  const [enviando, setEnviando] = useState(false);

  const montoNum = Number(monto);
  const puede = !!fecha && !!trabajador && Number.isFinite(montoNum) && montoNum > 0 && !enviando;

  async function registrar(e: React.FormEvent) {
    e.preventDefault();
    if (!puede || !trabajador) return;
    setEnviando(true);
    const ok = await onAgregar({
      fecha,
      trabajador,
      monto: montoNum,
      detalle: detalle.trim() || null,
    });
    setEnviando(false);
    if (ok) {
      setMonto("");
      setDetalle("");
    }
  }

  const ordenados = [...pagos].sort((a, b) => b.fecha.localeCompare(a.fecha));
  const totalPagado = pagos.reduce((s, p) => s + p.monto, 0);

  return (
    <div>
      <Tarjeta titulo="Registrar pago">
        <form onSubmit={registrar} className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-sm block mb-1" style={{ color: "var(--text-secondary)" }}>
              Fecha
            </label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="h-9 px-2 rounded-md border text-base"
              style={ESTILO_INPUT}
            />
          </div>
          <div>
            <label className="text-sm block mb-1" style={{ color: "var(--text-secondary)" }}>
              Trabajador
            </label>
            <select
              value={trabajador}
              onChange={(e) => setTrabajador(e.target.value as NombreProfesional | "")}
              className="h-9 px-2 rounded-md border text-base"
              style={ESTILO_INPUT}
            >
              <option value="">Selecciona</option>
              {PROFESIONALES.map((p) => (
                <option key={p.clave} value={p.nombre}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm block mb-1" style={{ color: "var(--text-secondary)" }}>
              Monto
            </label>
            <input
              type="number"
              min={0}
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              className="h-9 px-2 w-36 rounded-md border text-base"
              style={ESTILO_INPUT}
            />
          </div>
          <div className="flex-1 min-w-[12rem]">
            <label className="text-sm block mb-1" style={{ color: "var(--text-secondary)" }}>
              Detalle (opcional)
            </label>
            <input
              value={detalle}
              onChange={(e) => setDetalle(e.target.value)}
              className="w-full h-9 px-2 rounded-md border text-base"
              style={ESTILO_INPUT}
            />
          </div>
          <button
            type="submit"
            disabled={!puede}
            className="h-9 px-4 rounded-md text-base font-medium text-white"
            style={{ ...ESTILO_BOTON_PRIMARIO, opacity: puede ? 1 : 0.5 }}
          >
            {enviando ? "Registrando..." : "Registrar pago"}
          </button>
        </form>
      </Tarjeta>

      <Tarjeta titulo={`Pagos realizados (${pagos.length})`}>
        {pagos.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Aún no hay pagos registrados.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-base">
              <thead>
                <tr>
                  {["Fecha", "Trabajador", "Monto", "Detalle"].map((t) => (
                    <th key={t} className="text-left font-normal py-2 px-2 text-sm" style={ESTILO_TH}>
                      {t}
                    </th>
                  ))}
                  <th style={ESTILO_TH}></th>
                </tr>
              </thead>
              <tbody>
                {ordenados.map((p) => (
                  <tr key={p.id}>
                    <td className="py-2 px-2" style={ESTILO_TD}>
                      <CampoFecha
                        valor={p.fecha}
                        onGuardar={(f) => onEditar(p.id, { fecha: f })}
                        className="w-36"
                      />
                    </td>
                    <td className="py-2 px-2" style={ESTILO_TD}>
                      <select
                        value={p.trabajador}
                        onChange={(e) =>
                          onEditar(p.id, { trabajador: e.target.value as NombreProfesional })
                        }
                        className="h-9 px-2 rounded-md border text-base"
                        style={ESTILO_INPUT}
                      >
                        {PROFESIONALES.map((x) => (
                          <option key={x.clave} value={x.nombre}>
                            {x.nombre}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 px-2" style={ESTILO_TD}>
                      <CampoNumero
                        valor={p.monto}
                        onGuardar={(n) => onEditar(p.id, { monto: n })}
                        className="w-32"
                      />
                    </td>
                    <td className="py-2 px-2" style={ESTILO_TD}>
                      <CampoTexto
                        valor={p.detalle ?? ""}
                        onGuardar={(t) => onEditar(p.id, { detalle: t.trim() || null })}
                        className="w-56"
                      />
                    </td>
                    <td className="py-2 px-2" style={ESTILO_TD}>
                      <BotonBorrar onConfirmar={() => onBorrar(p.id)} />
                    </td>
                  </tr>
                ))}
                <tr className="font-medium">
                  <td className="py-2 px-2" colSpan={2}>
                    TOTAL PAGADO
                  </td>
                  <td className="py-2 px-2">{formatoMoneda(totalPagado)}</td>
                  <td colSpan={2}></td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </Tarjeta>
    </div>
  );
}
