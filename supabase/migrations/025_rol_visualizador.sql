-- ============================================================
-- Nuevo rol de solo lectura, para Roberto Paredes y Sergio
-- Martínez: ven el tablero de proyectos y el detalle de cada uno
-- (modal de solo lectura), pero no completan etapas, no editan
-- nada y no ven el panel de KPIs.
--
-- Este archivo solo crea el ROL. El USUARIO con este rol (la
-- cuenta compartida) se crea aparte, siguiendo las instrucciones
-- que te dejo en el mensaje — requiere primero crear el login en
-- el Dashboard de Supabase (Authentication → Users), no se puede
-- hacer solo con SQL.
-- ============================================================

insert into roles (id, nombre)
values ('visualizador', 'Visualizador (solo lectura)')
on conflict (id) do nothing;
