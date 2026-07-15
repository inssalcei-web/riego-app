-- ============================================================
-- Soluciona el checkbox que se desmarca solo: faltaban las filas
-- de checklist_instancia para los proyectos ya creados, y no
-- existía ningún mecanismo para crearlas automáticamente en
-- proyectos futuros. Se arreglan las dos cosas acá.
-- ============================================================

-- 1. Reparar los proyectos que ya existen: crea la fila de checklist
--    (una por cada ítem de checklist de cada una de las 30 etapas)
--    para cualquier proyecto que todavía no la tenga.
insert into checklist_instancia (proyecto_id, item_definicion_id, completado)
select p.id, cid.id, false
from proyectos p
cross join checklist_items_definicion cid
where not exists (
  select 1 from checklist_instancia ci
  where ci.proyecto_id = p.id and ci.item_definicion_id = cid.id
);

-- 2. Automatizar esto para cualquier proyecto que se cree de ahora
--    en adelante, sin depender de que alguien se acuerde de hacerlo.
create or replace function crear_checklist_instancia_para_proyecto()
returns trigger as $$
begin
  insert into checklist_instancia (proyecto_id, item_definicion_id, completado)
  select new.id, id, false from checklist_items_definicion;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trigger_crear_checklist_instancia on proyectos;
create trigger trigger_crear_checklist_instancia
  after insert on proyectos
  for each row
  execute function crear_checklist_instancia_para_proyecto();
