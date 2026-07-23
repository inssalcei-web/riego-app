-- ============================================================
-- 1. Nueva estructura de 4 fases (antes 3)
-- 2. Corrección de responsables en las etapas 10, 11, 12, 14, 15
-- ============================================================

-- 1. Renombrar fases existentes y agregar la fase 4
update fases set nombre = 'Formulación' where id = 'fase_2';
update fases set nombre = 'En construcción' where id = 'fase_3';
insert into fases (id, orden, nombre) values ('fase_4', 4, 'Construcción terminada')
on conflict (id) do update set orden = 4, nombre = 'Construcción terminada';

-- 2. Reasignar cada etapa a su nueva fase, según el nuevo rango
update etapas_definicion set fase_id = case
  when orden <= 6 then 'fase_1'
  when orden <= 17 then 'fase_2'
  when orden <= 24 then 'fase_3'
  else 'fase_4'
end;

-- 3. Corrección de responsables

-- Etapa 10: pasa de Valentina a Oliver García
update etapas_definicion
set usuario_asignado_id = (select id from usuarios where nombre = 'Oliver García')
where orden = 10;

-- Etapa 11: pasa de Encargado(a) área legal a Oliver García
update etapas_definicion
set rol_id = 'ingeniero_proyectos',
    usuario_asignado_id = (select id from usuarios where nombre = 'Oliver García')
where orden = 11;

-- Etapa 12: pasa de Oliver García a Gerente general
update etapas_definicion
set rol_id = 'gerente_general',
    usuario_asignado_id = null
where orden = 12;

-- Etapa 14: pasa de Oliver García a Encargado(a) área legal
update etapas_definicion
set rol_id = 'encargado_legal',
    usuario_asignado_id = null
where orden = 14;

-- Etapa 15: pasa de Gerente general a Oliver García
-- (la parte de "montos de postulación" sigue igual, a cargo del Administrador,
-- eso no depende de esta columna)
update etapas_definicion
set rol_id = 'ingeniero_proyectos',
    usuario_asignado_id = (select id from usuarios where nombre = 'Oliver García')
where orden = 15;

-- Verificación
select orden, nombre, fase_id, rol_id, usuario_asignado_id, requiere_montos
from etapas_definicion order by orden;
