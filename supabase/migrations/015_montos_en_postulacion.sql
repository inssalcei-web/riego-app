-- ============================================================
-- Mueve el llenado de los montos desde la etapa 3 a la etapa
-- "Postulación" (15), como una acción aparte a cargo del
-- Administrador, sin cambiar dónde ni cómo se guardan los datos
-- (siguen en la misma columna datos_formulario de siempre).
-- ============================================================

-- 1. Marcar qué etapa requiere el llenado de montos
alter table etapas_definicion add column if not exists requiere_montos boolean default false;
update etapas_definicion set requiere_montos = true where orden = 15;

-- 2. Permitir que el Administrador actualice el proyecto (para
--    guardar los montos) en esta etapa puntual, aunque la etapa
--    en sí sea del Gerente general.
drop policy if exists "administrador puede llenar montos en postulacion" on proyectos;
create policy "administrador puede llenar montos en postulacion"
  on proyectos for update
  using (
    (select rol_id from usuarios where auth_user_id = auth.uid()) = 'administrador'
    and etapa_actual_id in (select id from etapas_definicion where requiere_montos = true)
  );

-- Verificación
select orden, nombre, requiere_montos from etapas_definicion where requiere_montos = true;
