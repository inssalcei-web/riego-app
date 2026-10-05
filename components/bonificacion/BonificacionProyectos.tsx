"use client";

import { useMemo, useState } from "react";
import {
  PROFESIONALES,
  formatoFecha,
  formatoMoneda,
  formatoPct,
  hoyISO,
  normalizar,
  pctDe,
  type BonifPrograma,
  type BonifProyecto,
  type Profesional,
  type ProyectoApp,
} from "@/lib/bonificacion";
import {
  BotonBorrar,
  CampoFecha,
  CampoNumero,
  ESTILO_BOTON_PRIMARIO,
  ESTILO_INPUT,
  ESTILO_TD,
  ESTILO_TH,
  Tarjeta,
} from "./CamposBonificacion";

export function BonificacionProyectos({
  programas,
  proyectos,
  proyectosApp,
  onAgregar,
  onEditar,
  onBorrar,
  soloLectura = false,
  visibles = PROFESIONALES,
}: {
  soloLectura?: boolean;
  visibles?: readonly Profesional[];
  programas: BonifPrograma[];
  proyectos: BonifProyecto[];
  proyectosApp: ProyectoApp[];
  onAgregar: (datos: Omit<BonifProyecto, "id">) => Promise<boolean>;
  onEditar: (id: string, parche: Partial<BonifProyecto>) => void;
  onBorrar: (id: string) => void;
}) {
  const [filtro, setFiltro] = useState("");
  const [proyectoId, setProyectoId] = useState("");
  const [programaId, setProgramaId] = useState("");
  const [fecha, setFecha] = useState(hoyISO());
  const [monto, setMonto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  const yaRegistrados = useMemo(
    () => new Set(proyectos.map((p) => p.proyecto_id).filter(Boolean) as string[]),
    [proyectos]
  );

  const disponibles = useMemo(() => {
    const q = normalizar(filtro);
    return proyectosApp
      .filter((p) => !yaRegistrados.has(p.id))
      .filter(
        (p) =>
          !q ||
          normalizar(p.codigo_proyecto).includes(q) ||
          normalizar(p.nombre_agricultor).includes(q)
      );
  }, [proyectosApp, yaRegistrados, filtro]);

  const proyectoElegido = proyectosApp.find((p) => p.id === proyectoId) ?? null;

  function elegirProyecto(id: string) {
    setProyectoId(id);
    const p = proyectosApp.find((x) => x.id === id);
    setMonto(p?.monto_total ? String(p.monto_total) : "");
    setAviso(null);
  }

  async function registrar(e: React.FormEvent) {
    e.preventDefault();
    setAviso(null);
    const programa = programas.find((p) => p.id === programaId);
    const montoNum = Number(monto);
    if (!proyectoElegido || !programa) return;
    if (!Number.isFinite(montoNum) || montoNum <= 0) {
      setAviso("Ingresa un monto total válido.");
      return;
    }
    setEnviando(true);
    const ok = await onAgregar({
      proyecto_id: proyectoElegido.id,
      codigo_proyecto: proyectoElegido.codigo_proyecto,
      programa: programa.nombre,
      agricultor: proyectoElegido.nombre_agricultor,
      fecha_adjudicacion: fecha,
      monto_total: montoNum,
      // Se congelan los porcentajes vigentes hoy.
      pct_oliver: programa.pct_oliver,
      pct_valentina: programa.pct_valentina,
      pct_elizabeth: programa.pct_elizabeth,
    });
    setEnviando(false);
    if (ok) {
      setProyectoId("");
      setMonto("");
      setFiltro("");
    }
  }

  const puedeRegistrar = !!proyectoElegido && !!programaId && !!fecha && !enviando;

  const totales = {
    monto: proyectos.reduce((s, p) => s + p.monto_total, 0),
    oliver: proyectos.reduce((s, p) => s + p.monto_total * p.pct_oliver, 0),
    valentina: proyectos.reduce((s, p) => s + p.monto_total * p.pct_valentina, 0),
    elizabeth: proyectos.reduce((s, p) => s + p.monto_total * p.pct_elizabeth, 0),
  };

  const ordenados = [...proyectos].sort((a, b) =>
    b.fecha_adjudicacion.localeCompare(a.fecha_adjudicacion)
  );

  return (
    <div>
      {!soloLectura && (
      <Tarjeta titulo="Registrar proyecto adjudicado">
        <form onSubmit={registrar} className="flex flex-col gap-3">
          <div>
            <label className="text-sm block mb-1" style={{ color: "var(--text-secondary)" }}>
              Proyecto de la app
            </label>
            <input
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              placeholder="Filtrar por código o agricultor…"
              className="w-full h-9 px-2 mb-2 rounded-md border text-base"
              style={ESTILO_INPUT}
            />
            <select
              value={proyectoId}
              onChange={(e) => elegirProyecto(e.target.value)}
              className="w-full h-9 px-2 rounded-md border text-base"
              style={ESTILO_INPUT}
            >
              <option value="">
                {disponibles.length
                  ? `Selecciona un proyecto (${disponibles.length})`
                  : "No hay proyectos disponibles"}
              </option>
              {disponibles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.codigo_proyecto} — {p.nombre_agricultor}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[12rem]">
              <label className="text-sm block mb-1" style={{ color: "var(--text-secondary)" }}>
                Programa
              </label>
              <select
                value={programaId}
                onChange={(e) => setProgramaId(e.target.value)}
                className="w-full h-9 px-2 rounded-md border text-base"
                style={ESTILO_INPUT}
              >
                <option value="">Selecciona un programa</option>
                {programas.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm block mb-1" style={{ color: "var(--text-secondary)" }}>
                Fecha adjudicación
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
                Monto total del proyecto
              </label>
              <input
                type="number"
                min={0}
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                className="h-9 px-2 w-40 rounded-md border text-base"
                style={ESTILO_INPUT}
              />
            </div>
          </div>

          {proyectoElegido && !proyectoElegido.monto_total && (
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Este proyecto no tiene “Monto total proyecto” cargado en la app; ingrésalo a mano.
            </p>
          )}
          {aviso && (
            <p className="text-sm" style={{ color: "var(--status-overdue-text)" }}>
              {aviso}
            </p>
          )}

          <div>
            <button
              type="submit"
              disabled={!puedeRegistrar}
              className="h-9 px-4 rounded-md text-base font-medium text-white"
              style={{ ...ESTILO_BOTON_PRIMARIO, opacity: puedeRegistrar ? 1 : 0.5 }}
            >
              {enviando ? "Registrando..." : "Registrar proyecto"}
            </button>
          </div>
        </form>
      </Tarjeta>
      )}

      <Tarjeta titulo={`Proyectos registrados (${proyectos.length})`}>
        {proyectos.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Aún no hay proyectos registrados.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-base">
              <thead>
                <tr>
                  {["Código", "Agricultor", "Programa", "Adjudicación", "Monto total"].map((t) => (
                    <th key={t} className="text-left font-normal py-2 px-2 text-sm" style={ESTILO_TH}>
                      {t}
                    </th>
                  ))}
                  {visibles.map((p) => (
                    <th key={p.clave} className="text-right font-normal py-2 px-2 text-sm" style={ESTILO_TH}>
                      {visibles.length === 1 ? "Mi bono" : p.nombre}
                    </th>
                  ))}
                  {!soloLectura && <th style={ESTILO_TH}></th>}
                </tr>
              </thead>
              <tbody>
                {ordenados.map((p) => (
                  <tr key={p.id}>
                    <td className="py-2 px-2 whitespace-nowrap" style={ESTILO_TD}>
                      {p.codigo_proyecto ?? "—"}
                    </td>
                    <td className="py-2 px-2" style={ESTILO_TD}>
                      {p.agricultor}
                    </td>
                    <td className="py-2 px-2" style={ESTILO_TD}>
                      {p.programa}
                    </td>
                    <td className="py-2 px-2 whitespace-nowrap" style={ESTILO_TD}>
                      {soloLectura ? (
                        formatoFecha(p.fecha_adjudicacion)
                      ) : (
                        <CampoFecha
                          valor={p.fecha_adjudicacion}
                          onGuardar={(f) => onEditar(p.id, { fecha_adjudicacion: f })}
                          className="w-36"
                        />
                      )}
                    </td>
                    <td className="py-2 px-2 whitespace-nowrap" style={ESTILO_TD}>
                      {soloLectura ? (
                        formatoMoneda(p.monto_total)
                      ) : (
                        <CampoNumero
                          valor={p.monto_total}
                          onGuardar={(n) => onEditar(p.id, { monto_total: n })}
                          className="w-32"
                        />
                      )}
                    </td>
                    {visibles.map((prof) => {
                      const pct = pctDe(p, prof.clave);
                      return (
                        <td key={prof.clave} className="py-2 px-2 text-right whitespace-nowrap" style={ESTILO_TD}>
                          {pct > 0 ? (
                            <>
                              <span className="block">{formatoMoneda(p.monto_total * pct)}</span>
                              <span className="block text-sm" style={{ color: "var(--text-secondary)" }}>
                                {formatoPct(pct)}
                              </span>
                            </>
                          ) : (
                            "—"
                          )}
                        </td>
                      );
                    })}
                    {!soloLectura && (
                      <td className="py-2 px-2" style={ESTILO_TD}>
                        <BotonBorrar onConfirmar={() => onBorrar(p.id)} />
                      </td>
                    )}
                  </tr>
                ))}
                <tr className="font-medium">
                  <td className="py-2 px-2" colSpan={4}>
                    TOTALES
                  </td>
                  <td className="py-2 px-2">{formatoMoneda(totales.monto)}</td>
                  {visibles.map((v) => (
                    <td key={v.clave} className="py-2 px-2 text-right">
                      {formatoMoneda(totales[v.clave])}
                    </td>
                  ))}
                  {!soloLectura && <td></td>}
                </tr>
              </tbody>
            </table>
          </div>
        )}
        <p className="text-sm mt-2" style={{ color: "var(--text-secondary)" }}>
          {soloLectura
            ? "El porcentaje de cada proyecto queda fijo al momento de registrarlo."
            : "Los porcentajes de cada proyecto quedan fijos al registrarlo: si después cambias la tabla de Porcentajes, estos bonos no se alteran."}
        </p>
      </Tarjeta>
    </div>
  );
}
