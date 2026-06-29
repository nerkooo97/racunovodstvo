-- ════════════════════════════════════════════════════════════════════════════
-- Glavna knjiga / dvojno knjigovodstvo (d.o.o.)
-- Kontni plan + nalozi za knjiženje (dnevnik) + automatska knjiženja
-- ════════════════════════════════════════════════════════════════════════════

-- ─── Kontni plan ─────────────────────────────────────────────────────────────
create table if not exists public.chart_of_accounts (
  id              uuid        primary key default gen_random_uuid(),
  organization_id uuid        not null references public.organizations(id) on delete cascade,
  code            text        not null,
  name            text        not null,
  account_class   int         not null check (account_class between 0 and 9),
  account_type    text        not null
                              check (account_type in ('asset', 'liability', 'equity', 'income', 'expense', 'offbalance')),
  parent_code     text,
  is_synthetic    boolean     not null default false, -- sintetički (grupni) konto, ne knjiži se direktno
  is_active       boolean     not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  unique (organization_id, code)
);

create index if not exists chart_of_accounts_org_idx
  on public.chart_of_accounts (organization_id, code);

-- ─── Nalozi za knjiženje (dnevnik) ───────────────────────────────────────────
create table if not exists public.journal_entries (
  id              uuid        primary key default gen_random_uuid(),
  organization_id uuid        not null references public.organizations(id) on delete cascade,

  entry_number    text        not null,
  entry_date      date        not null,
  period_year     int         not null,
  period_month    int         not null check (period_month between 1 and 12),

  description     text        not null default '',

  source_type     text        not null default 'manual'
                              check (source_type in (
                                'manual',
                                'invoice_out',
                                'invoice_cn',
                                'purchase',
                                'jci',
                                'salary',
                                'bank',
                                'retail'
                              )),
  source_id       uuid,

  posted          boolean     not null default true,

  created_by      uuid        references auth.users(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  unique (organization_id, entry_number)
);

create index if not exists journal_entries_org_idx
  on public.journal_entries (organization_id, period_year desc, period_month desc);

create index if not exists journal_entries_source_idx
  on public.journal_entries (source_type, source_id)
  where source_id is not null;

-- ─── Stavke naloga (duguje / potražuje) ──────────────────────────────────────
create table if not exists public.journal_lines (
  id                uuid        primary key default gen_random_uuid(),
  journal_entry_id  uuid        not null references public.journal_entries(id) on delete cascade,
  organization_id   uuid        not null references public.organizations(id) on delete cascade,

  account_code      text        not null,
  account_name      text        not null default '',
  description       text,
  debit             numeric(14,2) not null default 0 check (debit >= 0),
  credit            numeric(14,2) not null default 0 check (credit >= 0),
  sort_order        int         not null default 0,

  created_at        timestamptz not null default now()
);

create index if not exists journal_lines_entry_idx
  on public.journal_lines (journal_entry_id, sort_order);

create index if not exists journal_lines_account_idx
  on public.journal_lines (organization_id, account_code);

-- ════════════════════════════════════════════════════════════════════════════
-- RLS — owner-based
-- ════════════════════════════════════════════════════════════════════════════
alter table public.chart_of_accounts enable row level security;
alter table public.journal_entries   enable row level security;
alter table public.journal_lines     enable row level security;

drop policy if exists "chart_of_accounts_owner" on public.chart_of_accounts;
create policy "chart_of_accounts_owner" on public.chart_of_accounts
  for all to authenticated
  using (organization_id in (select id from public.organizations where owner_id = (select auth.uid())))
  with check (organization_id in (select id from public.organizations where owner_id = (select auth.uid())));

drop policy if exists "journal_entries_owner" on public.journal_entries;
create policy "journal_entries_owner" on public.journal_entries
  for all to authenticated
  using (organization_id in (select id from public.organizations where owner_id = (select auth.uid())))
  with check (organization_id in (select id from public.organizations where owner_id = (select auth.uid())));

drop policy if exists "journal_lines_owner" on public.journal_lines;
create policy "journal_lines_owner" on public.journal_lines
  for all to authenticated
  using (organization_id in (select id from public.organizations where owner_id = (select auth.uid())))
  with check (organization_id in (select id from public.organizations where owner_id = (select auth.uid())));

-- ════════════════════════════════════════════════════════════════════════════
-- Kontrola ravnoteže naloga: zbroj duguje = zbroj potražuje (kad je proknjižen)
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.journal_entry_assert_balanced()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entry_id uuid;
  v_debit    numeric(14,2);
  v_credit   numeric(14,2);
  v_posted   boolean;
begin
  v_entry_id := coalesce(new.journal_entry_id, old.journal_entry_id);

  select posted into v_posted from public.journal_entries where id = v_entry_id;
  if v_posted is distinct from true then
    return coalesce(new, old);
  end if;

  select coalesce(sum(debit), 0), coalesce(sum(credit), 0)
    into v_debit, v_credit
  from public.journal_lines
  where journal_entry_id = v_entry_id;

  if round(v_debit, 2) <> round(v_credit, 2) then
    raise exception 'Nalog za knjiženje nije u ravnoteži: duguje % ≠ potražuje %', v_debit, v_credit
      using errcode = 'check_violation';
  end if;

  return coalesce(new, old);
end;
$$;

-- Provjera se izvršava nakon izmjene stavki (constraint trigger, deferred-friendly).
drop trigger if exists journal_lines_balance_check on public.journal_lines;
create constraint trigger journal_lines_balance_check
  after insert or update or delete on public.journal_lines
  deferrable initially deferred
  for each row execute function public.journal_entry_assert_balanced();
