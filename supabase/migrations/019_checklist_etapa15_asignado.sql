-- Asigna los checklist de la etapa 15 (Postulación) específicamente
-- a Oliver García, para que el Administrador no pueda marcarlos por
-- error — cada quien ve bloqueada la parte que no le corresponde.
update checklist_items_definicion
set usuario_asignado_id = (select usuario_asignado_id from etapas_definicion where orden = 15)
where etapa_id = (select id from etapas_definicion where orden = 15);

-- Verificación: debe devolver filas con el usuario_asignado_id de Oliver
select id, descripcion, usuario_asignado_id from checklist_items_definicion
where etapa_id = (select id from etapas_definicion where orden = 15);
