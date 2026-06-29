-- ════════════════════════════════════════════════════════════════════════════
-- e-KIF / e-KUF — knjigovodstvene evidencije po UIO BiH
-- Uputa SG 83/19 + Tehničko uputstvo UIO (tipovi dokumenata 01–09, izmjene 2023)
-- ════════════════════════════════════════════════════════════════════════════

-- ─── Porezni periodi (zaključavanje) ────────────────────────────────────────
create table if not exists public.pdv_periods (
  id                uuid        primary key default gen_random_uuid(),
  organization_id   uuid        not null references public.organizations(id) on delete cascade,
  year              int         not null,
  month             int         not null check (month between 1 and 12),

  status            text        not null default 'open'
                                check (status in ('open', 'locked', 'submitted')),

  locked_at         timestamptz,
  locked_by         uuid        references auth.users(id),
  submitted_at      timestamptz,

  kif_file_seq      int         not null default 1,
  kuf_file_seq      int         not null default 1,
  kif_exported_at   timestamptz,
  kuf_exported_at   timestamptz,

  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  unique (organization_id, year, month)
);

create index pdv_periods_org_idx
  on public.pdv_periods (organization_id, year desc, month desc);

-- ─── Ulazni računi (dobavljači) — izvor za KUF ───────────────────────────────
create table if not exists public.purchase_invoices (
  id                      uuid        primary key default gen_random_uuid(),
  organization_id         uuid        not null references public.organizations(id) on delete cascade,
  partner_id              uuid        references public.partners(id) on delete set null,

  uio_document_type       text        not null default '01',

  -- Snapshot dobavljača (immutable nakon knjiženja)
  supplier_name           text        not null,
  supplier_address        text,
  supplier_vat_id         text,       -- 12 cifara UIO ID
  supplier_jib            text,       -- 13 cifara
  supplier_is_vat_obligor boolean     not null default true,

  supplier_invoice_number text        not null,
  supplier_invoice_date   date        not null,
  receipt_date            date        not null,

  -- Finansije
  amount_without_vat      numeric(14,2) not null default 0,
  amount_with_vat         numeric(14,2) not null default 0,
  amount_flat_fee         numeric(14,2) not null default 0,  -- paušal poljoprivrednik
  vat_input_total         numeric(14,2) not null default 0,

  -- Odbitnost
  is_deductible           boolean     not null default true,
  deductible_percent      numeric(5,2) not null default 100.00,
  non_deductible_reason   text,       -- representation | vehicle | mixed | private | other

  -- JCI (uvoz)
  jci_number              text,
  jci_date                date,

  attachment_url          text,       -- sken originalne fakture / JCI
  notes                   text,

  status                  text        not null default 'posted'
                                      check (status in ('draft', 'posted', 'cancelled')),
  ledger_entry_id         uuid,       -- veza na pdv_ledger_entries (postavlja se nakon knjiženja)

  created_by              uuid        references auth.users(id),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index purchase_invoices_org_idx
  on public.purchase_invoices (organization_id, receipt_date desc);

create index purchase_invoices_partner_idx
  on public.purchase_invoices (partner_id)
  where partner_id is not null;

-- ─── Glavna evidencija (canonical ledger za export) ──────────────────────────
create table if not exists public.pdv_ledger_entries (
  id                      uuid        primary key default gen_random_uuid(),
  organization_id         uuid        not null references public.organizations(id) on delete cascade,

  record_type             text        not null check (record_type in ('kif', 'kuf')),
  period_year             int         not null,
  period_month            int         not null check (period_month between 1 and 12),
  serial_number           int         not null,                 -- redni broj u knjizi (1..N)

  uio_document_type       text        not null default '01',    -- '01'..'09'
  document_number         text        not null,                 -- broj fakture / JCI / interni
  document_date           date        not null,                 -- datum fakture ili JCI
  receipt_date            date,                                  -- KUF: datum prijema/evidentiranja

  -- Partner snapshot (immutable)
  partner_id              uuid        references public.partners(id) on delete set null,
  partner_name            text        not null,
  partner_address         text,
  partner_vat_id          text,       -- 12 cifara (PDV broj)
  partner_jib             text,       -- 13 cifara (JIB/PIB)
  partner_kind            text        not null default 'domestic_vat'
                                      check (partner_kind in (
                                        'domestic_vat',     -- PDV obveznik BiH
                                        'domestic_jib',     -- ima JIB, nije PDV obveznik
                                        'foreign',          -- strani (izvoz/uvoz roba)
                                        'import_customs',   -- UIO / carina (JCI uvoz)
                                        'individual'        -- fizičko lice
                                      )),

  -- ── KIF finansijska polja (UIO isporuke, kolone 11–21) ──
  kif_amount_total        numeric(14,2) not null default 0,  -- 11 ukupan iznos
  kif_amount_internal     numeric(14,2) not null default 0,  -- 12 interna/vanposlovna
  kif_amount_export       numeric(14,2) not null default 0,  -- 13 izvoz (JCI)
  kif_amount_exempt       numeric(14,2) not null default 0,  -- 14 ostalo oslobođeno
  kif_base_registered     numeric(14,2) not null default 0,  -- 15 osnovica → PDV obveznik
  kif_vat_registered      numeric(14,2) not null default 0,  -- 16 izlazni PDV → obveznik
  kif_base_unregistered   numeric(14,2) not null default 0,  -- 17 osnovica → neobveznik
  kif_vat_unregistered    numeric(14,2) not null default 0,  -- 18 izlazni PDV → neobveznik

  -- ── KUF finansijska polja (UIO nabavke, kolone 12–17) ──
  kuf_amount_without_vat  numeric(14,2) not null default 0,  -- 12 iznos bez PDV
  kuf_amount_with_vat     numeric(14,2) not null default 0,  -- 13 iznos sa PDV
  kuf_flat_fee            numeric(14,2) not null default 0,  -- 14 paušalna naknada
  kuf_vat_input_total     numeric(14,2) not null default 0,  -- 15 ulazni PDV ukupno
  kuf_vat_deductible      numeric(14,2) not null default 0,  -- 16 ulazni PDV odbitni
  kuf_vat_non_deductible  numeric(14,2) not null default 0,  -- 17 ulazni PDV neodbitni

  -- ── Mapiranje na polja PDV prijave (32/33/34) — zajedničko ──
  field_32                numeric(14,2) not null default 0,
  field_33                numeric(14,2) not null default 0,
  field_34                numeric(14,2) not null default 0,

  -- Odbitnost (KUF)
  is_deductible           boolean     not null default true,
  deductible_percent      numeric(5,2) not null default 100.00,

  -- Veze
  source_type             text        not null default 'manual'
                                      check (source_type in (
                                        'invoice_out',  -- izlazna faktura
                                        'invoice_cn',   -- knjižna obavijest (storno)
                                        'purchase',     -- ulazni račun
                                        'jci',          -- carinska deklaracija
                                        'internal',     -- interna potrošnja
                                        'bank',         -- iz bankovne transakcije
                                        'manual'        -- ručni unos
                                      )),
  source_id               uuid,
  related_entry_id        uuid        references public.pdv_ledger_entries(id) on delete set null,

  status                  text        not null default 'posted'
                                      check (status in ('draft', 'posted', 'locked')),
  notes                   text,

  created_by              uuid        references auth.users(id),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),

  unique (organization_id, record_type, period_year, period_month, serial_number)
);

