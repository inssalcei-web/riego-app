-- ============================================================
-- Pestaña "Bonificación Profesionales": registro de los proyectos
-- adjudicados que generan bono, los pagos hechos a los
-- profesionales (Oliver, Valentina y Elizabeth) y el saldo que se
-- les debe. Réplica de la planilla Bonos_planilla.xlsx.
--
-- ACCESO: solo roles internos, NO el rol "visualizador". Se exige a
-- nivel de base de datos (RLS), no solo ocultando la pestaña, porque
-- son datos de pagos: un usuario sin permiso no puede leerlos ni
-- escribirlos ni siquiera llamando a la API de Supabase directamente.
-- ============================================================

-- ---------- Función de permiso (usada por todas las políticas) ----------
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
      and rol_id <> 'visualizador'
  );
$$;

revoke all on function puede_ver_bonificacion() from public;
grant execute on function puede_ver_bonificacion() to authenticated;

-- ---------- Programas y sus porcentajes (hoja "Porcentajes") ----------
create table if not exists bonif_programas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  pct_oliver numeric not null default 0 check (pct_oliver >= 0 and pct_oliver <= 1),
  pct_valentina numeric not null default 0 check (pct_valentina >= 0 and pct_valentina <= 1),
  pct_elizabeth numeric not null default 0 check (pct_elizabeth >= 0 and pct_elizabeth <= 1),
  orden int not null default 0,
  creado_en timestamptz not null default now()
);

create unique index if not exists bonif_programas_nombre_unico
  on bonif_programas (upper(nombre));

-- ---------- Proyectos con bono (hoja "Proyectos") ----------
-- Cada fila guarda una COPIA de los porcentajes vigentes el día en
-- que se registró: si más adelante cambia un porcentaje en la tabla
-- de programas, los bonos de proyectos ya registrados no se alteran.
create table if not exists bonif_proyectos (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid references proyectos(id) on delete set null,
  codigo_proyecto text,
  programa text not null,
  agricultor text not null,
  fecha_adjudicacion date not null,
  monto_total numeric not null check (monto_total >= 0),
  pct_oliver numeric not null default 0,
  pct_valentina numeric not null default 0,
  pct_elizabeth numeric not null default 0,
  creado_en timestamptz not null default now(),
  creado_por uuid references usuarios(id)
);

-- Un mismo proyecto de la app no puede generar bono dos veces.
create unique index if not exists bonif_proyectos_proyecto_unico
  on bonif_proyectos (proyecto_id)
  where proyecto_id is not null;

-- ---------- Pagos realizados (hoja "Pagos") ----------
create table if not exists bonif_pagos (
  id uuid primary key default gen_random_uuid(),
  fecha date not null,
  trabajador text not null check (trabajador in ('Oliver', 'Valentina', 'Elizabeth')),
  monto numeric not null check (monto >= 0),
  detalle text,
  creado_en timestamptz not null default now(),
  creado_por uuid references usuarios(id)
);

create index if not exists bonif_pagos_trabajador_idx on bonif_pagos (trabajador);
create index if not exists bonif_pagos_fecha_idx on bonif_pagos (fecha);

-- ---------- Deuda inicial y mes de inicio (hoja "Resumen") ----------
-- Una sola fila (id = 1).
create table if not exists bonif_config (
  id int primary key check (id = 1),
  deuda_oliver numeric not null default 0,
  deuda_valentina numeric not null default 0,
  deuda_elizabeth numeric not null default 0,
  fecha_deuda date,
  mes_inicio_pagos date
);

insert into bonif_config (id, fecha_deuda, mes_inicio_pagos)
values (1, date '2026-10-01', date '2026-10-01')
on conflict (id) do nothing;

-- ---------- Programas iniciales (los de la hoja "Porcentajes") ----------
insert into bonif_programas (nombre, pct_oliver, pct_valentina, pct_elizabeth, orden) values
  ('Ley 18.450 CNR',             0.15, 0.10, 0.07, 1),
  ('Pequeña Agricultura CNR',    0.10, 0.15, 0.07, 2),
  ('GORE (Oliver solo)',         0.25, 0,    0,    3),
  ('PRI INDAP - Oliver solo',    0.15, 0,    0,    4),
  ('PRI INDAP - Valentina sola', 0,    0.15, 0,    5),
  ('PRI INDAP - en conjunto',    0.10, 0.10, 0,    6)
on conflict do nothing;

-- ---------- Seguridad (RLS) ----------
alter table bonif_programas enable row level security;
alter table bonif_proyectos enable row level security;
alter table bonif_pagos enable row level security;
alter table bonif_config enable row level security;

drop policy if exists "bonificacion: acceso restringido" on bonif_programas;
create policy "bonificacion: acceso restringido"
  on bonif_programas for all
  using (puede_ver_bonificacion())
  with check (puede_ver_bonificacion());

drop policy if exists "bonificacion: acceso restringido" on bonif_proyectos;
create policy "bonificacion: acceso restringido"
  on bonif_proyectos for all
  using (puede_ver_bonificacion())
  with check (puede_ver_bonificacion());

drop policy if exists "bonificacion: acceso restringido" on bonif_pagos;
create policy "bonificacion: acceso restringido"
  on bonif_pagos for all
  using (puede_ver_bonificacion())
  with check (puede_ver_bonificacion());

drop policy if exists "bonificacion: acceso restringido" on bonif_config;
create policy "bonificacion: acceso restringido"
  on bonif_config for all
  using (puede_ver_bonificacion())
  with check (puede_ver_bonificacion());

-- Verificación: deberían aparecer 6 programas y 1 fila de configuración.
select
  (select count(*) from bonif_programas) as programas,
  (select count(*) from bonif_config) as configuracion;
