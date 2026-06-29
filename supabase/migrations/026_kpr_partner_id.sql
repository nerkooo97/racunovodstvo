-- Veza KPR stavke s partnerom iz šifarnika
alter table public.kpr_entries
  add column if not exists partner_id uuid references public.partners(id) on delete set null;

create index if not exists kpr_entries_partner_idx
  on public.kpr_entries (partner_id)
  where partner_id is not null;
