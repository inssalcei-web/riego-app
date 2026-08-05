-- ============================================================
-- Corrección retroactiva del semáforo: recalcula "desde cuándo
-- está cada proyecto en su etapa actual" usando el historial real
-- de auditoría (que sí existe desde el primer día), en vez de la
-- fecha que quedó mal puesta al crear la columna.
-- ============================================================

update proyectos p
set etapa_actual_desde = coalesce(
  (select max(a.fecha) from auditoria a where a.proyecto_id = p.id),
  p.creado_en
)
where p.finalizado = false;

-- Verificación: muestra la fecha corregida de cada proyecto activo
select codigo_proyecto, nombre_agricultor, etapa_actual_desde
from proyectos
where finalizado = false
order by etapa_actual_desde;
