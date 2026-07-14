-- ============================================================
-- Corrige permisos de lectura para usuarios autenticados.
--
-- Causa del error "Cannot coerce the result to a single JSON
-- object" en Mis Tareas: la tabla `usuarios` (y otras) no tenían
-- una política de acceso explícita para el rol "authenticated",
-- así que la aplicación no podía leer los datos aunque existieran.
-- ============================================================

-- USUARIOS: cualquier persona logueada puede ver la lista de
-- usuarios (se necesita para mostrar nombres de responsables).
alter table usuarios enable row level security;

drop policy if exists "usuarios autenticados pueden ver usuarios" on usuarios;
create policy "usuarios autenticados pueden ver usuarios"
  on usuarios for select
  using (auth.role() = 'authenticated');

-- ROLES: tabla de referencia, lectura abierta a autenticados.
alter table roles enable row level security;

drop policy if exists "usuarios autenticados pueden ver roles" on roles;
create policy "usuarios autenticados pueden ver roles"
  on roles for select
  using (auth.role() = 'authenticated');

-- ETAPAS_DEFINICION: tabla de referencia (las 30 etapas).
alter table etapas_definicion enable row level security;

drop policy if exists "usuarios autenticados pueden ver etapas" on etapas_definicion;
create policy "usuarios autenticados pueden ver etapas"
  on etapas_definicion for select
  using (auth.role() = 'authenticated');

-- CLIENTES: necesario para mostrar el nombre del cliente en cada tarjeta.
alter table clientes enable row level security;

drop policy if exists "usuarios autenticados pueden ver clientes" on clientes;
create policy "usuarios autenticados pueden ver clientes"
  on clientes for select
  using (auth.role() = 'authenticated');

-- CHECKLIST_ITEMS_DEFINICION: el listado de acciones de cada etapa.
alter table checklist_items_definicion enable row level security;

drop policy if exists "usuarios autenticados pueden ver checklist items" on checklist_items_definicion;
create policy "usuarios autenticados pueden ver checklist items"
  on checklist_items_definicion for select
  using (auth.role() = 'authenticated');

-- CHECKLIST_INSTANCIA: faltaba la política de lectura y de marcado
-- (ya tenía RLS activado pero sin ninguna regla, lo que bloqueaba todo).
drop policy if exists "usuarios autenticados pueden ver checklist instancia" on checklist_instancia;
create policy "usuarios autenticados pueden ver checklist instancia"
  on checklist_instancia for select
  using (auth.role() = 'authenticated');

drop policy if exists "usuarios autenticados pueden marcar checklist" on checklist_instancia;
create policy "usuarios autenticados pueden marcar checklist"
  on checklist_instancia for update
  using (auth.role() = 'authenticated');

-- PROYECTO_RESPONSABLES: necesario para saber a quién le toca la
-- siguiente etapa de cada proyecto.
alter table proyecto_responsables enable row level security;

drop policy if exists "usuarios autenticados pueden ver responsables" on proyecto_responsables;
create policy "usuarios autenticados pueden ver responsables"
  on proyecto_responsables for select
  using (auth.role() = 'authenticated');

-- TIMELINE_EVENTOS: historial visible para todos los autenticados.
alter table timeline_eventos enable row level security;

drop policy if exists "usuarios autenticados pueden ver timeline" on timeline_eventos;
create policy "usuarios autenticados pueden ver timeline"
  on timeline_eventos for select
  using (auth.role() = 'authenticated');
