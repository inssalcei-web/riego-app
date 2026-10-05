-- ============================================================
-- Bonificación Profesionales: carga AUTOMÁTICA.
--
-- Cuando un proyecto pasa de la etapa 17 ("Revisión de resultados")
-- a la 18, es decir, cuando Oliver aprueba el proyecto, el sistema
-- registra solo la bonificación:
--   * Monto: el "Monto de formulación" del proyecto (NO el monto
--     total, que suma formulación + construcción + aporte propio).
--   * Programa: el elegido en la etapa 15 (Postulación), campo
--     "programa_bonificacion". De ahí salen los porcentajes de cada
--     profesional, que quedan congelados en el registro.
--   * Fecha de adjudicación: el día en que se aprueba la etapa 17.
--
-- Se hace con un trigger en la base de datos, así que funciona sin
-- importar quién complete la etapa ni desde dónde, y nadie tiene
-- que cargar nada a mano. No hace falta volver a publicar ninguna
-- Edge Function.
-- ============================================================

-- ---------- Carga automática al aprobar la etapa 17 ----------
create or replace function bonif_cargar_proyecto_aprobado()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_orden_anterior int;
  v_orden_nuevo int;
  v_datos jsonb;
  v_monto numeric;
  v_programa text;
  v_prog record;
begin
  if new.etapa_actual_id is not distinct from old.etapa_actual_id then
    return new;
  end if;

  select orden into v_orden_anterior from etapas_definicion where id = old.etapa_actual_id;
  select orden into v_orden_nuevo from etapas_definicion where id = new.etapa_actual_id;

  -- Solo al AVANZAR de la etapa 17 a la 18 (no al retroceder).
  if v_orden_anterior is distinct from 17 or v_orden_nuevo is distinct from 18 then
    return new;
  end if;

  v_datos := new.datos_formulario::jsonb;

  begin
    v_monto := nullif(trim(v_datos ->> 'monto_formulacion'), '')::numeric;
  exception when others then
    v_monto := null;
  end;

  v_programa := nullif(trim(v_datos ->> 'programa_bonificacion'), '');

  if v_monto is null or v_monto <= 0 or v_programa is null then
    return new;
  end if;

  select * into v_prog from bonif_programas where upper(nombre) = upper(v_programa);
  if not found then
    return new;
  end if;

  insert into bonif_proyectos (
    proyecto_id, codigo_proyecto, programa, agricultor,
    fecha_adjudicacion, monto_total,
    pct_oliver, pct_valentina, pct_elizabeth
  ) values (
    new.id,
    new.codigo_proyecto,
    v_prog.nombre,
    coalesce(nullif(trim(new.nombre_agricultor), ''), 'Sin nombre'),
    (now() at time zone 'America/Santiago')::date,
    v_monto,
    v_prog.pct_oliver, v_prog.pct_valentina, v_prog.pct_elizabeth
  )
  on conflict (proyecto_id) where proyecto_id is not null do nothing;

  return new;
exception when others then
  -- Un problema con la bonificación nunca debe impedir que el
  -- proyecto avance de etapa.
  raise warning 'bonificacion automatica: %', sqlerrm;
  return new;
end;
$$;

drop trigger if exists trg_bonif_cargar_proyecto_aprobado on proyectos;
create trigger trg_bonif_cargar_proyecto_aprobado
  after update of etapa_actual_id on proyectos
  for each row
  execute function bonif_cargar_proyecto_aprobado();

-- ---------- Consulta para la leyenda ("¿se cargó la bonificación?") ----------
-- Devuelve solo true/false, sin ningún dato financiero. La usa la
-- pantalla del proyecto, tras aprobar la etapa 17, para confirmarle
-- a quien la completó que la bonificación quedó cargada.
create or replace function bonif_proyecto_cargado(p_proyecto_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from bonif_proyectos where proyecto_id = p_proyecto_id);
$$;

revoke all on function bonif_proyecto_cargado(uuid) from public;
grant execute on function bonif_proyecto_cargado(uuid) to authenticated;

-- ---------- Los registros ya no se crean ni se editan a mano ----------
-- Gerente general y administrador solo pueden VER y ELIMINAR
-- registros de proyectos (por ejemplo ante un error). Crear y
-- modificar lo hace únicamente el sistema.
drop policy if exists "bonificacion: acceso restringido" on bonif_proyectos;
drop policy if exists "bonificacion: ver proyectos" on bonif_proyectos;
drop policy if exists "bonificacion: eliminar proyectos" on bonif_proyectos;

create policy "bonificacion: ver proyectos"
  on bonif_proyectos for select
  using (puede_ver_bonificacion());

create policy "bonificacion: eliminar proyectos"
  on bonif_proyectos for delete
  using (puede_ver_bonificacion());

-- Verificación: debe mostrar 1 trigger y 2 políticas.
select
  (select count(*) from pg_trigger where tgname = 'trg_bonif_cargar_proyecto_aprobado') as trigger_creado,
  (select count(*) from pg_policies where tablename = 'bonif_proyectos') as politicas_proyectos;
