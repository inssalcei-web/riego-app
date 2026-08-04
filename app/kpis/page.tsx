import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  obtenerProyectosActivos,
  obtenerProyectosTerminados,
  obtenerProyectosArchivados,
  obtenerUsuarioActual,
  obtenerFasesOrdenadas,
  obtenerCargaPorPersona,
} from "@/lib/data/proyectos";
import { NavBar } from "@/components/NavBar";
import { GraficoDona } from "@/components/GraficoDona";
import { GraficoBarrasHorizontal } from "@/components/GraficoBarrasHorizontal";

export const dynamic = "force-dynamic";

const COLORES_FASE = ["#06B6D4", "#3B82F6", "#F97316", "#22C55E"];

function formatoMoneda(valor: number) {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(valor);
}

function aNumero(valor: unknown): number | null {
  if (valor === null || valor === undefined) return null;
  const limpio = String(valor).replace(/[^\d.-]/g, "");
  const n = parseFloat(limpio);
  return isNaN(n) ? null : n;
}

function Tarjeta({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg p-3" style={{ background: "var(--surface-card)", boxShadow: "var(--shadow-card)" }}>
      {children}
    </div>
  );
}

function TituloSeccion({ children }: { children: React.ReactNode }) {
  return <p className="text-base font-semibold mb-3 pb-1 border-b" style={{ borderColor: "var(--border-default)" }}>{children}</p>;
}

