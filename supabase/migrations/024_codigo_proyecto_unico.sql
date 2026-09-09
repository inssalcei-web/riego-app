-- ============================================================
-- Bloquea que se pueda repetir un código de proyecto ya usado por
-- cualquier otro proyecto (activo, finalizado o cerrado
-- anticipadamente) — pasó que se ingresó dos veces el mismo
-- agricultor con el mismo código y el sistema no lo impidió.
--
-- IMPORTANTE: correr primero la consulta de abajo. Si devuelve
-- filas, hay códigos duplicados HOY en la base — hay que
-- corregirlos a mano (renombrar uno de los dos, o fusionar los
-- proyectos) ANTES de crear el índice único, o el CREATE INDEX de
-- más abajo va a fallar.
-- ============================================================

-- Paso 1: revisar duplicados existentes.
select codigo_proyecto, count(*)
from proyectos
where codigo_proyecto is not null
group by upper(codigo_proyecto)
having count(*) > 1;

-- Paso 2: si el paso 1 no devolvió filas, correr esto para crear
-- el bloqueo (no distingue mayúsculas/minúsculas):
create unique index if not exists proyectos_codigo_proyecto_unico
  on proyectos (upper(codigo_proyecto));
