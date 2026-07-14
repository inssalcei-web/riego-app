-- Especialidad de cada Ingeniero(a) de proyectos, según la pestaña Roles del Excel.
alter table usuarios add column if not exists especialidad text;
update usuarios set especialidad = 'Civil' where nombre = 'Oliver García';
update usuarios set especialidad = 'Hidráulico' where nombre = 'Valentina Oyarzún';

-- Catálogo de los 23 documentos legales posibles (pestaña 'Solicitud de documentos legales').
create table if not exists documentos_legales_catalogo (
  id serial primary key,
  nombre text not null unique
);

insert into documentos_legales_catalogo (nombre) values
  ('Copia vigente de la inscripción de la propiedad'),
  ('Copia vigente de los derechos de agua'),
  ('Solicitud de inscripción DGA'),
  ('Cedula de identidad'),
  ('Certificado de avalúo con uso detallado de suelo'),
  ('Certificado de canal'),
  ('Boleta de luz'),
  ('Carta de aporte'),
  ('Declaración jurada de superficie y rol'),
  ('Declaración jurada de inhabilidades'),
  ('Declaración jurada de dueños del predio'),
  ('Contrato de arriendo por escritura pública inscrito en el CBR'),
  ('Certificado de usuario Indap'),
  ('IL-10'),
  ('Certificado de consultor actualizado'),
  ('E-Rut para sociedades'),
  ('Certificado vigente de sociedad'),
  ('Estatudo actualizado de sociedad'),
  ('Autorización de servidumbres'),
  ('Constitución de la comunidad de aguas'),
  ('Poderes o autorizaciones de representación'),
  ('Certificado de vigencia de los titulares'),
  ('Otro');

-- Documentos legales elegidos para un proyecto puntual, con su checkbox de completado.
create table if not exists proyecto_documentos_legales (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid references proyectos(id) not null,
  documento_id int references documentos_legales_catalogo(id) not null,
  completado boolean not null default false,
  unique (proyecto_id, documento_id)
);

alter table proyecto_documentos_legales enable row level security;
drop policy if exists "usuarios autenticados gestionan documentos legales" on proyecto_documentos_legales;
create policy "usuarios autenticados gestionan documentos legales"
  on proyecto_documentos_legales for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

alter table documentos_legales_catalogo enable row level security;
drop policy if exists "usuarios autenticados ven catalogo legal" on documentos_legales_catalogo;
create policy "usuarios autenticados ven catalogo legal"
  on documentos_legales_catalogo for select
  using (auth.role() = 'authenticated');

-- Campos del formulario de ingreso de proyecto (etapa 3), guardados como JSON
-- flexible en el propio proyecto, en vez de crear 17 columnas nuevas.
alter table proyectos add column if not exists datos_formulario jsonb default '{}'::jsonb;