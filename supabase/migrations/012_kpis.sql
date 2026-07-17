-- ============================================================
-- Bloque KPIs: vistas de base de datos que calculan los tiempos
-- reales entre etapas, para que la pantalla de KPIs no tenga que
-- hacer ese cálculo complejo cada vez.
-- ============================================================

-- Duración de cada etapa completada: el tiempo transcurrido entre
-- que la etapa anterior se completó (o el proyecto se creó, si es
-- la etapa 1) y el momento en que ESTA etapa se completó.
create or replace view v_kpi_duracion_etapas as
select
  a.id as auditoria_id,
  a.proyecto_id,
  a.etapa_id,
  e.nombre as etapa_nombre,
  e.orden as etapa_orden,
  a.usuario_id,
  u.nombre as usuario_nombre,
  a.fecha,
  extract(epoch from (
    a.fecha - coalesce(
      lag(a.fecha) over (partition by a.proyecto_id order by a.fecha),
      p.creado_en
    )
  )) / 3600.0 as duracion_horas
from auditoria a
join etapas_definicion e on e.id = a.etapa_id
join proyectos p on p.id = a.proyecto_id
left join usuarios u on u.id = a.usuario_id
where a.accion = 'completar_etapa';

-- Duración total de cada proyecto ya finalizado (desde que se creó
-- hasta el último movimiento registrado).
create or replace view v_kpi_duracion_proyectos as
select
  p.id as proyecto_id,
  p.codigo_proyecto,
  p.motivo_cierre,
  p.creado_en,
  max(a.fecha) as fecha_cierre,
  extract(epoch from (max(a.fecha) - p.creado_en)) / 86400.0 as duracion_dias
from proyectos p
join auditoria a on a.proyecto_id = p.id
where p.finalizado = true
group by p.id, p.codigo_proyecto, p.motivo_cierre, p.creado_en;

grant select on v_kpi_duracion_etapas to authenticated;
grant select on v_kpi_duracion_proyectos to authenticated;

-- Verificación
select count(*) from v_kpi_duracion_etapas;
select count(*) from v_kpi_duracion_proyectos;
