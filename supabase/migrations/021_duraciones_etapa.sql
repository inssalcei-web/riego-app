-- ============================================================
-- Tabla dedicada para medir cuánto duró cada etapa, registrada en
-- el momento exacto en que el proyecto sale de ahí (avanzando o
-- retrocediendo) — en vez de "adivinarlo" después revisando el
-- historial. Esto es lo que arregla los KPIs de tiempo por etapa.
-- ============================================================

create table if not exists duraciones_etapa (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid references proyectos(id) on delete cascade,
  etapa_id integer references etapas_definicion(id),
  usuario_id uuid references usuarios(id),
  fecha_inicio timestamptz not null,
  fecha_fin timestamptz not null,
  duracion_horas numeric not null,
  tipo_movimiento text not null check (tipo_movimiento in ('avance', 'retroceso')),
  creado_en timestamptz default now()
);

create index if not exists idx_duraciones_etapa_etapa on duraciones_etapa(etapa_id);
create index if not exists idx_duraciones_etapa_proyecto on duraciones_etapa(proyecto_id);

alter table duraciones_etapa enable row level security;

drop policy if exists "usuarios autenticados pueden ver duraciones" on duraciones_etapa;
create policy "usuarios autenticados pueden ver duraciones"
  on duraciones_etapa for select
  using (auth.role() = 'authenticated');

-- Verificación
select count(*) from duraciones_etapa;
