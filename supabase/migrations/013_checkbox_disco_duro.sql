-- ============================================================
-- Agrega un segundo checkbox ("¿Se cargaron los documentos a
-- disco duro virtual?") a las 19 etapas elegibles, sin afectar
-- etapas ya completadas de proyectos existentes.
-- ============================================================

-- 1. Agregar el nuevo ítem de checklist a las 19 etapas elegibles
--    (todas menos 1, 3, 5, 14, 20, 21, 22, 24, 25, 26, 30)
insert into checklist_items_definicion (etapa_id, descripcion, obligatorio, orden)
select id, '¿Se cargaron los documentos a disco duro virtual?', true, 2
from etapas_definicion
where orden in (2, 4, 6, 7, 8, 9, 10, 11, 12, 13, 15, 16, 17, 18, 19, 23, 27, 28, 29);

-- 2. Para los proyectos que YA EXISTEN y están activos, crear la
--    fila de seguimiento de este nuevo checkbox solo en su etapa
--    ACTUAL o en las etapas FUTURAS — nunca en las que ya pasaron.
insert into checklist_instancia (proyecto_id, item_definicion_id, completado)
select p.id, cid.id, false
from proyectos p
join checklist_items_definicion cid on cid.descripcion = '¿Se cargaron los documentos a disco duro virtual?'
join etapas_definicion e_item on e_item.id = cid.etapa_id
join etapas_definicion e_actual on e_actual.id = p.etapa_actual_id
where p.finalizado = false
  and e_item.orden >= e_actual.orden
  and not exists (
    select 1 from checklist_instancia ci
    where ci.proyecto_id = p.id and ci.item_definicion_id = cid.id
  );

-- Verificación: debe devolver 19
select count(*) from checklist_items_definicion where descripcion = '¿Se cargaron los documentos a disco duro virtual?';
