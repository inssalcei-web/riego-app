-- ============================================================
-- Corrige el bug de "Mis tareas": a algunos proyectos les faltaba
-- la fila en checklist_instancia para ciertos ítems (típicamente
-- ítems agregados en una migración posterior a la creación del
-- proyecto, ej. 014/016/019). Cuando faltaba esa fila, el checkbox
-- se veía marcado en pantalla pero no se guardaba nada en la base
-- de datos (Supabase no devuelve error al hacer update sobre un id
-- que no existe), así que el proyecto seguía apareciendo en
-- "Mis tareas" aunque la persona ya hubiera marcado su parte.
-- ============================================================

-- 1. Backfill: crea las filas que falten para proyectos ya existentes.
insert into checklist_instancia (proyecto_id, item_definicion_id, completado)
select p.id, cid.id, false
from proyectos p
cross join checklist_items_definicion cid
where not exists (
  select 1 from checklist_instancia ci
  where ci.proyecto_id = p.id and ci.item_definicion_id = cid.id
);

-- 2. Política de INSERT que faltaba: permite que la app cree la
-- fila si no existe (autoreparación, ver código de ChecklistPanel y
-- ChecklistPanelServerWrapper), pero solo con completado = false —
-- completarla de verdad sigue exigiendo pasar por la política de
-- UPDATE ya existente, que respeta a quién está asignado el ítem.
drop policy if exists "usuarios autenticados pueden crear checklist instancia faltante" on checklist_instancia;
create policy "usuarios autenticados pueden crear checklist instancia faltante"
  on checklist_instancia for insert
  with check (auth.role() = 'authenticated' and completado = false);

-- Verificación: debería devolver 0.
select count(*) from proyectos p, checklist_items_definicion cid
where not exists (
  select 1 from checklist_instancia ci
  where ci.proyecto_id = p.id and ci.item_definicion_id = cid.id
);
