-- ============================================================
-- Corrige el indicador "Duración promedio de un proyecto" en KPIs,
-- que mostraba "Sin datos" a pesar de haber proyectos terminados.
--
-- Causa: la vista v_kpi_duracion_proyectos (migración 012) usaba un
-- JOIN estricto contra la tabla auditoria para encontrar la fecha
-- de cierre de cada proyecto. Si un proyecto finalizado no tenía
-- NINGUNA fila en auditoria (por ejemplo, proyectos completados
-- antes de que ese registro quedara bien afinado, o cargados por
-- otra vía), el JOIN lo descartaba por completo — no aparecía ni
-- con "0 días", simplemente desaparecía del promedio.
--
-- Corrección: se cruzan las tres tablas de historial que tiene el
-- sistema (auditoria, duraciones_etapa, timeline_eventos) con LEFT
-- JOIN, y se toma la fecha más reciente entre las que sí tengan
-- datos para ese proyecto. Un proyecto solo queda fuera del
-- promedio si de verdad no hay ningún rastro suyo en ninguna de las
-- tres tablas.
-- ============================================================

create or replace view v_kpi_duracion_proyectos as
select
  p.id as proyecto_id,
  p.codigo_proyecto,
  p.motivo_cierre,
  p.creado_en,
  greatest(
    coalesce(max(a.fecha), p.creado_en),
    coalesce(max(d.fecha_fin), p.creado_en),
    coalesce(max(t.ocurrido_en), p.creado_en)
  ) as fecha_cierre,
  extract(epoch from (
    greatest(
      coalesce(max(a.fecha), p.creado_en),
      coalesce(max(d.fecha_fin), p.creado_en),
      coalesce(max(t.ocurrido_en), p.creado_en)
    ) - p.creado_en
  )) / 86400.0 as duracion_dias
from proyectos p
left join auditoria a on a.proyecto_id = p.id
left join duraciones_etapa d on d.proyecto_id = p.id
left join timeline_eventos t on t.proyecto_id = p.id
where p.finalizado = true
group by p.id, p.codigo_proyecto, p.motivo_cierre, p.creado_en
having count(a.id) > 0 or count(d.id) > 0 or count(t.id) > 0;

grant select on v_kpi_duracion_proyectos to authenticated;

-- Verificación: compara cuántos proyectos finalizados hay en total
-- contra cuántos quedan con una duración calculada. Si el segundo
-- número es menor que el primero, los que faltan son proyectos sin
-- ningún rastro de historial en ninguna de las tres tablas (un caso
-- legítimo de "de verdad no sabemos cuándo terminó").
select
  (select count(*) from proyectos where finalizado = true) as proyectos_finalizados,
  (select count(*) from v_kpi_duracion_proyectos) as con_duracion_calculada;
