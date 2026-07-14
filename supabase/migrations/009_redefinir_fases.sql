-- Redefine las fases: de 5 a 3, con nuevos rangos de etapas y nuevos nombres.

-- 1. Reasignar cada etapa a su nueva fase, según el rango de "orden"
update etapas_definicion
set fase_id = case
  when orden <= 21 then 'fase_1'
  when orden <= 27 then 'fase_2'
  else 'fase_3'
end;

-- 2. Renombrar las 3 fases que quedan vigentes
update fases set nombre = 'Preparación', orden = 1 where id = 'fase_1';
update fases set nombre = 'Ejecución', orden = 2 where id = 'fase_2';
update fases set nombre = 'Facturación y cierre de proyecto', orden = 3 where id = 'fase_3';

-- 3. Eliminar las fases que ya no se usan
delete from fases where id in ('fase_4', 'fase_5');

-- Verificación: debe devolver 3 filas
select * from fases order by orden;
