-- Deepika Studio ERP: Supabase database
-- Run once in Supabase Dashboard > SQL Editor.
create table if not exists public.ledger_entries (
  id text not null,
  kind text not null check (kind in ('booking','daily')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (id, kind)
);
create index if not exists ledger_entries_kind_created_idx
  on public.ledger_entries (kind, created_at desc);

alter table public.ledger_entries enable row level security;
revoke all on public.ledger_entries from anon;
grant select, insert, update, delete on public.ledger_entries to authenticated;

drop policy if exists "Authenticated users can read ERP entries" on public.ledger_entries;
create policy "ERP owner and staff can read entries"
  on public.ledger_entries for select to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'erp_role') in ('owner','staff'));

drop policy if exists "Authenticated users can insert ERP entries" on public.ledger_entries;
create policy "Owner and staff can insert allowed entries"
  on public.ledger_entries for insert to authenticated
  with check (
    (auth.jwt() -> 'app_metadata' ->> 'erp_role') = 'owner'
    or (auth.jwt() -> 'app_metadata' ->> 'erp_role') = 'staff'
  );

drop policy if exists "Authenticated users can update ERP entries" on public.ledger_entries;
create policy "Owner and staff can update allowed entries"
  on public.ledger_entries for update to authenticated
  using (
    (auth.jwt() -> 'app_metadata' ->> 'erp_role') = 'owner'
    or (auth.jwt() -> 'app_metadata' ->> 'erp_role') = 'staff'
  )
  with check (
    (auth.jwt() -> 'app_metadata' ->> 'erp_role') = 'owner'
    or (auth.jwt() -> 'app_metadata' ->> 'erp_role') = 'staff'
  );

drop policy if exists "Authenticated users can delete ERP entries" on public.ledger_entries;
create policy "Only owner can delete ERP entries"
  on public.ledger_entries for delete to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'erp_role') = 'owner');

-- Create the owner account manually in Authentication > Users > Add user.
-- Use the owner's email and a strong password. Set app_metadata to {"erp_role":"owner"}.
-- Staff Auth users must have app_metadata {"erp_role":"staff"}.
-- app_metadata must be assigned by an administrator, never by the browser.
-- Do NOT expose service_role key in frontend.
