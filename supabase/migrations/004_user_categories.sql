-- =====================================================================
-- MIGRATION 004 — Categorie per utente, default per reparto
-- =====================================================================
-- Aggiunge il filtro "whitelist" delle categorie consultabili dai guest.
-- Master e admin sono esclusi dal filtro (vedono sempre tutto).
--
-- Idempotente: si può rieseguire senza danni.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. user_categories — quali categorie può vedere ogni utente
-- ---------------------------------------------------------------------
create table if not exists public.user_categories (
  user_id uuid not null references public.profiles(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, category_id)
);

create index if not exists user_categories_user_idx
  on public.user_categories(user_id);
create index if not exists user_categories_category_idx
  on public.user_categories(category_id);

alter table public.user_categories enable row level security;

drop policy if exists "user_categories_select_self_or_admin"
  on public.user_categories;
create policy "user_categories_select_self_or_admin"
  on public.user_categories for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "user_categories_write_admin"
  on public.user_categories;
create policy "user_categories_write_admin"
  on public.user_categories for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------
-- 2. department_categories — categorie default per reparto
-- ---------------------------------------------------------------------
create table if not exists public.department_categories (
  department_id uuid not null references public.departments(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (department_id, category_id)
);

create index if not exists department_categories_dept_idx
  on public.department_categories(department_id);
create index if not exists department_categories_cat_idx
  on public.department_categories(category_id);

alter table public.department_categories enable row level security;

drop policy if exists "department_categories_select" on public.department_categories;
create policy "department_categories_select"
  on public.department_categories for select
  to authenticated
  using (true);

drop policy if exists "department_categories_write_admin" on public.department_categories;
create policy "department_categories_write_admin"
  on public.department_categories for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------
-- 3. Helper: l'utente corrente può vedere questa categoria?
--    Master/admin → sempre true.
--    Guest → solo se ha la riga in user_categories.
--    Il NULL (task senza categoria) viene gestito a parte nella policy.
-- ---------------------------------------------------------------------
create or replace function public.can_view_category(cat_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when public.is_admin() then true
    when cat_id is null then true     -- task senza categoria visibili a tutti
    else exists (
      select 1 from public.user_categories
      where user_id = auth.uid() and category_id = cat_id
    )
  end;
$$;

-- ---------------------------------------------------------------------
-- 4. Aggiorno la policy SELECT su tasks per usare il filtro categorie
-- ---------------------------------------------------------------------
drop policy if exists "tasks_select_published_for_guest" on public.tasks;

create policy "tasks_select_published_for_guest"
  on public.tasks for select
  to authenticated
  using (
    public.is_admin()
    or (
      status = 'published'
      and public.can_view_category(category_id)
    )
  );

-- I commenti già passano dalla SELECT su tasks (tramite EXISTS),
-- quindi se non vedi il task non vedi nemmeno i commenti. Non tocchiamo
-- la policy comments_select_authenticated, è già coerente.

-- ---------------------------------------------------------------------
-- 5. Trigger: quando creiamo un nuovo profilo guest, copiamo le
--    categorie default del suo reparto in user_categories.
--    Master/admin non hanno bisogno (sono filtrati out dal filtro RLS).
-- ---------------------------------------------------------------------
create or replace function public.copy_department_categories_to_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Solo per i guest e solo se ha un department_id
  if new.role = 'guest' and new.department_id is not null then
    insert into public.user_categories (user_id, category_id)
    select new.id, dc.category_id
    from public.department_categories dc
    where dc.department_id = new.department_id
    on conflict do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_copy_dept_categories on public.profiles;
create trigger profiles_copy_dept_categories
  after insert on public.profiles
  for each row execute function public.copy_department_categories_to_user();

-- ---------------------------------------------------------------------
-- 6. Trigger di "sync" quando cambia il reparto di un guest:
--    se è in modalità "ereditazione automatica" gli aggiorniamo le
--    categorie. Però è opinabile: rischia di sovrascrivere customizzazioni
--    fatte dall'admin sull'utente. Quindi NON lo facciamo automaticamente.
--    Lascio commentato come riferimento per il futuro:
--
--    create or replace function public.sync_user_categories_on_dept_change() ...
--
-- L'admin, dalla pagina Utenti, può comunque cliccare un bottone
-- "Reimposta da reparto" che ricopia le categorie default. Lo gestiamo
-- frontend, non come trigger DB.
-- ---------------------------------------------------------------------

-- ---------------------------------------------------------------------
-- 7. Seed iniziale: per ora popoliamo department_categories con TUTTE
--    le categorie esistenti per OGNI reparto. In questo modo non
--    "rompiamo" il comportamento attuale (tutti vedono tutto) finché
--    l'admin non personalizza.
-- ---------------------------------------------------------------------
insert into public.department_categories (department_id, category_id)
select d.id, c.id
from public.departments d
cross join public.categories c
on conflict do nothing;

-- ---------------------------------------------------------------------
-- 8. Seed iniziale: per gli utenti GIA esistenti, copiamo le categorie
--    del loro reparto in user_categories. Senza questo, gli utenti
--    esistenti non vedrebbero più niente dopo la migration.
-- ---------------------------------------------------------------------
insert into public.user_categories (user_id, category_id)
select p.id, dc.category_id
from public.profiles p
join public.department_categories dc on dc.department_id = p.department_id
where p.role = 'guest'
on conflict do nothing;

-- ---------------------------------------------------------------------
-- 9. Forza PostgREST a ricaricare la cache
-- ---------------------------------------------------------------------
notify pgrst, 'reload schema';

-- =====================================================================
-- VERIFICHE FINALI:
--
-- -- Quante categorie ha ogni guest?
-- select p.email, p.role, count(uc.category_id) as n_categorie
-- from public.profiles p
-- left join public.user_categories uc on uc.user_id = p.id
-- group by p.id, p.email, p.role
-- order by p.role, p.email;
--
-- -- Default per reparto
-- select d.name, count(dc.category_id) as n_default
-- from public.departments d
-- left join public.department_categories dc on dc.department_id = d.id
-- group by d.id, d.name
-- order by d.position;
-- =====================================================================
