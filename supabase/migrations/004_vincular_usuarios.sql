-- ============================================================
-- Vincula los 6 usuarios reales (ya creados en Supabase Auth)
-- con su rol correspondiente en la tabla `usuarios`.
-- Ejecutar en SQL Editor, después de haber corrido schema.sql
-- y auth-roles.sql (ese ya insertó los 4 roles).
-- ============================================================

insert into usuarios (auth_user_id, nombre, rol_id) values
  ('56283eca-dda8-4c4a-a2ec-a26bb0517cd8', 'Luis Aguirre',           'gerente_general'),
  ('5a157281-1931-4065-a555-307202aa6a72', 'Patricio Gatica',        'administrador'),
  ('58dd98c0-7dad-4e3a-9c9e-672a18cef554', 'Angelo Bain',            'administrador'),
  ('301f7e42-9f43-4af9-b8a8-ba467e49eacc', 'Oliver García',          'ingeniero_proyectos'),
  ('47b463c3-afa5-4460-89b6-5a87d879a2bf', 'Valentina Oyarzún',      'ingeniero_proyectos'),
  ('a43a1161-69e6-4d70-8135-aede49e8cbbe', 'Elizabeth Karstulovic',  'encargado_legal');

-- Verificación rápida: debe devolver 6 filas con nombre y rol
select nombre, rol_id from usuarios order by rol_id;
