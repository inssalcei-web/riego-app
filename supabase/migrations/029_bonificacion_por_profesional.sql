-- ============================================================
-- Bonificación Profesionales: acceso por persona.
--
--  * Gerente general y Administrador: ven y modifican TODO
--    (proyectos, pagos, porcentajes y deuda inicial de los tres).
--  * Oliver, Valentina y Elizabeth: solo LEEN lo suyo. No pueden
--    modificar nada ni ver montos, bonos, pagos o deuda de los otros
--    dos. Los PORCENTAJES de cada programa sí son visibles para los
--    tres (transparencia sobre cómo se calcula el bono).
--  * Cualquier otro rol (incluido el visualizador): sin acceso.
--
-- Todo se exige en la base de datos. Las tablas bonif_* quedan
-- accesibles solo para gerente/administrador (RLS); un profesional
-- no las lee directamente, sino a través de la función
-- bonif_mi_panel(), que le devuelve únicamente su propia información
-- (su deuda, sus proyectos con SU porcentaje, sus pagos).
-- ============================================================

-- ---------- Vínculo cuenta de la app <-> profesional ----------
create table if not exists bonif_vinculos (
  usuario_id uuid primary key references usuarios(id) on delete cascade,
  profesional text not null unique
    check (profesional in ('Oliver', 'Valentina', 'Elizabeth'))
);

alter table bonif_vinculos enable row level security;

-- ---------- Permiso de gestión (reemplaza la regla de la migración 028) ----------
-- Las políticas de las tablas bonif_* ya llaman a esta función, así
-- que al redefinirla pasan a exigir gerente general o administrador.
create or replace function puede_ver_bonificacion()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from usuarios
    where auth_user_id = auth.uid()
      and rol_id in ('gerente_general', 'administrador')
  );
$$;

revoke all on function puede_ver_bonificacion() from public;
grant execute on function puede_ver_bonificacion() to authenticated;

drop policy if exists "bonificacion: acceso restringido" on bonif_vinculos;
create policy "bonificacion: acceso restringido"
  on bonif_vinculos for all
  using (puede_ver_bonificacion())
  with check (puede_ver_bonificacion());

-- ---------- Panel propio de cada profesional (solo lectura) ----------
create or replace function bonif_mi_panel()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  prof text;
begin
  select v.profesional into prof
  from bonif_vinculos v
  join usuarios u on u.id = v.usuario_id
  where u.auth_user_id = auth.uid();

  if prof is null then
    return null;
  end if;

  return jsonb_build_object(
    'profesional', prof,
    'config', (
      select jsonb_build_object(
        'deuda', case prof
                   when 'Oliver' then c.deuda_oliver
                   when 'Valentina' then c.deuda_valentina
                   else c.deuda_elizabeth
                 end,
        'fecha_deuda', c.fecha_deuda,
        'mes_inicio_pagos', c.mes_inicio_pagos
      )
      from bonif_config c
      where c.id = 1
    ),
    'proyectos', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', p.id,
          'codigo_proyecto', p.codigo_proyecto,
          'programa', p.programa,
          'agricultor', p.agricultor,
          'fecha_adjudicacion', p.fecha_adjudicacion,
          'monto_total', p.monto_total,
          'pct', case prof
                   when 'Oliver' then p.pct_oliver
                   when 'Valentina' then p.pct_valentina
                   else p.pct_elizabeth
                 end
        )
        order by p.fecha_adjudicacion desc
      )
      from bonif_proyectos p
      where (case prof
               when 'Oliver' then p.pct_oliver
               when 'Valentina' then p.pct_valentina
               else p.pct_elizabeth
             end) > 0
    ), '[]'::jsonb),
    'pagos', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', x.id,
          'fecha', x.fecha,
          'monto', x.monto,
          'detalle', x.detalle
        )
        order by x.fecha desc
      )
      from bonif_pagos x
      where x.trabajador = prof
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function bonif_mi_panel() from public;
grant execute on function bonif_mi_panel() to authenticated;

-- ---------- Porcentajes visibles para los profesionales ----------
-- Por transparencia, Oliver, Valentina y Elizabeth pueden LEER la
-- tabla de programas con los porcentajes de los tres (no pueden
-- modificarla). Los montos, bonos, pagos y deudas de los demás
-- siguen siendo privados.
create or replace function es_profesional_bonificacion()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from bonif_vinculos v
    join usuarios u on u.id = v.usuario_id
    where u.auth_user_id = auth.uid()
  );
$$;

revoke all on function es_profesional_bonificacion() from public;
grant execute on function es_profesional_bonificacion() to authenticated;

drop policy if exists "bonificacion: porcentajes visibles para profesionales" on bonif_programas;
create policy "bonificacion: porcentajes visibles para profesionales"
  on bonif_programas for select
  using (es_profesional_bonificacion());

-- Verificación: debe mostrar las dos funciones y la tabla de vínculos.
select
  (select count(*) from pg_proc where proname in ('puede_ver_bonificacion', 'bonif_mi_panel', 'es_profesional_bonificacion')) as funciones,
  (select count(*) from bonif_vinculos) as vinculos_creados;
