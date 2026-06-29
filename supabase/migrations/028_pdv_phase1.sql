-- ════════════════════════════════════════════════════════════════════════════
-- PDV faza 1: razlaganje po stavkama, avansi, sken ulaznih računa
-- ════════════════════════════════════════════════════════════════════════════

-- ─── Kategorija PDV-a po stavci fakture (miješane stope/oslobođenja) ─────────
alter table public.invoice_items
  add column if not exists sale_category text
    check (sale_category in (
      'domestic_b2b',
      'domestic_b2c',
      'export_goods',
      'export_services',
      'exempt',
      'internal_use'
    ));

-- ─── Veza avansne i konačne fakture (zatvaranje avansa) ──────────────────────
alter table public.invoices
  add column if not exists advance_for_invoice_id uuid
    references public.invoices(id) on delete set null;

create index if not exists invoices_advance_for_idx
  on public.invoices (advance_for_invoice_id)
  where advance_for_invoice_id is not null;

-- Novi izvor stavke: zatvaranje avansa (negativni storno avansa na konačnoj fakturi)
alter table public.pdv_ledger_entries
  drop constraint if exists pdv_ledger_entries_source_type_check;

alter table public.pdv_ledger_entries
  add constraint pdv_ledger_entries_source_type_check
  check (source_type in (
    'invoice_out',
    'invoice_cn',
    'purchase',
    'jci',
    'internal',
    'retail',
    'bank',
    'manual',
    'advance_close'
  ));

-- ─── Storage bucket za skenove ulaznih računa / JCI ──────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'purchase-attachments',
  'purchase-attachments',
  false,
  10485760, -- 10 MB
  array['application/pdf', 'image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do nothing;

-- Vlasnik organizacije ima pun pristup svojim skenovima (prvi folder = org id).
drop policy if exists "purchase_attachments_select" on storage.objects;
create policy "purchase_attachments_select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'purchase-attachments'
    and (storage.foldername(name))[1] in (
      select id::text from public.organizations where owner_id = (select auth.uid())
    )
  );

drop policy if exists "purchase_attachments_insert" on storage.objects;
create policy "purchase_attachments_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'purchase-attachments'
    and (storage.foldername(name))[1] in (
      select id::text from public.organizations where owner_id = (select auth.uid())
    )
  );

drop policy if exists "purchase_attachments_update" on storage.objects;
create policy "purchase_attachments_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'purchase-attachments'
    and (storage.foldername(name))[1] in (
      select id::text from public.organizations where owner_id = (select auth.uid())
    )
  );

drop policy if exists "purchase_attachments_delete" on storage.objects;
create policy "purchase_attachments_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'purchase-attachments'
    and (storage.foldername(name))[1] in (
      select id::text from public.organizations where owner_id = (select auth.uid())
    )
  );
