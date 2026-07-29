-- ============================================================
-- MangaVerse — Supabase schema
-- Run this once in the Supabase Dashboard → SQL Editor.
-- Safe to re-run (uses IF NOT EXISTS / CREATE OR REPLACE).
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- profiles (1:1 with auth.users) ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text not null default '',
  is_admin boolean not null default false,
  is_banned boolean not null default false,
  upload_count integer not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- mangas ----------
create table if not exists public.mangas (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  cover_url text not null default '',
  genres text[] not null default '{}',
  status text not null default 'ongoing' check (status in ('ongoing','completed','hiatus')),
  author text not null default '',
  artist text default '',
  views integer not null default 0,
  rating numeric default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- chapters ----------
create table if not exists public.chapters (
  id uuid primary key default gen_random_uuid(),
  manga_id uuid not null references public.mangas(id) on delete cascade,
  number numeric not null,
  title text not null default '',
  pages text[] not null default '{}',
  file_type text not null default 'images' check (file_type in ('images','pdf')),
  pdf_url text,
  uploaded_by uuid references auth.users(id) on delete set null,
  uploader_email text,
  status text not null default 'pending' check (status in ('pending','published','rejected')),
  views integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists chapters_manga_id_idx on public.chapters(manga_id);
create index if not exists chapters_status_idx on public.chapters(status);

-- ---------- auto-create profile row when a user signs up ----------
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name, is_admin, is_banned, upload_count)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    false,
    false,
    0
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- keep profiles.email_verified-ish state in sync isn't needed:
-- email confirmation lives on auth.users.email_confirmed_at, read directly
-- by the app via the session, no mirrored column required.

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.profiles enable row level security;
alter table public.mangas enable row level security;
alter table public.chapters enable row level security;

-- profiles: users can read/update their own row only.
-- (Admin listing of ALL users goes through the server API route, which
-- uses a direct Postgres connection and bypasses RLS after verifying
-- the caller is an admin.)
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- mangas: publicly readable, writes only via the privileged server API.
drop policy if exists "mangas_select_public" on public.mangas;
create policy "mangas_select_public" on public.mangas
  for select using (true);

-- chapters: published chapters are public; a logged-in user can also see
-- their own pending/rejected chapters. Inserts are allowed directly from
-- the client (upload page) but only as their own, forced to 'pending'.
drop policy if exists "chapters_select_published_or_own" on public.chapters;
create policy "chapters_select_published_or_own" on public.chapters
  for select using (status = 'published' or uploaded_by = auth.uid());

drop policy if exists "chapters_insert_own_pending" on public.chapters;
create policy "chapters_insert_own_pending" on public.chapters
  for insert with check (uploaded_by = auth.uid() and status = 'pending');

-- ============================================================
-- Done. Next steps:
--   1. Run this whole file in Supabase SQL Editor.
--   2. Create your admin user — see supabase/create_admin.sql
-- ============================================================
