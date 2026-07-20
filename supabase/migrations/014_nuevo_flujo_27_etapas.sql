-- ============================================================
-- Reemplaza las 30 etapas por las 27 nuevas, preservando el
-- historial de los proyectos que ya están cargados (etapas 1-5
-- se mantienen con el mismo ID, solo se actualiza su texto donde
-- corresponde). Las etapas 6 en adelante se recrean desde cero,
-- porque ningún proyecto activo llegó todavía tan lejos.
-- ============================================================

-- 1. Columnas nuevas necesarias
alter table etapas_definicion add column if not exists multi_responsable boolean default false;
alter table checklist_items_definicion add column if not exists usuario_asignado_id uuid references usuarios(id);

-- 2. Actualizar el texto de las etapas 1-5 que ya existen (mismo ID,
--    no se pierde el historial de los proyectos actuales)
update etapas_definicion set nombre = 'Ingreso formulario de proyectos' where orden = 3;
update etapas_definicion set nombre = 'Solicitud de documentos legales' where orden = 5;

-- 3. Borrar las etapas 6 en adelante del listado viejo (y todo lo
--    que dependía de ellas) — seguro porque ningún proyecto activo
--    pasó de la etapa 5 todavía.
delete from checklist_instancia where item_definicion_id in (
  select id from checklist_items_definicion where etapa_id in (select id from etapas_definicion where orden >= 6)
);
delete from checklist_items_definicion where etapa_id in (select id from etapas_definicion where orden >= 6);
delete from proyecto_responsables where etapa_id in (select id from etapas_definicion where orden >= 6);
delete from etapas_definicion where orden >= 6;

-- 4. Insertar las etapas nuevas 6 a 27
insert into etapas_definicion (orden, nombre, fase_id, rol_id, tipo_accion, multi_responsable) values
(6, 'Levantamiento topográfico', 'fase_1', 'ingeniero_proyectos', 'checkbox', false),
(7, 'Análisis de suelo', 'fase_1', 'ingeniero_proyectos', 'checkbox', false),
(8, 'Prueba de bombeo', 'fase_1', 'gerente_general', 'checkbox', false),
(9, 'Diseño hidráulico, civil y fotovoltaico', 'fase_1', 'ingeniero_proyectos', 'checkbox', true),
(10, 'Generación de planos', 'fase_1', 'ingeniero_proyectos', 'checkbox', false),
(11, 'Presupuesto', 'fase_1', 'encargado_legal', 'checkbox', false),
(12, 'Visto bueno presupuesto', 'fase_1', 'ingeniero_proyectos', 'checkbox', false),
(13, 'Anexos técnicos', 'fase_1', 'ingeniero_proyectos', 'checkbox', false),
(14, 'Anexos legales', 'fase_1', 'ingeniero_proyectos', 'checkbox', false),
(15, 'Postulación', 'fase_1', 'gerente_general', 'checkbox', false),
(16, 'Observaciones legales, civiles e hidráulicas', 'fase_1', 'ingeniero_proyectos', 'checkbox', true),
(17, 'Revisión de resultados', 'fase_1', 'ingeniero_proyectos', 'checkbox', false),
(18, 'Envío de carpetas finales a terreno', 'fase_2', 'ingeniero_proyectos', 'checkbox', false),
(19, 'Gestión de financiamiento', 'fase_2', 'gerente_general', 'checkbox', false),
(20, 'Contrato de obras', 'fase_2', 'administrador', 'checkbox', false),
(21, 'Compra materiales', 'fase_2', 'gerente_general', 'checkbox', false),
(22, 'Contratación de subcontratos', 'fase_2', 'gerente_general', 'checkbox', false),
(23, 'Contacto con inspectores Indap y CNR', 'fase_2', 'gerente_general', 'checkbox', false),
(24, 'Modificaciones de proyecto', 'fase_2', 'ingeniero_proyectos', 'checkbox', false),
(25, 'Facturación y documentos administrativos', 'fase_3', 'administrador', 'checkbox', false),
(26, 'Recepción de dinero', 'fase_3', 'gerente_general', 'checkbox', false),
(27, 'Cierre proyecto', 'fase_3', 'gerente_general', 'checkbox', false);

-- 5. Asignación fija de ingenieros
update etapas_definicion set usuario_asignado_id = (select id from usuarios where nombre = 'Valentina Oyarzún') where orden in (4, 10, 13, 18);
update etapas_definicion set usuario_asignado_id = (select id from usuarios where nombre = 'Oliver García') where orden in (6, 7, 12, 14, 17, 24);

