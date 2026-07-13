-- Ejecutar ANTES de vincular-usuarios.sql

insert into roles (id, nombre) values
  ('gerente_general', 'Gerente general'),
  ('administrador', 'Administrador'),
  ('ingeniero_proyectos', 'Ingeniero(a) de proyectos'),
  ('encargado_legal', 'Encargado(a) área legal');

-- Verificación: debe devolver 4 filas
select * from roles;
