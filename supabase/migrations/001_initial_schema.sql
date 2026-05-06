-- =====================================================================
-- PIENISSIMO HUB — Schema completo
-- =====================================================================
-- Esegui questo file su Supabase SQL Editor (Database > SQL Editor > New query).
-- Va eseguito UNA VOLTA su un progetto pulito. Per modifiche successive,
-- crea nuove migrations numerate (es. 002_add_comments.sql).
-- =====================================================================

-- ---------------------------------------------------------------------
-- ENUM types
-- ---------------------------------------------------------------------
create type user_role as enum ('admin', 'guest');
create type department_type as enum ('marketing', 'commerciale', 'zucchetti', 'sviluppo', 'amministrazione', 'direzione');
create type task_type as enum ('release', 'aggiornamento', 'bugfix', 'guida', 'comunicazione');
create type task_status as enum ('draft', 'published', 'archived');
create type bug_status as enum ('aperto', 'in_lavorazione', 'risolto', 'wontfix');
create type bug_severity as enum ('bassa', 'media', 'alta', 'critica');

-- ---------------------------------------------------------------------
-- TABLE: profiles
-- Estende auth.users con i dati del workspace.
-- Una riga viene creata automaticamente quando si crea un utente Supabase
-- (vedi trigger handle_new_user più sotto).
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null default 'Utente',
  role user_role not null default 'guest',
  department department_type not null default 'commerciale',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_role_idx on public.profiles(role);

-- ---------------------------------------------------------------------
-- TABLE: categories
-- Categorie editoriali (es. "Frontend", "Backend", "Hardware", ecc.).
-- Diverso dal department che è il TARGET DI LETTURA del task.
-- ---------------------------------------------------------------------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  color_class text not null default 'bg-slate-500',
  description text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- TABLE: tasks
-- Il cuore del sistema: un task è un aggiornamento, un rilascio,
-- un bugfix o una guida pubblicata dagli admin.
-- ---------------------------------------------------------------------
create table public.tasks (
  id uuid primary key default gen_random_uuid(),

  -- Contenuto
  title text not null check (length(title) between 3 and 200),
  excerpt text,
  content text not null default '',

  -- Tassonomia
  type task_type not null default 'aggiornamento',
  category_id uuid references public.categories(id) on delete set null,
  version text,

  -- Targeting (ETICHETTA, non filtro: tutti i guest vedono tutto)
  -- Indica a quali reparti è UTILE questo task.
  target_departments department_type[] not null default array[]::department_type[],

  -- Stato pubblicazione
  status task_status not null default 'draft',

  -- Campi specifici per type='bugfix'
  bug_status bug_status,
  bug_severity bug_severity,

  -- Allegato esterno (Zoho WorkDrive, Drive, ecc.)
  attachment_url text check (attachment_url is null or attachment_url ~ '^https?://'),

  -- Audit
  author_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

create index tasks_status_idx on public.tasks(status);
create index tasks_type_idx on public.tasks(type);
create index tasks_category_idx on public.tasks(category_id);
create index tasks_author_idx on public.tasks(author_id);
create index tasks_created_idx on public.tasks(created_at desc);
create index tasks_published_idx on public.tasks(published_at desc);

-- ---------------------------------------------------------------------
-- TABLE: comments
-- Permette ai guest di chiedere chiarimenti sotto un task.
-- ---------------------------------------------------------------------
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  content text not null check (length(trim(content)) > 0 and length(content) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index comments_task_idx on public.comments(task_id, created_at);
create index comments_author_idx on public.comments(author_id);

-- ---------------------------------------------------------------------
-- TABLE: read_receipts
-- Traccia quali task ha letto ciascun utente (per badge "non letti").
-- ---------------------------------------------------------------------
create table public.read_receipts (
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (user_id, task_id)
);

-- ---------------------------------------------------------------------
-- TRIGGER: auto-update updated_at
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger tasks_set_updated_at before update on public.tasks
  for each row execute function public.set_updated_at();

create trigger comments_set_updated_at before update on public.comments
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- TRIGGER: published_at viene settato quando status passa a 'published'
-- ---------------------------------------------------------------------
create or replace function public.set_published_at()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'published' and (old.status is null or old.status != 'published') then
    new.published_at = now();
  end if;
  return new;
end;
$$;

create trigger tasks_set_published_at before insert or update on public.tasks
  for each row execute function public.set_published_at();

-- ---------------------------------------------------------------------
-- TRIGGER: handle_new_user
-- Quando un utente viene creato in auth.users (via Supabase Dashboard),
-- crea automaticamente la riga in public.profiles.
-- I metadata `full_name`, `role`, `department` possono essere passati
-- in fase di creazione utente.
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role, department)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'guest'),
    coalesce((new.raw_user_meta_data->>'department')::department_type, 'commerciale')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- HELPER FUNCTION: is_admin()
