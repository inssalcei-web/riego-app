-- ============================================================
-- Paquete de 5 mejoras — cambios de base de datos
-- ============================================================

-- Ítem 1: fecha de retomar + marca de si ya se avisó
alter table proyectos add column if not exists fecha_retomar date;
alter table proyectos add column if not exists aviso_retomar_enviado boolean default false;

-- Permite que el Gerente general pueda marcar el aviso como enviado
-- (y en general gestionar cualquier proyecto cerrado), sin importar
-- de quién era la etapa en el momento del cierre.
drop policy if exists "gerente general puede administrar proyectos" on proyectos;
create policy "gerente general puede administrar proyectos"
  on proyectos for update
  using (
    (select rol_id from usuarios where auth_user_id = auth.uid()) = 'gerente_general'
  );

-- Verificación
select column_name from information_schema.columns
where table_name = 'proyectos' and column_name in ('fecha_retomar', 'aviso_retomar_enviado');
