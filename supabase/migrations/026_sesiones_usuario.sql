-- ============================================================
-- Registro de sesiones de usuario: para el cuadro de "tiempo en
-- la app" en KPIs (promedio por conexión y total histórico) y
-- para mostrar la última conexión en el NavBar. Se llena desde el
-- frontend (components/NavBar.tsx) con un "latido" cada minuto
-- mientras la pestaña está abierta y visible.
-- ============================================================

create table if not exists sesiones_usuario (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references usuarios(id) not null,
  iniciada_en timestamptz not null default now(),
  ultima_actividad timestamptz not null default now(),
  duracion_segundos int not null default 0
);

alter table sesiones_usuario enable row level security;

drop policy if exists "usuarios autenticados pueden ver sesiones" on sesiones_usuario;
create policy "usuarios autenticados pueden ver sesiones"
  on sesiones_usuario for select
  using (auth.role() = 'authenticated');

drop policy if exists "un usuario puede crear su propia sesion" on sesiones_usuario;
create policy "un usuario puede crear su propia sesion"
  on sesiones_usuario for insert
  with check (
    usuario_id = (select id from usuarios where auth_user_id = auth.uid())
  );

drop policy if exists "un usuario puede actualizar su propia sesion" on sesiones_usuario;
create policy "un usuario puede actualizar su propia sesion"
  on sesiones_usuario for update
  using (
    usuario_id = (select id from usuarios where auth_user_id = auth.uid())
  );

create index if not exists sesiones_usuario_usuario_id_idx on sesiones_usuario (usuario_id);