-- Verifica se l'utente corrente è admin. Usata nelle policy.
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
    where id = auth.uid() and role = 'admin'
  );
$$;

-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.tasks enable row level security;
alter table public.comments enable row level security;
alter table public.read_receipts enable row level security;

-- ---------- PROFILES ----------
-- SELECT: tutti gli utenti loggati possono vedere i profili (servono nei task)
create policy "profiles_select_authenticated"
  on public.profiles for select
  to authenticated
  using (true);

-- UPDATE: ognuno aggiorna sé stesso (solo full_name, avatar);
-- gli admin possono aggiornare chiunque (incluso role e department)
create policy "profiles_update_self"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    -- impedisce a un guest di promuoversi admin via auto-update
    and role = (select role from public.profiles where id = auth.uid())
    and department = (select department from public.profiles where id = auth.uid())
  );

create policy "profiles_update_admin"
  on public.profiles for update
  to authenticated
  using (public.is_admin());

-- INSERT/DELETE su profiles è gestito dal trigger su auth.users e dalla cascade.
-- Nessuna policy INSERT manuale.

-- ---------- CATEGORIES ----------
-- SELECT: tutti gli utenti loggati
create policy "categories_select_authenticated"
  on public.categories for select
  to authenticated
  using (true);

-- INSERT/UPDATE/DELETE: solo admin
create policy "categories_write_admin"
  on public.categories for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------- TASKS ----------
-- SELECT:
--   - i guest vedono solo i task 'published'
--   - gli admin vedono tutto (anche bozze e archiviati)
create policy "tasks_select_published_for_guest"
  on public.tasks for select
  to authenticated
  using (
    status = 'published' or public.is_admin()
  );

-- INSERT: solo admin (chiave di tutto)
create policy "tasks_insert_admin"
  on public.tasks for insert
  to authenticated
  with check (
    public.is_admin() and author_id = auth.uid()
  );

-- UPDATE: solo admin
create policy "tasks_update_admin"
  on public.tasks for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- DELETE: solo admin
create policy "tasks_delete_admin"
  on public.tasks for delete
  to authenticated
  using (public.is_admin());

-- ---------- COMMENTS ----------
-- SELECT: tutti gli utenti possono leggere i commenti dei task che vedono
create policy "comments_select_authenticated"
  on public.comments for select
  to authenticated
  using (
    exists (
      select 1 from public.tasks t
      where t.id = task_id
      and (t.status = 'published' or public.is_admin())
    )
  );

-- INSERT: tutti gli utenti loggati possono commentare task pubblicati
create policy "comments_insert_authenticated"
  on public.comments for insert
  to authenticated
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.tasks t
      where t.id = task_id and t.status = 'published'
    )
  );

-- UPDATE: solo l'autore del commento, solo entro 15 minuti dalla creazione
create policy "comments_update_author"
  on public.comments for update
  to authenticated
  using (
    author_id = auth.uid()
    and created_at > now() - interval '15 minutes'
  )
  with check (author_id = auth.uid());

-- DELETE: l'autore (sempre) o gli admin
create policy "comments_delete_author_or_admin"
  on public.comments for delete
  to authenticated
  using (author_id = auth.uid() or public.is_admin());

-- ---------- READ RECEIPTS ----------
-- Ognuno gestisce solo le proprie ricevute di lettura
create policy "read_receipts_own"
  on public.read_receipts for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- =====================================================================
-- SEED DATI INIZIALI
-- =====================================================================
insert into public.categories (name, color_class, description) values
  ('Frontend', 'bg-blue-500', 'Modifiche all''interfaccia utente'),
  ('Backend', 'bg-purple-500', 'Modifiche al server, API, database'),
  ('Hardware', 'bg-amber-500', 'Aggiornamenti firmware, driver, periferiche'),
  ('Documentazione', 'bg-slate-500', 'Guide, manuali, procedure interne'),
  ('Critico', 'bg-red-500', 'Bugfix urgenti e incident report')
on conflict (name) do nothing;

-- =====================================================================
-- IMPORTANTE: come creare il PRIMO ADMIN
-- =====================================================================
-- Dopo aver eseguito questo file:
--
-- 1. Vai su Supabase Dashboard > Authentication > Users > Add user
--    Inserisci email e password, e in "Auto Confirm User" seleziona Yes.
--
-- 2. Ritorna qui nel SQL Editor ed esegui (sostituendo l'email):
--
--    update public.profiles
--    set role = 'admin', full_name = 'Nicola', department = 'sviluppo'
--    where email = 'tu@pienissimo.it';
--
-- Dopodiché potrai creare gli altri utenti dal pannello /admin/users
-- dell'applicazione (richiede l'Edge Function admin-create-user).
-- =====================================================================