-- 6. Checklist genérico (un ítem) para todas las etapas de un solo responsable
insert into checklist_items_definicion (etapa_id, descripcion, obligatorio, orden)
select id, 'Completar: ' || nombre, true, 1 from etapas_definicion where multi_responsable = false and orden >= 6;

-- 7. Checklist de 3 personas para la etapa 9
insert into checklist_items_definicion (etapa_id, descripcion, obligatorio, orden, usuario_asignado_id)
select e.id, 'Diseño hidráulico — ' || u.nombre, true, 1, u.id
from etapas_definicion e, usuarios u where e.orden = 9 and u.nombre = 'Valentina Oyarzún';
insert into checklist_items_definicion (etapa_id, descripcion, obligatorio, orden, usuario_asignado_id)
select e.id, 'Diseño civil — ' || u.nombre, true, 2, u.id
from etapas_definicion e, usuarios u where e.orden = 9 and u.nombre = 'Oliver García';
insert into checklist_items_definicion (etapa_id, descripcion, obligatorio, orden, usuario_asignado_id)
select e.id, 'Diseño fotovoltaico — ' || u.nombre, true, 3, u.id
from etapas_definicion e, usuarios u where e.orden = 9 and u.nombre = 'Luis Aguirre';

-- 8. Checklist de 3 personas para la etapa 16
insert into checklist_items_definicion (etapa_id, descripcion, obligatorio, orden, usuario_asignado_id)
select e.id, 'Observaciones civiles/hidráulicas — ' || u.nombre, true, 1, u.id
from etapas_definicion e, usuarios u where e.orden = 16 and u.nombre = 'Oliver García';
insert into checklist_items_definicion (etapa_id, descripcion, obligatorio, orden, usuario_asignado_id)
select e.id, 'Observaciones hidráulicas — ' || u.nombre, true, 2, u.id
from etapas_definicion e, usuarios u where e.orden = 16 and u.nombre = 'Valentina Oyarzún';
insert into checklist_items_definicion (etapa_id, descripcion, obligatorio, orden, usuario_asignado_id)
select e.id, 'Observaciones legales — ' || u.nombre, true, 3, u.id
from etapas_definicion e, usuarios u where e.orden = 16 and u.nombre = 'Elizabeth Karstulovic';

-- 9. Segundo checkbox "disco duro virtual" en las 16 etapas elegibles
insert into checklist_items_definicion (etapa_id, descripcion, obligatorio, orden)
select id, '¿Se cargaron los documentos a disco duro virtual?', true, 2
from etapas_definicion
where orden in (2, 4, 6, 7, 8, 10, 11, 12, 13, 14, 15, 19, 23, 24, 25, 26);

-- 10. Backfill: crear el seguimiento de todo esto para los proyectos
--     que ya existen, solo en su etapa actual o en las futuras
insert into checklist_instancia (proyecto_id, item_definicion_id, completado)
select p.id, cid.id, false
from proyectos p
join checklist_items_definicion cid on true
join etapas_definicion e_item on e_item.id = cid.etapa_id
join etapas_definicion e_actual on e_actual.id = p.etapa_actual_id
where p.finalizado = false
  and e_item.orden >= e_actual.orden
  and not exists (
    select 1 from checklist_instancia ci where ci.proyecto_id = p.id and ci.item_definicion_id = cid.id
  );

-- 11. Solo la persona asignada puede marcar su propio checklist
--     (en las etapas de 3 personas); el resto de los checklist
--     siguen abiertos a cualquier autenticado, como hasta ahora.
drop policy if exists "usuarios autenticados pueden marcar checklist" on checklist_instancia;
create policy "usuarios autenticados pueden marcar checklist"
  on checklist_instancia for update
  using (
    auth.role() = 'authenticated' and (
      (select usuario_asignado_id from checklist_items_definicion where id = checklist_instancia.item_definicion_id) is null
      or (select usuario_asignado_id from checklist_items_definicion where id = checklist_instancia.item_definicion_id)
         = (select id from usuarios where auth_user_id = auth.uid())
    )
  );

-- Verificación: debe devolver 27
select count(*) from etapas_definicion;
select orden, nombre, multi_responsable from etapas_definicion order by orden;