create index pdv_ledger_period_idx
  on public.pdv_ledger_entries (organization_id, record_type, period_year, period_month, serial_number);

create index pdv_ledger_source_idx
  on public.pdv_ledger_entries (source_type, source_id)
  where source_id is not null;

-- ─── Proširenje partnera ─────────────────────────────────────────────────────
alter table public.partners
  add column if not exists partner_category text
    check (partner_category in ('domestic_company', 'foreign', 'individual', 'uio_customs')),
  add column if not exists default_vat_treatment text;

-- ─── Proširenje izlaznih faktura ────────────────────────────────────────────
alter table public.invoices
  add column if not exists sale_category text
    check (sale_category in (
      'domestic_b2b',     -- PDV obveznik (osnovica + PDV)
      'domestic_b2c',     -- neobveznik / građanin
      'export_goods',     -- izvoz robe (JCI)
      'export_services',  -- usluge stranom licu
      'exempt',           -- oslobođeno bez prava na odbitak
      'internal_use'      -- vlastita / vanposlovna potrošnja
    )),
  add column if not exists tax_point_date date,   -- datum isporuke za porezni period
  add column if not exists jci_number     text,   -- izvoz
  add column if not exists jci_date       date;

-- ════════════════════════════════════════════════════════════════════════════
-- RLS — owner-based (isti obrazac kao ostatak baze)
-- ════════════════════════════════════════════════════════════════════════════

