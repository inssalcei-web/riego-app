-- ============================================================
-- Paquete: colores por fase, semáforo por días en etapa,
-- archivado automático (61 días) y manual.
-- ============================================================

-- Desde cuándo el proyecto está en su etapa actual — usado tanto
-- para el semáforo (verde/amarillo/rojo) como para el archivado
-- automático (61 días). Se actualiza cada vez que el proyecto
-- cambia de etapa (avanzar, retroceder, retomar, o al crearse).
alter table proyectos add column if not exists etapa_actual_desde timestamptz default now();
update proyectos set etapa_actual_desde = creado_en where etapa_actual_desde is null;

-- Archivado manual (independiente del automático por días)
alter table proyectos add column if not exists archivado_manual boolean default false;
alter table proyectos add column if not exists archivado_motivo text;
alter table proyectos add column if not exists archivado_en timestamptz;
alter table proyectos add column if not exists archivado_por uuid references usuarios(id);

-- Verificación
select column_name from information_schema.columns
where table_name = 'proyectos'
and column_name in ('etapa_actual_desde', 'archivado_manual', 'archivado_motivo', 'archivado_en', 'archivado_por');
