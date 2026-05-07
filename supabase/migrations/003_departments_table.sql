-- =====================================================================
-- MIGRATION 003 — Reparti come tabella editabile
-- =====================================================================
-- Trasforma i reparti da enum hardcoded a tabella, in modo che possano
-- essere creati/modificati/cancellati da admin.
--
-- È idempotente: si può rieseguire senza danni (i blocchi controllano
-- l'esistenza degli oggetti prima di crearli).
--
-- IMPORTANTE: dopo l'esecuzione l'enum department_type esiste ancora ma
-- non viene più usato. Lo lasciamo per non bloccare il rollback in caso
-- di problemi.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Nuova tabella departments
-- ---------------------------------------------------------------------
create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (length(trim(name)) between 1 and 50),
  color_class text not null default 'bg-slate-100 text-slate-700 border-slate-200',
  position int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists departments_position_idx
  on public.departments(position);

alter table public.departments enable row level security;

drop policy if exists "departments_select" on public.departments;
create policy "departments_select"
  on public.departments for select
  to authenticated
  using (true);

drop policy if exists "departments_write_admin" on public.departments;
create policy "departments_write_admin"
  on public.departments for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------
-- 2. Seed dei reparti correnti
-- ---------------------------------------------------------------------
insert into public.departments (name, color_class, position) values
  ('Marketing',       'bg-pink-100 text-pink-700 border-pink-200',           10),
  ('Commerciale',     'bg-blue-100 text-blue-700 border-blue-200',           20),
  ('Zucchetti',       'bg-amber-100 text-amber-700 border-amber-200',        30),
  ('Sviluppo',        'bg-purple-100 text-purple-700 border-purple-200',     40),
  ('Amministrazione', 'bg-emerald-100 text-emerald-700 border-emerald-200',  50),
  ('Direzione',       'bg-slate-100 text-slate-700 border-slate-200',        60)
on conflict (name) do nothing;

-- ---------------------------------------------------------------------
-- 3. Aggiungo profiles.department_id
-- ---------------------------------------------------------------------
alter table public.profiles
  add column if not exists department_id uuid references public.departments(id) on delete set null;

create index if not exists profiles_department_idx
  on public.profiles(department_id);

-- Migro i valori da department (enum) a department_id (uuid)
-- Funziona finché la colonna `department` esiste ancora con i suoi valori.
update public.profiles p
set department_id = d.id
from public.departments d
where p.department_id is null
  and lower(d.name) = p.department::text;

-- ---------------------------------------------------------------------
-- 4. Tabella di join task_departments
-- ---------------------------------------------------------------------
create table if not exists public.task_departments (
  task_id uuid not null references public.tasks(id) on delete cascade,
  department_id uuid not null references public.departments(id) on delete cascade,
  primary key (task_id, department_id)
);

create index if not exists task_departments_task_idx
  on public.task_departments(task_id);
create index if not exists task_departments_department_idx
  on public.task_departments(department_id);

alter table public.task_departments enable row level security;

drop policy if exists "task_departments_select" on public.task_departments;
create policy "task_departments_select"
  on public.task_departments for select
  to authenticated
  using (
    exists (
      select 1 from public.tasks t
      where t.id = task_id
      and (t.status = 'published' or public.is_admin())
    )
  );

drop policy if exists "task_departments_write_admin" on public.task_departments;
create policy "task_departments_write_admin"
  on public.task_departments for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Migro target_departments (array di enum) → righe in task_departments
insert into public.task_departments (task_id, department_id)
select t.id, d.id
from public.tasks t
cross join lateral unnest(t.target_departments) as dept_enum
join public.departments d on lower(d.name) = dept_enum::text
on conflict do nothing;

-- ---------------------------------------------------------------------
-- 5. Aggiorno il trigger handle_new_user per usare department_id
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role user_role;
  default_dept_id uuid;
begin
  begin
    requested_role := coalesce(
      (new.raw_user_meta_data->>'role')::user_role,
      'guest'
    );
  exception when others then
    requested_role := 'guest';
  end;

  -- Trova il department_id dal nome passato in metadata, oppure
  -- usa un default sensato (Commerciale)
  if new.raw_user_meta_data->>'department_id' is not null then
    default_dept_id := (new.raw_user_meta_data->>'department_id')::uuid;
  elsif new.raw_user_meta_data->>'department' is not null then
    select id into default_dept_id
    from public.departments
    where lower(name) = lower(new.raw_user_meta_data->>'department')
    limit 1;
  end if;

  if default_dept_id is null then
    select id into default_dept_id
    from public.departments
    where lower(name) = 'commerciale'
    limit 1;
  end if;

  insert into public.profiles (id, email, full_name, role, department, department_id)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    requested_role,
    -- legacy, mantenuto per non rompere nulla
    coalesce((new.raw_user_meta_data->>'department')::department_type, 'commerciale'),
    default_dept_id
  );
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 6. Aggiorno la policy profiles_update_self: ora deve consentire il
--    cambio di department_id da parte di se stessi? NO. Il reparto lo
--    decide solo l'admin. Quindi blocchiamo anche department_id.
-- ---------------------------------------------------------------------
drop policy if exists "profiles_update_self" on public.profiles;

create policy "profiles_update_self"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and role = (select role from public.profiles where id = auth.uid())
    and department = (select department from public.profiles where id = auth.uid())
    and department_id is not distinct from (
      select department_id from public.profiles where id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------
-- 7. Forza PostgREST a ricaricare la cache dello schema
-- ---------------------------------------------------------------------
notify pgrst, 'reload schema';

-- =====================================================================
-- VERIFICHE FINALI (esegui dopo la migration):
--
-- -- Tutti i profili hanno un department_id?
-- select email, department, department_id from public.profiles;
--
-- -- Tutti i task con target_departments hanno righe in task_departments?
-- select t.title, count(td.department_id) as targets
-- from public.tasks t
-- left join public.task_departments td on td.task_id = t.id
-- group by t.id, t.title;
--
-- -- Lista reparti
-- select * from public.departments order by position;
-- =====================================================================
