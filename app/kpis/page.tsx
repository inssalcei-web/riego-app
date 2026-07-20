import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { obtenerProyectosActivos, obtenerUsuarioActual, FASES_ORDENADAS } from "@/lib/data/proyectos";
import { NavBar } from "@/components/NavBar";

export const dynamic = "force-dynamic";

function formatoMoneda(valor: number) {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(valor);
}

// Convierte texto libre (puede tener puntos, comas, "$", espacios) a número.
function aNumero(valor: unknown): number | null {
  if (valor === null || valor === undefined) return null;
  const limpio = String(valor).replace(/[^\d.-]/g, "");
  const n = parseFloat(limpio);
  return isNaN(n) ? null : n;
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
    { data: todosProyectos },
    { data: duracionEtapas },
    { data: duracionProyectos },
    { data: documentosSolicitados },
  ] = await Promise.all([
    obtenerProyectosActivos(supabase),
    supabase.from("proyectos").select("*"),
    supabase.from("v_kpi_duracion_etapas").select("*"),
    supabase.from("v_kpi_duracion_proyectos").select("*"),
    supabase.from("proyecto_documentos_legales").select("documento_id, documentos_legales_catalogo(nombre)"),
  ]);

  // ---------- 1, 3: tiempo promedio por etapa + cuello de botella ----------
  const porEtapa = new Map<string, { nombre: string; orden: number; total: number; n: number }>();
  (duracionEtapas ?? []).forEach((d: any) => {
    const actual = porEtapa.get(d.etapa_nombre) ?? { nombre: d.etapa_nombre, orden: d.etapa_orden, total: 0, n: 0 };
    actual.total += d.duracion_horas;
    actual.n += 1;
    porEtapa.set(d.etapa_nombre, actual);
  });
  const promediosPorEtapa = Array.from(porEtapa.values())
    .map((e) => ({ ...e, promedio: e.total / e.n }))
    .sort((a, b) => a.orden - b.orden);
  const etapaMasLenta = [...promediosPorEtapa].sort((a, b) => b.promedio - a.promedio)[0];

  // ---------- 2: tiempo promedio total de proyecto ----------
  const proyectosCompletadosOk = (duracionProyectos ?? []).filter((p: any) => !p.motivo_cierre);
  const promedioDiasProyecto =
    proyectosCompletadosOk.length > 0
      ? proyectosCompletadosOk.reduce((acc: number, p: any) => acc + p.duracion_dias, 0) / proyectosCompletadosOk.length
      : null;

  // ---------- 4: tiempo promedio de respuesta por persona ----------
  const porPersona = new Map<string, { total: number; n: number }>();
  (duracionEtapas ?? []).forEach((d: any) => {
    const nombre = d.usuario_nombre ?? "Sin asignar";
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

  // ---------- 7: carga actual por persona ----------
  const cargaPorPersona = new Map<string, number>();
  proyectosActivos.forEach((p) => {
    cargaPorPersona.set(p.responsable_nombre, (cargaPorPersona.get(p.responsable_nombre) ?? 0) + 1);
  });

  // ---------- 8, 9, 10, 11: datos del formulario de ingreso ----------
  const conFormulario = (todosProyectos ?? []).filter((p: any) => p.datos_formulario?.tipo_proyecto);

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

  const porTipo = agruparPor("tipo_proyecto");
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
  const maxPorFase = Math.max(1, ...FASES_ORDENADAS.map((f) => proyectosActivos.filter((p) => p.fase_id === f.id).length));

  return (
    <div className="min-h-screen">
      <NavBar />
      <main className="p-5 max-w-3xl mx-auto space-y-8">
        {/* Resumen general */}
        <section>
          <div className="mb-4">
            <div className="rounded-lg p-3 inline-block" style={{ background: "var(--surface-card)", boxShadow: "var(--shadow-card)" }}>
              <p className="text-base mb-1" style={{ color: "var(--text-secondary)" }}>Proyectos activos</p>
              <p className="text-xl font-medium">{total}</p>
            </div>
          </div>

          <p className="text-sm font-medium mb-2.5" style={{ color: "var(--text-secondary)" }}>6 · Proyectos por fase</p>
          <div className="flex items-end gap-3 h-24 mb-2">
            {FASES_ORDENADAS.map((fase) => {
              const cantidad = proyectosActivos.filter((p) => p.fase_id === fase.id).length;
              return (
                <div key={fase.id} className="flex flex-col items-center gap-1.5 flex-1">
                  <div className="w-full rounded-t" style={{ height: `${Math.max((cantidad / maxPorFase) * 100, 4)}%`, background: "#3B82F6" }} />
                  <span className="text-sm text-center" style={{ color: "var(--text-secondary)" }}>{fase.nombre.split(" ")[0]}</span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Tiempos */}
        <section>
          <p className="text-base font-medium mb-3">Tiempos</p>

          <div className="grid grid-cols-2 gap-2.5 mb-4">
            <div className="rounded-lg p-3" style={{ background: "var(--surface-card)", boxShadow: "var(--shadow-card)" }}>
              <p className="text-base mb-1" style={{ color: "var(--text-secondary)" }}>2 · Duración promedio de un proyecto</p>
              <p className="text-xl font-medium">{promedioDiasProyecto ? `${promedioDiasProyecto.toFixed(1)} días` : "Sin datos"}</p>
            </div>
            <div className="rounded-lg p-3" style={{ background: "var(--surface-card)", boxShadow: "var(--shadow-card)" }}>
              <p className="text-base mb-1" style={{ color: "var(--text-secondary)" }}>3 · Etapa más lenta</p>
              <p className="text-xl font-medium">{etapaMasLenta ? etapaMasLenta.nombre : "Sin datos"}</p>
              {etapaMasLenta && <p className="text-base" style={{ color: "var(--text-secondary)" }}>{etapaMasLenta.promedio.toFixed(1)} h promedio</p>}
            </div>
          </div>

          <p className="text-sm mb-1.5" style={{ color: "var(--text-secondary)" }}>1 · Tiempo promedio por etapa</p>
          <div className="rounded-lg p-3 mb-4 max-h-60 overflow-y-auto" style={{ background: "var(--surface-card)", boxShadow: "var(--shadow-card)" }}>
            {promediosPorEtapa.length === 0 && <p className="text-sm italic" style={{ color: "var(--text-secondary)" }}>Todavía no hay etapas completadas.</p>}
            {promediosPorEtapa.map((e) => (
              <div key={e.nombre} className="flex justify-between text-sm py-1">
                <span>{e.orden} · {e.nombre}</span>
                <span style={{ color: "var(--text-secondary)" }}>{e.promedio.toFixed(1)} h ({e.n})</span>
              </div>
            ))}
          </div>

          <p className="text-sm mb-1.5" style={{ color: "var(--text-secondary)" }}>4 · Tiempo promedio de respuesta por persona</p>
          <div className="rounded-lg p-3" style={{ background: "var(--surface-card)", boxShadow: "var(--shadow-card)" }}>
            {promedioPorPersona.length === 0 && <p className="text-sm italic" style={{ color: "var(--text-secondary)" }}>Sin datos todavía.</p>}
            {promedioPorPersona.map((p) => (
              <div key={p.nombre} className="flex justify-between text-sm py-1">
                <span>{p.nombre}</span>
                <span style={{ color: "var(--text-secondary)" }}>{p.promedio.toFixed(1)} h promedio ({p.n} etapas)</span>
              </div>
            ))}
          </div>
        </section>

        {/* Volumen */}
        <section>
          <p className="text-base font-medium mb-3">Volumen y avance</p>

          <p className="text-sm mb-1.5" style={{ color: "var(--text-secondary)" }}>5 · Proyectos completados por semestre</p>
          <div className="rounded-lg p-3 mb-4" style={{ background: "var(--surface-card)", boxShadow: "var(--shadow-card)" }}>
            {completadosPorSemestre.length === 0 && <p className="text-sm italic" style={{ color: "var(--text-secondary)" }}>Todavía ningún proyecto se completó.</p>}
            {completadosPorSemestre.map(([semestre, cantidad]) => (
              <div key={semestre} className="flex justify-between text-sm py-1">
                <span>{semestre}</span>
                <span style={{ color: "var(--text-secondary)" }}>{cantidad} proyecto(s)</span>
              </div>
            ))}
          </div>

          <p className="text-sm mb-1.5" style={{ color: "var(--text-secondary)" }}>7 · Carga actual por persona</p>
          <div className="rounded-lg p-3" style={{ background: "var(--surface-card)", boxShadow: "var(--shadow-card)" }}>
            {Array.from(cargaPorPersona.entries()).map(([nombre, n]) => (
              <div key={nombre} className="flex justify-between text-sm py-1">
                <span>{nombre}</span>
                <span style={{ color: "var(--text-secondary)" }}>{n} proyecto(s)</span>
              </div>
            ))}
          </div>
        </section>

        {/* Formulario de ingreso */}
        <section>
          <p className="text-base font-medium mb-3">Datos del formulario de ingreso</p>

          <div className="rounded-lg p-3 mb-4" style={{ background: "var(--surface-card)", boxShadow: "var(--shadow-card)" }}>
            <p className="text-base mb-1" style={{ color: "var(--text-secondary)" }}>10 · Monto total gestionado</p>
            <p className="text-xl font-medium mb-2">{formatoMoneda(montoTotalGestionado)}</p>
            {Array.from(montoPorSemestre.entries()).sort().map(([semestre, monto]) => (
              <div key={semestre} className="flex justify-between text-sm py-0.5">
                <span style={{ color: "var(--text-secondary)" }}>{semestre}</span>
                <span>{formatoMoneda(monto)}</span>
              </div>
            ))}
          </div>

          <p className="text-sm mb-1.5" style={{ color: "var(--text-secondary)" }}>8 · Proyectos por tipo</p>
          <div className="rounded-lg p-3 mb-4" style={{ background: "var(--surface-card)", boxShadow: "var(--shadow-card)" }}>
            {porTipo.length === 0 && <p className="text-sm italic" style={{ color: "var(--text-secondary)" }}>Sin datos todavía.</p>}
            {porTipo.map((g) => (
              <div key={g.clave} className="flex justify-between text-sm py-1">
                <span>{g.clave}</span>
                <span style={{ color: "var(--text-secondary)" }}>{g.cantidad} · {formatoMoneda(g.monto)}</span>
              </div>
            ))}
          </div>

          <p className="text-sm mb-1.5" style={{ color: "var(--text-secondary)" }}>9 · Proyectos por fuente de financiamiento</p>
          <div className="rounded-lg p-3 mb-4" style={{ background: "var(--surface-card)", boxShadow: "var(--shadow-card)" }}>
            {porFinanciamiento.length === 0 && <p className="text-sm italic" style={{ color: "var(--text-secondary)" }}>Sin datos todavía.</p>}
            {porFinanciamiento.map((g) => (
              <div key={g.clave} className="flex justify-between text-sm py-1">
                <span>{g.clave}</span>
                <span style={{ color: "var(--text-secondary)" }}>{g.cantidad} · {formatoMoneda(g.monto)}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Documentos legales */}
        <section>
          <p className="text-base font-medium mb-3">Documentos legales</p>
          <p className="text-sm mb-1.5" style={{ color: "var(--text-secondary)" }}>12 · Documentos más solicitados</p>
          <div className="rounded-lg p-3" style={{ background: "var(--surface-card)", boxShadow: "var(--shadow-card)" }}>
            {documentosOrdenados.length === 0 && <p className="text-sm italic" style={{ color: "var(--text-secondary)" }}>Sin datos todavía.</p>}
            {documentosOrdenados.map((d) => (
              <div key={d.nombre} className="flex justify-between text-sm py-1">
                <span>{d.nombre}</span>
                <span style={{ color: "var(--text-secondary)" }}>{d.veces} proyecto(s)</span>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
