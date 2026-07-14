-- Carga las 30 etapas reales del flujo en la base de datos
-- (antes solo existían dentro del código de la app, no en la tabla).

insert into etapas_definicion (orden, nombre, fase_id, rol_id) values
  (1, 'Aviso de nuevo proyecto', 'fase_1', 'gerente_general'),
  (2, 'Visita técnica', 'fase_1', 'gerente_general'),
  (3, 'Ingreso proyecto al software', 'fase_1', 'administrador'),
  (4, 'Revisión de bases', 'fase_1', 'ingeniero_proyectos'),
  (5, 'Solicitud de documentos legales', 'fase_1', 'encargado_legal'),
  (6, 'Levantamiento topográfico', 'fase_1', 'ingeniero_proyectos'),
  (7, 'Análisis de suelo', 'fase_1', 'ingeniero_proyectos'),
  (8, 'Prueba de bombeo', 'fase_1', 'ingeniero_proyectos'),
  (9, 'Balance tierra - agua - cultivo', 'fase_1', 'ingeniero_proyectos'),
  (10, 'Generación de planos', 'fase_2', 'ingeniero_proyectos'),
  (11, 'Anexos técnicos 9.1, 9.2, 9.3 etc', 'fase_2', 'ingeniero_proyectos'),
  (12, 'Diseño fotovoltaico', 'fase_2', 'ingeniero_proyectos'),
  (13, 'Anexos legales', 'fase_2', 'encargado_legal'),
  (14, 'Diseño civil', 'fase_2', 'ingeniero_proyectos'),
  (15, 'Diseño hidráulico', 'fase_2', 'ingeniero_proyectos'),
  (16, 'Presupuesto', 'fase_2', 'ingeniero_proyectos'),
  (17, 'Visto bueno presupuesto', 'fase_3', 'gerente_general'),
  (18, 'Postulación', 'fase_3', 'ingeniero_proyectos'),
  (19, 'Observaciones técnicas', 'fase_3', 'ingeniero_proyectos'),
  (20, 'Observaciones legales', 'fase_3', 'encargado_legal'),
  (21, 'Revisión de resultados', 'fase_3', 'ingeniero_proyectos'),
  (22, 'Envío de carpetas finales a terreno', 'fase_3', 'ingeniero_proyectos'),
  (23, 'Gestión de financiamiento', 'fase_4', 'gerente_general'),
  (24, 'Contrato de obras', 'fase_4', 'administrador'),
  (25, 'Compra materiales', 'fase_4', 'gerente_general'),
  (26, 'Contratación de subcontratos', 'fase_4', 'gerente_general'),
  (27, 'Contacto con inspectores Indap y CNR', 'fase_4', 'gerente_general'),
  (28, 'Facturación y documentos administrativos', 'fase_5', 'administrador'),
  (29, 'Recepción de dinero', 'fase_5', 'gerente_general'),
  (30, 'Cierre proyecto', 'fase_5', 'gerente_general');

-- Un ítem de checklist genérico por etapa (obligatorio), como punto de partida.
-- Se puede reemplazar más adelante con el checklist real vía importación de Excel.
insert into checklist_items_definicion (etapa_id, descripcion, obligatorio, orden)
select id, 'Completar: ' || nombre, true, 1 from etapas_definicion;
