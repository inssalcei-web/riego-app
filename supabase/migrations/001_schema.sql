-- ============================================================
-- Módulo 18 — Base de Datos
-- Implementa: fases, etapas, roles, usuarios, proyectos,
-- checklist, timeline y auditoría, sobre el flujo real
-- definido en flujo-config.json
-- ============================================================

-- ---------- Configuración del flujo (definición, no instancias) ----------

create table roles (
  id text primary key,              -- ej: 'ingeniero_proyectos'
  nombre text not null
);

create table usuarios (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid references auth.users(id) unique,
  nombre text not null,
  rol_id text references roles(id) not null,
  activo boolean not null default true
);

create table fases (
  id text primary key,              -- ej: 'fase_1'
  orden int not null,
  nombre text not null
);

create table etapas_definicion (
  id serial primary key,
  orden int not null unique,        -- 1 a 30, define la secuencia lineal
  nombre text not null,
  fase_id text references fases(id) not null,
  rol_id text references roles(id) not null
);

create table checklist_items_definicion (
  id serial primary key,
  etapa_id int references etapas_definicion(id) not null,
  descripcion text not null,
  obligatorio boolean not null default true,
  orden int not null
);

-- ---------- Proyectos (instancias reales) ----------

create table clientes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null
);

create table proyectos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  cliente_id uuid references clientes(id) not null,
  etapa_actual_id int references etapas_definicion(id) not null,
  responsable_actual_id uuid references usuarios(id) not null,
  fecha_inicio date not null default current_date,
  fecha_objetivo date,
  finalizado boolean not null default false,
  creado_en timestamptz not null default now()
);

-- Asignación específica: qué persona ejecuta cada etapa en este proyecto puntual
-- (necesario porque un rol puede tener más de un usuario, ej. Administrador)
create table proyecto_responsables (
  proyecto_id uuid references proyectos(id) not null,
  etapa_id int references etapas_definicion(id) not null,
  usuario_id uuid references usuarios(id) not null,
  primary key (proyecto_id, etapa_id)
);

create table checklist_instancia (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid references proyectos(id) not null,
  item_definicion_id int references checklist_items_definicion(id) not null,
  completado boolean not null default false,
  completado_en timestamptz,
  completado_por uuid references usuarios(id)
);

-- ---------- Timeline (historial legible para el usuario) ----------

create table timeline_eventos (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid references proyectos(id) not null,
  tipo text not null,               -- 'creacion' | 'cambio_etapa' | 'cambio_responsable' | 'observacion'
  descripcion text not null,
  usuario_id uuid references usuarios(id),
  ocurrido_en timestamptz not null default now()
);

-- ---------- Auditoría (registro técnico completo) ----------

create table auditoria (
  id uuid primary key default gen_random_uuid(),
  fecha timestamptz not null default now(),
  usuario_id uuid references usuarios(id) not null,
  proyecto_id uuid references proyectos(id) not null,
  etapa_id int references etapas_definicion(id),
  accion text not null,
  estado_anterior text,
  estado_nuevo text,
  tiempo_ejecucion_ms int,
  observaciones text
);

-- ---------- Notificaciones ----------

create table notificaciones (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references usuarios(id) not null,
  proyecto_id uuid references proyectos(id),
  mensaje text not null,
  leida boolean not null default false,
  creado_en timestamptz not null default now()
);

-- ============================================================
-- Nota: el avance automático de etapa (validar checklist,
-- asignar siguiente responsable, registrar timeline/auditoría,
-- notificar) se implementa como función/trigger en Supabase
-- (Edge Function "complete_stage"), no en el frontend, para
-- que ocurra siempre igual sin importar desde dónde se dispare.
-- Se detalla en el módulo 09_Motor_de_Flujo.
-- ============================================================
