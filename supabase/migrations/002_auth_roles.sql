-- ============================================================
-- Módulo 05/07 — Autenticación y Roles
-- ============================================================

-- Los 6 usuarios reales se crean primero en Supabase Auth
-- (invitación por correo), y luego se linkean acá:

insert into roles (id, nombre) values
  ('gerente_general', 'Gerente general'),
  ('administrador', 'Administrador'),
  ('ingeniero_proyectos', 'Ingeniero(a) de proyectos'),
  ('encargado_legal', 'Encargado(a) área legal');

-- Ejemplo de vínculo (el auth_user_id real se completa al invitar
-- a cada persona desde el panel de Supabase Auth):
-- insert into usuarios (auth_user_id, nombre, rol_id) values
--   ('<uuid-de-supabase-auth>', 'Luis Aguirre', 'gerente_general'),
--   ('<uuid-de-supabase-auth>', 'Patricio Gatica', 'administrador'),
--   ('<uuid-de-supabase-auth>', 'Angelo Bain', 'administrador'),
--   ('<uuid-de-supabase-auth>', 'Oliver García', 'ingeniero_proyectos'),
--   ('<uuid-de-supabase-auth>', 'Valentina Oyarzún', 'ingeniero_proyectos'),
--   ('<uuid-de-supabase-auth>', 'Elizabeth Karstulovic', 'encargado_legal');

-- ---------- Row Level Security: reglas de acceso a nivel de base de datos ----------
-- No se confía solo en el frontend para restringir el acceso;
-- se refuerza directamente en la base de datos.

alter table proyectos enable row level security;
alter table checklist_instancia enable row level security;
alter table notificaciones enable row level security;

-- Cualquier usuario autenticado puede VER todos los proyectos
-- (requisito: el tablero Kanban principal es visible para todos).
create policy "usuarios ven todos los proyectos"
  on proyectos for select
  using (auth.role() = 'authenticated');

-- Pero solo el responsable actual puede modificar/cerrar SU etapa.
create policy "solo el responsable actual puede actualizar su etapa"
  on proyectos for update
  using (
    responsable_actual_id = (
      select id from usuarios where auth_user_id = auth.uid()
    )
  );

-- Un usuario solo puede marcar como leídas sus propias notificaciones.
create policy "usuarios solo ven sus notificaciones"
  on notificaciones for select
  using (
    usuario_id = (select id from usuarios where auth_user_id = auth.uid())
  );

-- ============================================================
-- Nota sobre "Mis tareas" (pantalla 2 de la app):
-- No es una tabla nueva — es un filtro sobre `proyectos` donde
-- responsable_actual_id = usuario conectado. Cero duplicación
-- de datos entre el tablero general y la vista personal.
-- ============================================================