alter table public.pdv_periods         enable row level security;
alter table public.purchase_invoices   enable row level security;
alter table public.pdv_ledger_entries  enable row level security;

create policy "pdv_periods_owner" on public.pdv_periods
  for all to authenticated
  using (organization_id in (select id from public.organizations where owner_id = (select auth.uid())))
  with check (organization_id in (select id from public.organizations where owner_id = (select auth.uid())));

create policy "purchase_invoices_owner" on public.purchase_invoices
  for all to authenticated
  using (organization_id in (select id from public.organizations where owner_id = (select auth.uid())))
  with check (organization_id in (select id from public.organizations where owner_id = (select auth.uid())));

create policy "pdv_ledger_entries_owner" on public.pdv_ledger_entries
  for all to authenticated
  using (organization_id in (select id from public.organizations where owner_id = (select auth.uid())))
  with check (organization_id in (select id from public.organizations where owner_id = (select auth.uid())));

-- ════════════════════════════════════════════════════════════════════════════
-- Zaštita zaključanog perioda: zabrana izmjene/brisanja stavki u locked periodu
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.pdv_ledger_guard_locked()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_period_status text;
  v_org  uuid;
  v_year int;
  v_month int;
begin
  -- Za DELETE koristimo OLD, za INSERT/UPDATE koristimo NEW
  if (tg_op = 'DELETE') then
    v_org := old.organization_id; v_year := old.period_year; v_month := old.period_month;
  else
    v_org := new.organization_id; v_year := new.period_year; v_month := new.period_month;
  end if;

  select status into v_period_status
  from public.pdv_periods
  where organization_id = v_org and year = v_year and month = v_month;

  if v_period_status in ('locked', 'submitted') then
    raise exception 'Porezni period %.% je zaključan i ne može se mijenjati.', v_month, v_year
      using errcode = 'check_violation';
  end if;

  if (tg_op = 'DELETE') then
    return old;
  end if;
  return new;
end;
$$;

create trigger pdv_ledger_guard
  before insert or update or delete on public.pdv_ledger_entries
  for each row execute function public.pdv_ledger_guard_locked();

-- ─── Migracija postojećih pdv_records (ako ima podataka) ─────────────────────
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'pdv_records'
  ) then
    insert into public.pdv_ledger_entries (
      organization_id, record_type, period_year, period_month, serial_number,
      uio_document_type, document_number, document_date,
      partner_name, partner_jib, partner_vat_id,
      kif_amount_total, kif_base_registered, kif_vat_registered,
      kuf_amount_with_vat, kuf_vat_input_total, kuf_vat_deductible,
      source_type, source_id
    )
    select
      r.organization_id,
      r.record_type,
      r.period_year,
      r.period_month,
      row_number() over (
        partition by r.organization_id, r.record_type, r.period_year, r.period_month
        order by r.entry_date, r.created_at
      )::int,
      '01',
      coalesce(r.document_number, '—'),
      r.entry_date,
      coalesce(r.partner_name, '—'),
      r.partner_tax_id,
      null,
      case when r.record_type = 'kif' then coalesce(r.total, 0) else 0 end,
      case when r.record_type = 'kif' then coalesce(r.base_17, 0) else 0 end,
      case when r.record_type = 'kif' then coalesce(r.vat_17, 0) else 0 end,
      case when r.record_type = 'kuf' then coalesce(r.total, 0) else 0 end,
      case when r.record_type = 'kuf' then coalesce(r.vat_17, 0) else 0 end,
      case when r.record_type = 'kuf' then coalesce(r.vat_17, 0) else 0 end,
      case when r.invoice_id is not null then 'invoice_out' else 'manual' end,
      r.invoice_id
    from public.pdv_records r
    on conflict (organization_id, record_type, period_year, period_month, serial_number)
      do nothing;
  end if;
end $$;
