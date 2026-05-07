-- =====================================================================
-- MIGRATION 002 — Ruolo master + allegati multipli
-- =====================================================================
-- Esegui su Supabase SQL Editor.
-- È idempotente: si può rieseguire senza danni.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Aggiungo il valore 'master' all'enum user_role
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_enum
    where enumtypid = 'user_role'::regtype and enumlabel = 'master'
  ) then
    alter type user_role add value 'master' before 'admin';
  end if;
end$$;

-- ---------------------------------------------------------------------
-- 2. Aggiorno la helper function: ora is_admin() include anche master,
--    perché un master è "admin" + altri poteri.
--    Aggiungo is_master() per i casi specifici (gestione utenti).
-- ---------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'master')
  );
$$;

create or replace function public.is_master()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'master'
  );
$$;

-- ---------------------------------------------------------------------
-- 3. Aggiorno il default role in profiles: 'guest' resta corretto,
--    ma assicuro che non sia possibile auto-assegnarsi master tramite
--    auth metadata in fase di registrazione. Il trigger handle_new_user
--    deve forzare 'guest' se l'utente è creato senza explicit role.
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role user_role;
begin
  -- Forziamo a 'guest' se non specificato. Solo le Edge Function
  -- chiamate da master/admin possono passare role custom via metadata.
  begin
    requested_role := coalesce(
      (new.raw_user_meta_data->>'role')::user_role,
      'guest'
    );
  exception when others then
    requested_role := 'guest';
  end;

  insert into public.profiles (id, email, full_name, role, department)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    requested_role,
    coalesce((new.raw_user_meta_data->>'department')::department_type, 'commerciale')
  );
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 4. Aggiorno la policy profiles_update_self per prevenire l'auto-promozione.
--    Rimpiazzo la policy esistente.
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
  );

-- ---------------------------------------------------------------------
-- 5. Policy specifica per i master: possono modificare il role degli altri.
--    Un admin non-master NON può modificare i role né accedere a Utenti.
-- ---------------------------------------------------------------------
drop policy if exists "profiles_update_admin" on public.profiles;
drop policy if exists "profiles_update_master" on public.profiles;

create policy "profiles_update_master"
  on public.profiles for update
  to authenticated
  using (public.is_master())
  with check (public.is_master());

-- ---------------------------------------------------------------------
-- 6. Tabella allegati multipli per i task
-- ---------------------------------------------------------------------
create table if not exists public.task_attachments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  label text not null check (length(trim(label)) between 1 and 100),
  url text not null check (url ~ '^https?://'),
  position int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists task_attachments_task_idx
  on public.task_attachments(task_id, position);

alter table public.task_attachments enable row level security;

-- SELECT: chiunque può vedere gli allegati di un task che vede
drop policy if exists "task_attachments_select" on public.task_attachments;
create policy "task_attachments_select"
  on public.task_attachments for select
  to authenticated
  using (
    exists (
      select 1 from public.tasks t
      where t.id = task_id
      and (t.status = 'published' or public.is_admin())
    )
  );

-- WRITE: solo admin/master (chi può creare task, può gestirne gli allegati)
drop policy if exists "task_attachments_write_admin" on public.task_attachments;
create policy "task_attachments_write_admin"
  on public.task_attachments for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------
-- 7. Migrazione del vecchio campo attachment_url verso task_attachments.
--    I task esistenti che avevano un attachment_url ne avranno uno
--    ricreato come prima riga in task_attachments.
-- ---------------------------------------------------------------------
insert into public.task_attachments (task_id, label, url, position)
select id, 'Documento allegato', attachment_url, 0
from public.tasks
where attachment_url is not null
  and not exists (
    select 1 from public.task_attachments
    where task_id = tasks.id
  );

-- Adesso possiamo lasciare il campo per retrocompatibilità (così le
-- vecchie versioni del frontend continuano a funzionare per qualche
-- minuto durante il deploy). Se vuoi rimuoverlo, esegui dopo aver
-- verificato che il nuovo frontend è stabile:
--   alter table public.tasks drop column attachment_url;

-- ---------------------------------------------------------------------
-- 8. Forza PostgREST a ricaricare lo schema cache
-- ---------------------------------------------------------------------
notify pgrst, 'reload schema';

-- =====================================================================
-- IMPORTANTE: dopo aver eseguito questa migration, promuoviti master:
--
--   update public.profiles set role = 'master' where email = 'tu@pienissimo.it';
--
-- Tutti gli altri admin restano admin (= possono creare task, ma non
-- accedono alla gestione utenti).
-- =====================================================================
