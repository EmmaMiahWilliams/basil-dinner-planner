-- Basil supervised pilot: one row per participant holding their latest pilot export.
-- Run once in the Supabase SQL editor (Project > SQL Editor > New query > paste > Run).

create table if not exists public.pilot_exports (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  participant_id text not null,
  export jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.pilot_exports enable row level security;

-- Participants can only see, write and delete their own row. Nobody can read anyone else's.
-- The Product Manager reads every row with the service-role key (scripts/pull-pilot.ts), which bypasses RLS.
drop policy if exists "own row: select" on public.pilot_exports;
drop policy if exists "own row: insert" on public.pilot_exports;
drop policy if exists "own row: update" on public.pilot_exports;
drop policy if exists "own row: delete" on public.pilot_exports;
create policy "own row: select" on public.pilot_exports for select to authenticated using (user_id = auth.uid());
create policy "own row: insert" on public.pilot_exports for insert to authenticated with check (user_id = auth.uid());
create policy "own row: update" on public.pilot_exports for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own row: delete" on public.pilot_exports for delete to authenticated using (user_id = auth.uid());
