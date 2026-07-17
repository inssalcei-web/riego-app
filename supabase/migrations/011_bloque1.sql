-- ============================================================
-- Bloque 1: creación de proyectos, asignación fija de ingenieros,
-- responsabilidad compartida de Administrador, cierre anticipado.
-- ============================================================

-- 1. Permitir que un proyecto nazca sin nombre ni cliente todavía
alter table proyectos alter column nombre drop not null;
alter table proyectos alter column cliente_id drop not null;

-- 2. Identidad fija del proyecto (código y agricultor), inamovible
alter table proyectos add column if not exists codigo_proyecto text;
alter table proyectos add column if not exists nombre_agricultor text;

-- 3. Motivo de cierre anticipado
alter table proyectos add column if not exists motivo_cierre text;
alter table proyectos drop constraint if exists motivo_cierre_valido;
alter table proyectos add constraint motivo_cierre_valido check (
  motivo_cierre is null or motivo_cierre in (
    'rechazo_presupuesto', 'falta_documentos_legales', 'falta_presupuesto', 'cliente_desiste'
  )
);

-- 4. Asignación fija por etapa (para los Ingenieros de proyecto)
alter table etapas_definicion add column if not exists usuario_asignado_id uuid references usuarios(id);

update etapas_definicion set usuario_asignado_id = (select id from usuarios where nombre = 'Oliver García')
where orden in (6, 7, 10, 14, 16, 18, 21);

update etapas_definicion set usuario_asignado_id = (select id from usuarios where nombre = 'Valentina Oyarzún')
where orden in (4, 8, 9, 11, 12, 15, 19, 22);

-- 5. Permitir que el checklist_instancia se relacione bien aunque
--    el proyecto todavía no tenga nombre (sin cambios de esquema
--    adicionales, el trigger ya existente sigue funcionando igual).

-- 6. Permitir que CUALQUIER administrador actualice el proyecto
--    (guardar el formulario, etc.) cuando la etapa actual es de
--    Administrador — no solo quien quedó como "responsable" puntual.
drop policy if exists "solo el responsable actual puede actualizar su etapa" on proyectos;
create policy "responsable actual o administrador compartido puede actualizar"
  on proyectos for update
  using (
    responsable_actual_id = (select id from usuarios where auth_user_id = auth.uid())
    or (
      (select rol_id from usuarios where auth_user_id = auth.uid()) = 'administrador'
      and etapa_actual_id in (select id from etapas_definicion where rol_id = 'administrador')
    )
  );

-- Verificación
select codigo_proyecto, nombre_agricultor, motivo_cierre from proyectos limit 1;
select orden, nombre, usuario_asignado_id from etapas_definicion where usuario_asignado_id is not null order by orden;
