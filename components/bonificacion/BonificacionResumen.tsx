"use client";

import {
  PROFESIONALES,
  calcularResumen,
  formatoFecha,
  formatoMoneda,
  pagosPorMes,
  type BonifConfig,
  type BonifPago,
  type BonifProyecto,
  type Profesional,
} from "@/lib/bonificacion";
import { CampoFecha, CampoNumero, ESTILO_TD, ESTILO_TH, Tarjeta } from "./CamposBonificacion";

export function BonificacionResumen({
  config,
  proyectos,
  pagos,
  onGuardarConfig,
  soloLectura = false,
  visibles = PROFESIONALES,
}: {
  config: BonifConfig;
  proyectos: BonifProyecto[];
  pagos: BonifPago[];
  onGuardarConfig: (parche: Partial<BonifConfig>) => void;
  soloLectura?: boolean;
  visibles?: readonly Profesional[];
}) {
  const claves = visibles.map((v) => v.clave);
  const resumen = calcularResumen(config, proyectos, pagos).filter((r) => claves.includes(r.clave));
  const cuadro = pagosPorMes(pagos, config.mes_inicio_pagos);

  const total = resumen.reduce(
    (t, r) => ({
      deuda: t.deuda + r.deuda,
      bonos: t.bonos + r.bonos,
      pagos: t.pagos + r.pagos,
      saldo: t.saldo + r.saldo,
    }),
    { deuda: 0, bonos: 0, pagos: 0, saldo: 0 }
  );

  return (
    <div>
      <Tarjeta titulo="Deuda inicial">
        <p className="text-sm mb-3" style={{ color: "var(--text-secondary)" }}>
          Lo que ya se les debía antes de empezar a registrar proyectos en esta pestaña.
        </p>
        <div className="flex flex-wrap gap-4 items-end">
          {visibles.map((p) => (
            <div key={p.clave}>
              <label className="text-sm block mb-1" style={{ color: "var(--text-secondary)" }}>
                {p.nombre}
              </label>
              {soloLectura ? (
                <p className="text-base font-medium">
                  {formatoMoneda(config[`deuda_${p.clave}` as const])}
                </p>
              ) : (
                <CampoNumero
                  valor={config[`deuda_${p.clave}` as const]}
                  onGuardar={(n) => onGuardarConfig({ [`deuda_${p.clave}`]: n })}
                />
              )}
            </div>
          ))}
          <div>
            <label className="text-sm block mb-1" style={{ color: "var(--text-secondary)" }}>
              Fecha de la deuda
            </label>
            {soloLectura ? (
              <p className="text-base">{formatoFecha(config.fecha_deuda) || "—"}</p>
            ) : (
              <CampoFecha
                valor={config.fecha_deuda}
                onGuardar={(f) => onGuardarConfig({ fecha_deuda: f })}
              />
            )}
          </div>
        </div>
      </Tarjeta>

      <Tarjeta titulo="Saldo por profesional">
        <div className="overflow-x-auto">
          <table className="w-full text-base">
            <thead>
              <tr>
                <th className="text-left font-normal py-2 pr-3 text-sm" style={ESTILO_TH}></th>
                {["Deuda inicial", "Bonos generados", "Pagado", "Saldo por pagar"].map((t) => (
                  <th key={t} className="text-right font-normal py-2 px-3 text-sm" style={ESTILO_TH}>
                    {t}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {resumen.map((r) => (
                <tr key={r.clave}>
                  <td className="py-2 pr-3 font-medium" style={ESTILO_TD}>
                    {r.nombre}
                  </td>
                  <td className="py-2 px-3 text-right" style={ESTILO_TD}>
                    {formatoMoneda(r.deuda)}
                  </td>
                  <td className="py-2 px-3 text-right" style={ESTILO_TD}>
                    {formatoMoneda(r.bonos)}
                  </td>
                  <td className="py-2 px-3 text-right" style={ESTILO_TD}>
                    {formatoMoneda(r.pagos)}
                  </td>
                  <td className="py-2 px-3 text-right font-medium" style={ESTILO_TD}>
                    {formatoMoneda(r.saldo)}
                  </td>
                </tr>
              ))}
              {resumen.length > 1 && (
                <tr className="font-medium">
                  <td className="py-2 pr-3">TOTAL</td>
                  <td className="py-2 px-3 text-right">{formatoMoneda(total.deuda)}</td>
                  <td className="py-2 px-3 text-right">{formatoMoneda(total.bonos)}</td>
                  <td className="py-2 px-3 text-right">{formatoMoneda(total.pagos)}</td>
                  <td className="py-2 px-3 text-right">{formatoMoneda(total.saldo)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="text-sm mt-2" style={{ color: "var(--text-secondary)" }}>
          Saldo = deuda inicial + bonos generados − pagado.
        </p>
      </Tarjeta>

      <Tarjeta titulo="Pagos por mes (36 meses)">
        <div className="mb-3">
          <label className="text-sm block mb-1" style={{ color: "var(--text-secondary)" }}>
            Mes de inicio del cuadro
          </label>
          {soloLectura ? (
            <p className="text-base">{formatoFecha(config.mes_inicio_pagos) || "—"}</p>
          ) : (
            <CampoFecha
              valor={config.mes_inicio_pagos}
              onGuardar={(f) => onGuardarConfig({ mes_inicio_pagos: f })}
            />
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-base">
            <thead>
              <tr>
                <th className="text-left font-normal py-2 pr-3 text-sm" style={ESTILO_TH}>
                  Mes
                </th>
                {visibles.map((p) => (
                  <th key={p.clave} className="text-right font-normal py-2 px-3 text-sm" style={ESTILO_TH}>
                    {p.nombre}
                  </th>
                ))}
                {visibles.length > 1 && (
                  <th className="text-right font-normal py-2 px-3 text-sm" style={ESTILO_TH}>
                    Total
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {cuadro.filas.map((f) => (
                <tr key={f.clave}>
                  <td className="py-1.5 pr-3" style={ESTILO_TD}>
                    {f.etiqueta}
                  </td>
                  {visibles.map((p) => (
                    <td key={p.clave} className="py-1.5 px-3 text-right" style={ESTILO_TD}>
                      {f.montos[p.clave] ? formatoMoneda(f.montos[p.clave]) : "—"}
                    </td>
                  ))}
                  {visibles.length > 1 && (
                    <td className="py-1.5 px-3 text-right" style={ESTILO_TD}>
                      {f.total ? formatoMoneda(f.total) : "—"}
                    </td>
                  )}
                </tr>
              ))}
              <tr className="font-medium">
                <td className="py-2 pr-3">TOTAL</td>
                {visibles.map((p) => (
                  <td key={p.clave} className="py-2 px-3 text-right">
                    {formatoMoneda(cuadro.totales[p.clave])}
                  </td>
                ))}
                {visibles.length > 1 && (
                  <td className="py-2 px-3 text-right">{formatoMoneda(cuadro.total)}</td>
                )}
              </tr>
              {cuadro.totalFuera > 0 && (
                <tr style={{ color: "var(--status-overdue-text)" }}>
                  <td className="py-2 pr-3">Pagos no incluidos en el cuadro</td>
                  {visibles.map((p) => (
                    <td key={p.clave} className="py-2 px-3 text-right">
                      {formatoMoneda(cuadro.fuera[p.clave])}
                    </td>
                  ))}
                  {visibles.length > 1 && (
                    <td className="py-2 px-3 text-right">{formatoMoneda(cuadro.totalFuera)}</td>
                  )}
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {cuadro.totalFuera > 0 && (
          <p className="text-sm mt-2" style={{ color: "var(--text-secondary)" }}>
            Hay pagos con fecha anterior al mes de inicio o posterior a los 36 meses; igual se
            descuentan del saldo.
          </p>
        )}
      </Tarjeta>
    </div>
  );
}