export default async function KpisPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const usuario = await obtenerUsuarioActual(supabase);
  if (!usuario || !["gerente_general", "administrador"].includes(usuario.rol_id)) {
    redirect("/proyectos");
  }

  const [
    proyectosActivos,
    proyectosTerminados,
    proyectosArchivados,
    fases,
    cargaPorPersona,
    { data: todosProyectos },
    { data: duracionesEtapa },
    { data: duracionProyectos },
    { data: documentosSolicitados },
  ] = await Promise.all([
    obtenerProyectosActivos(supabase),
    obtenerProyectosTerminados(supabase),
    obtenerProyectosArchivados(supabase),
    obtenerFasesOrdenadas(supabase),
    obtenerCargaPorPersona(supabase),
    supabase.from("proyectos").select("*"),
    // Arreglo del Problema 1: se lee de la tabla dedicada
    // duraciones_etapa (registrada en el momento real de cada
    // movimiento), en vez de inferir el tiempo revisando el
    // historial después. Se excluyen los "retroceso" para que un
    // proyecto devuelto no infle el promedio de tiempo normal.
    supabase
      .from("duraciones_etapa")
      .select("etapa_id, usuario_id, duracion_horas, etapas_definicion(nombre, orden), usuarios(nombre)")
      .eq("tipo_movimiento", "avance"),
    supabase.from("v_kpi_duracion_proyectos").select("*"),
    supabase.from("proyecto_documentos_legales").select("documento_id, documentos_legales_catalogo(nombre)"),
  ]);

  // ---------- 1, 3: tiempo promedio por etapa + cuello de botella ----------
  const porEtapa = new Map<string, { nombre: string; orden: number; total: number; n: number }>();
  (duracionesEtapa ?? []).forEach((d: any) => {
    const nombre = d.etapas_definicion?.nombre ?? "—";
    const orden = d.etapas_definicion?.orden ?? 0;
    const actual = porEtapa.get(nombre) ?? { nombre, orden, total: 0, n: 0 };
    actual.total += d.duracion_horas;
    actual.n += 1;
    porEtapa.set(nombre, actual);
  });
  const promediosPorEtapa = Array.from(porEtapa.values())
    .map((e) => ({ ...e, promedio: e.total / e.n }))
    .sort((a, b) => a.orden - b.orden);
  const etapaMasLenta = [...promediosPorEtapa].sort((a, b) => b.promedio - a.promedio)[0];
  const top6Etapas = [...promediosPorEtapa].sort((a, b) => a.promedio - b.promedio).slice(-6);

  // ---------- 2: tiempo promedio total de proyecto ----------
  const proyectosCompletadosOk = (duracionProyectos ?? []).filter((p: any) => !p.motivo_cierre);
  const promedioDiasProyecto =
    proyectosCompletadosOk.length > 0
      ? proyectosCompletadosOk.reduce((acc: number, p: any) => acc + p.duracion_dias, 0) / proyectosCompletadosOk.length
      : null;

  // ---------- 4: tiempo promedio de respuesta por persona ----------
  const porPersona = new Map<string, { total: number; n: number }>();
  (duracionesEtapa ?? []).forEach((d: any) => {
    const nombre = d.usuarios?.nombre ?? "Sin asignar";
    const actual = porPersona.get(nombre) ?? { total: 0, n: 0 };
    actual.total += d.duracion_horas;
    actual.n += 1;
    porPersona.set(nombre, actual);
  });
  const promedioPorPersona = Array.from(porPersona.entries())
    .map(([nombre, v]) => ({ nombre, promedio: v.total / v.n, n: v.n }))
    .sort((a, b) => b.promedio - a.promedio);

  // ---------- 5: proyectos completados por semestre ----------
  const porSemestre = new Map<string, number>();
  proyectosCompletadosOk.forEach((p: any) => {
    const fecha = new Date(p.fecha_cierre);
    const clave = `${fecha.getFullYear()}-S${fecha.getMonth() < 6 ? 1 : 2}`;
    porSemestre.set(clave, (porSemestre.get(clave) ?? 0) + 1);
  });
  const completadosPorSemestre = Array.from(porSemestre.entries()).sort();

  // ---------- 8, 9, 10: datos del formulario de ingreso ----------
  const conFormulario = (todosProyectos ?? []).filter((p: any) => {
    const tipo = p.datos_formulario?.tipo_proyecto;
    return Array.isArray(tipo) ? tipo.length > 0 : !!tipo;
  });

  function agruparPor(campo: string) {
    const grupos = new Map<string, { cantidad: number; monto: number }>();
    conFormulario.forEach((p: any) => {
      const clave = p.datos_formulario?.[campo] ?? "Sin dato";
      const monto = aNumero(p.datos_formulario?.monto_total_proyecto) ?? 0;
      const actual = grupos.get(clave) ?? { cantidad: 0, monto: 0 };
      actual.cantidad += 1;
      actual.monto += monto;
      grupos.set(clave, actual);
    });
    return Array.from(grupos.entries()).map(([clave, v]) => ({ clave, ...v }));
  }

  function agruparPorTipoMultiple() {
    const grupos = new Map<string, number>();
    conFormulario.forEach((p: any) => {
      const tipos: string[] = Array.isArray(p.datos_formulario?.tipo_proyecto)
        ? p.datos_formulario.tipo_proyecto
        : [p.datos_formulario?.tipo_proyecto].filter(Boolean);
      tipos.forEach((tipo) => {
        grupos.set(tipo, (grupos.get(tipo) ?? 0) + 1);
      });
    });
    return Array.from(grupos.entries()).map(([clave, cantidad]) => ({ clave, cantidad }));
  }

  const porTipo = agruparPorTipoMultiple();
  const porFinanciamiento = agruparPor("fuente_financiamiento");
  const montoTotalGestionado = conFormulario.reduce((acc: number, p: any) => acc + (aNumero(p.datos_formulario?.monto_total_proyecto) ?? 0), 0);

  const montoPorSemestre = new Map<string, number>();
  conFormulario.forEach((p: any) => {
    const fecha = new Date(p.creado_en);
    const clave = `${fecha.getFullYear()}-S${fecha.getMonth() < 6 ? 1 : 2}`;
    const monto = aNumero(p.datos_formulario?.monto_total_proyecto) ?? 0;
    montoPorSemestre.set(clave, (montoPorSemestre.get(clave) ?? 0) + monto);
  });

  // ---------- 12: documentos legales más solicitados ----------
  const porDocumento = new Map<string, number>();
  (documentosSolicitados ?? []).forEach((d: any) => {
    const nombre = d.documentos_legales_catalogo?.nombre ?? "Desconocido";
    porDocumento.set(nombre, (porDocumento.get(nombre) ?? 0) + 1);
  });
  const documentosOrdenados = Array.from(porDocumento.entries())
    .map(([nombre, veces]) => ({ nombre, veces }))
    .sort((a, b) => b.veces - a.veces)
    .slice(0, 10);

  const total = proyectosActivos.length;
  const cargaOrdenada = Array.from(cargaPorPersona.entries()).sort((a, b) => a[1] - b[1]);

  return (
    <div className="min-h-screen">
      <NavBar />
      <main className="p-5 max-w-3xl mx-auto space-y-8">
        {/* Proyectos por fase — tarjetas + gráfico de dona */}
        <section>
          <TituloSeccion>Proyectos por fase</TituloSeccion>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mb-4">
            {fases.map((fase: any) => {
              const cantidad = proyectosActivos.filter((p) => p.fase_id === fase.id).length;
              return (
                <Tarjeta key={fase.id}>
                  <p className="text-sm mb-1" style={{ color: "var(--text-secondary)" }}>{fase.nombre}</p>
                  <p className="text-xl font-medium">{cantidad}</p>
                </Tarjeta>
              );
            })}
            <Tarjeta>
              <p className="text-sm mb-1" style={{ color: "var(--status-on-track-text)" }}>✓ Terminados</p>
              <p className="text-xl font-medium" style={{ color: "var(--status-on-track-text)" }}>{proyectosTerminados.length}</p>
            </Tarjeta>
            <Tarjeta>
              <p className="text-sm mb-1" style={{ color: "var(--text-secondary)" }}>📥 Archivados</p>
              <p className="text-xl font-medium">{proyectosArchivados.length}</p>
            </Tarjeta>
          </div>

          {total > 0 && (
            <Tarjeta>
              <GraficoDona
                labels={fases.map((f: any) => f.nombre)}
                valores={fases.map((f: any) => proyectosActivos.filter((p) => p.fase_id === f.id).length)}
                colores={COLORES_FASE}
              />
            </Tarjeta>
          )}
          <p className="text-sm mt-2" style={{ color: "var(--text-secondary)" }}>
            Total de proyectos activos: {total}
          </p>
        </section>

        {/* Tiempos */}
        <section>
          <TituloSeccion>Tiempos</TituloSeccion>

          <div className="grid grid-cols-2 gap-2.5 mb-4">
            <Tarjeta>
              <p className="text-sm mb-1" style={{ color: "var(--text-secondary)" }}>2 · Duración promedio de un proyecto</p>
              <p className="text-lg font-medium">{promedioDiasProyecto ? `${promedioDiasProyecto.toFixed(1)} días` : "Sin datos"}</p>
            </Tarjeta>
            <Tarjeta>
              <p className="text-sm mb-1" style={{ color: "var(--text-secondary)" }}>3 · Etapa más lenta</p>
              <p className="text-lg font-medium">{etapaMasLenta ? etapaMasLenta.nombre : "Sin datos"}</p>
              {etapaMasLenta && <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{etapaMasLenta.promedio.toFixed(1)} h promedio</p>}
            </Tarjeta>
          </div>

          <p className="text-sm mb-1.5" style={{ color: "var(--text-secondary)" }}>
            1 · Tiempo promedio por etapa (horas) — cuellos de botella
          </p>
          <Tarjeta>
            {top6Etapas.length === 0 ? (
              <p className="text-sm italic" style={{ color: "var(--text-secondary)" }}>
                Todavía no hay etapas completadas con el nuevo registro de tiempos.
              </p>
            ) : (
              <GraficoBarrasHorizontal
                labels={top6Etapas.map((e) => e.nombre)}
                valores={top6Etapas.map((e) => Math.round(e.promedio * 10) / 10)}
                color="#F97316"
                sufijo=" h"
              />
            )}
          </Tarjeta>
          <p className="text-sm mt-1.5" style={{ color: "var(--text-secondary)" }}>
            Se muestran las 6 etapas más lentas en promedio, de mayor a menor. Este cálculo solo
            considera avances reales — si un proyecto fue devuelto a una etapa anterior, ese tramo
            no cuenta acá, para no inflar el promedio.
          </p>

          <p className="text-sm mb-1.5 mt-4" style={{ color: "var(--text-secondary)" }}>4 · Tiempo promedio de respuesta por persona</p>
          <Tarjeta>
            {promedioPorPersona.length === 0 && <p className="text-sm italic" style={{ color: "var(--text-secondary)" }}>Sin datos todavía.</p>}
            {promedioPorPersona.map((p) => (
              <div key={p.nombre} className="flex justify-between text-sm py-1">
                <span>{p.nombre}</span>
                <span style={{ color: "var(--text-secondary)" }}>{p.promedio.toFixed(1)} h promedio ({p.n} etapas)</span>
              </div>
            ))}
          </Tarjeta>
        </section>

        {/* Volumen */}
        <section>
          <TituloSeccion>Volumen y avance</TituloSeccion>

          <p className="text-sm mb-1.5" style={{ color: "var(--text-secondary)" }}>5 · Proyectos completados por semestre</p>
          <Tarjeta>
            {completadosPorSemestre.length === 0 && <p className="text-sm italic" style={{ color: "var(--text-secondary)" }}>Todavía ningún proyecto se completó.</p>}
            {completadosPorSemestre.map(([semestre, cantidad]) => (
              <div key={semestre} className="flex justify-between text-sm py-1">
                <span>{semestre}</span>
                <span style={{ color: "var(--text-secondary)" }}>{cantidad} proyecto(s)</span>
              </div>
            ))}
          </Tarjeta>

          <p className="text-sm mb-1.5 mt-4" style={{ color: "var(--text-secondary)" }}>7 · Carga actual por persona</p>
          <Tarjeta>
            {cargaOrdenada.length === 0 ? (
              <p className="text-sm italic" style={{ color: "var(--text-secondary)" }}>Sin datos todavía.</p>
            ) : (
              <GraficoBarrasHorizontal
                labels={cargaOrdenada.map(([nombre]) => nombre)}
                valores={cargaOrdenada.map(([, n]) => n)}
                color="#3B82F6"
                sufijo=" proyecto(s)"
              />
            )}
          </Tarjeta>
          <p className="text-sm mt-1.5" style={{ color: "var(--text-secondary)" }}>
            Cuenta a cada persona por separado, incluyendo su participación en etapas de varios
            responsables (9, 15, 16) — no agrupa por el texto combinado que se ve en la tarjeta.
          </p>
        </section>

        {/* Formulario de ingreso */}
        <section>
          <TituloSeccion>Datos del formulario de ingreso</TituloSeccion>

          <Tarjeta>
            <p className="text-sm mb-1" style={{ color: "var(--text-secondary)" }}>10 · Monto total gestionado</p>
            <p className="text-lg font-medium mb-1">{formatoMoneda(montoTotalGestionado)}</p>
            <p className="text-sm mb-2" style={{ color: "var(--text-secondary)" }}>
              Solo cuenta proyectos que ya llegaron a la etapa 15 (Postulación) y tienen sus montos
              cargados — un proyecto en una etapa anterior todavía no aporta a este total.
            </p>
            {Array.from(montoPorSemestre.entries()).sort().map(([semestre, monto]) => (
              <div key={semestre} className="flex justify-between text-sm py-0.5">
                <span style={{ color: "var(--text-secondary)" }}>{semestre}</span>
                <span>{formatoMoneda(monto)}</span>
              </div>
            ))}
          </Tarjeta>

          <p className="text-sm mb-1.5 mt-4" style={{ color: "var(--text-secondary)" }}>8 · Proyectos por tipo</p>
          <Tarjeta>
            {porTipo.length === 0 && <p className="text-sm italic" style={{ color: "var(--text-secondary)" }}>Sin datos todavía.</p>}
            {porTipo.map((g) => (
              <div key={g.clave} className="flex justify-between text-sm py-1">
                <span>{g.clave}</span>
                <span style={{ color: "var(--text-secondary)" }}>{g.cantidad} proyecto(s)</span>
              </div>
            ))}
          </Tarjeta>

          <p className="text-sm mb-1.5 mt-4" style={{ color: "var(--text-secondary)" }}>9 · Proyectos por fuente de financiamiento</p>
          <Tarjeta>
            {porFinanciamiento.length === 0 && <p className="text-sm italic" style={{ color: "var(--text-secondary)" }}>Sin datos todavía.</p>}
            {porFinanciamiento.map((g) => (
              <div key={g.clave} className="flex justify-between text-sm py-1">
                <span>{g.clave}</span>
                <span style={{ color: "var(--text-secondary)" }}>{g.cantidad} · {formatoMoneda(g.monto)}</span>
              </div>
            ))}
          </Tarjeta>
        </section>

        {/* Documentos legales */}
        <section>
          <TituloSeccion>Documentos legales</TituloSeccion>
          <p className="text-sm mb-1.5" style={{ color: "var(--text-secondary)" }}>12 · Documentos más solicitados</p>
          <Tarjeta>
            {documentosOrdenados.length === 0 && <p className="text-sm italic" style={{ color: "var(--text-secondary)" }}>Sin datos todavía.</p>}
            {documentosOrdenados.map((d) => (
              <div key={d.nombre} className="flex justify-between text-sm py-1">
                <span>{d.nombre}</span>
                <span style={{ color: "var(--text-secondary)" }}>{d.veces} proyecto(s)</span>
              </div>
            ))}
          </Tarjeta>
        </section>
      </main>
    </div>
  );
}
