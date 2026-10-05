"use client";

import {
  PROFESIONALES,
  formatoFecha,
  formatoMoneda,
  formatoPct,
  pctDe,
  type BonifProyecto,
  type Profesional,
} from "@/lib/bonificacion";
import { BotonBorrar, ESTILO_TD, ESTILO_TH, Tarjeta } from "./CamposBonificacion";

// Los proyectos NO se registran a mano: se cargan solos cuando se
// aprueba la etapa 17 (Revisión de resultados). El bono se calcula
// sobre el Monto de formulación. Gerente general y administrador
// pueden eliminar un registro (por ejemplo ante un error); nadie
// puede crearlo ni modificarlo manualmente.
export function BonificacionProyectos({
  proyectos,
  onBorrar,
  soloLectura = false,
  visibles = PROFESIONALES,
}: {
  proyectos: BonifProyecto[];
  onBorrar: (id: string) => void;
  soloLectura?: boolean;
  visibles?: readonly Profesional[];
}) {
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
      <Tarjeta titulo={`Proyectos con bonificación (${proyectos.length})`}>
        <p className="text-sm mb-3" style={{ color: "var(--text-secondary)" }}>
          Los proyectos se cargan solos cuando se aprueba la etapa 17 “Revisión de resultados”. El
          bono se calcula sobre el <strong>Monto de formulación</strong> del proyecto, con los
          porcentajes del programa elegido en la etapa 15 (quedan fijos al momento de cargarse).
        </p>

        {proyectos.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Aún no hay proyectos con bonificación.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-base">
              <thead>
                <tr>
                  {["Código", "Agricultor", "Programa", "Adjudicación", "Monto formulación"].map((t) => (
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
                      {formatoFecha(p.fecha_adjudicacion)}
                    </td>
                    <td className="py-2 px-2 whitespace-nowrap" style={ESTILO_TD}>
                      {formatoMoneda(p.monto_total)}
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
      </Tarjeta>
    </div>
  );
}
