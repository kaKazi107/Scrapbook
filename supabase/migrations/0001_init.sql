-- ===========================================================================
-- Scrapbook — Stage B schema (Supabase / Postgres)
-- Run this once in the Supabase Dashboard → SQL Editor.
-- Idempotent: safe to re-run.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Profiles (one row per auth user)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Catalog items (shared, deduplicated metadata from iTunes / TVMaze / OSM)
-- ---------------------------------------------------------------------------
create table if not exists public.catalog_items (
  id uuid primary key default gen_random_uuid(),
  external_source text not null,
  external_id text not null,
  category text not null,
  title text not null,
  subtitle text,
  image_url text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (external_source, external_id)
);

-- ---------------------------------------------------------------------------
-- Activity entries (per-user memories; local_id maps back to the phone row)
-- ---------------------------------------------------------------------------
create table if not exists public.activity_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  local_id text not null,
  category text not null,
  title text not null,
  subtitle text,
  logged_date date not null,
  logged_time text,
  rating real,
  note text,
  image_url text,
  is_cover boolean not null default false,
  external_id text,
  external_source text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, local_id)
);

create index if not exists idx_activity_entries_user_date
  on public.activity_entries (user_id, logged_date desc);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.catalog_items enable row level security;
alter table public.activity_entries enable row level security;

-- profiles: a user can only read/write their own row
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- catalog_items: any signed-in user can read and contribute
drop policy if exists "catalog_select_auth" on public.catalog_items;
create policy "catalog_select_auth" on public.catalog_items
  for select to authenticated using (true);

drop policy if exists "catalog_insert_auth" on public.catalog_items;
create policy "catalog_insert_auth" on public.catalog_items
  for insert to authenticated with check (true);

-- activity_entries: strictly owner-scoped
drop policy if exists "entries_select_own" on public.activity_entries;
create policy "entries_select_own" on public.activity_entries
  for select using (auth.uid() = user_id);

drop policy if exists "entries_insert_own" on public.activity_entries;
create policy "entries_insert_own" on public.activity_entries
  for insert with check (auth.uid() = user_id);

drop policy if exists "entries_update_own" on public.activity_entries;
create policy "entries_update_own" on public.activity_entries
  for update using (auth.uid() = user_id);

drop policy if exists "entries_delete_own" on public.activity_entries;
create policy "entries_delete_own" on public.activity_entries
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Auto-create a profile row whenever a new auth user signs up
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Storage bucket for entry photos (public read; owner-scoped writes)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('entry-images', 'entry-images', true)
on conflict (id) do nothing;

drop policy if exists "entry_images_read" on storage.objects;
create policy "entry_images_read" on storage.objects
  for select using (bucket_id = 'entry-images');

drop policy if exists "entry_images_insert" on storage.objects;
create policy "entry_images_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'entry-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "entry_images_update" on storage.objects;
create policy "entry_images_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'entry-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "entry_images_delete" on storage.objects;
create policy "entry_images_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'entry-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
