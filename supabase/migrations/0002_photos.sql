-- ===========================================================================
-- Scrapbook — Stage B, migration 0002: personal photos per entry
-- Run this once in the Supabase Dashboard → SQL Editor (after 0001).
-- Idempotent: safe to re-run.
--
-- `image_url` keeps the metadata poster (the entry's main look). `photos`
-- holds the user's own shots, shown in the entry detail gallery.
-- ===========================================================================

alter table public.activity_entries
  add column if not exists photos jsonb not null default '[]'::jsonb;
