-- ════════════════════════════════════════════════════════════════════════════
-- Integritet glavne knjige:
--  1. source_id: uuid → text (zaključak godine i amortizacija koriste tekstualne ključeve)
--  2. Unique constraint na (org, source_type, source_id) — sprječava dvostruko knjiženje
--  3. Atomska numeracija naloga (sekvenca po org+godina, FOR UPDATE)
--  4. RPC post_journal_entry — nalog + stavke u JEDNOJ transakciji
--  5. Zaključavanje računovodstvenih perioda (accounting_periods + guard trigger)
--  6. RLS na cities (read-only referentni podaci)
-- ════════════════════════════════════════════════════════════════════════════

-- ─── 1. source_id uuid → text ────────────────────────────────────────────────
alter table public.journal_entries
  alter column source_id type text using source_id::text;

-- ─── 2. Unique: jedno knjiženje po izvornom dokumentu ────────────────────────
drop index if exists journal_entries_source_idx;
create unique index if not exists journal_entries_source_unique
  on public.journal_entries (organization_id, source_type, source_id)
  where source_id is not null;

-- ─── 3. Sekvence brojeva naloga po organizaciji i godini ─────────────────────
create table if not exists public.journal_entry_sequences (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  year            int  not null,
  last_number     int  not null default 0,
  primary key (organization_id, year)
);

alter table public.journal_entry_sequences enable row level security;

drop policy if exists "journal_entry_sequences_owner" on public.journal_entry_sequences;
create policy "journal_entry_sequences_owner" on public.journal_entry_sequences
  for all to authenticated
  using (organization_id in (select id from public.organizations where owner_id = (select auth.uid())))
  with check (organization_id in (select id from public.organizations where owner_id = (select auth.uid())));

-- Inicijalizacija sekvenci iz postojećih naloga (max postojeći broj po godini)
insert into public.journal_entry_sequences (organization_id, year, last_number)
select
  organization_id,
  period_year,
  max((regexp_match(entry_number, '(\d+)$'))[1]::int)
from public.journal_entries
group by organization_id, period_year
on conflict (organization_id, year)
do update set last_number = greatest(journal_entry_sequences.last_number, excluded.last_number);

-- ─── 5a. Računovodstveni periodi (zaključavanje godine GK) ───────────────────
create table if not exists public.accounting_periods (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  year            int  not null,
  status          text not null default 'open' check (status in ('open', 'closed')),
  closed_at       timestamptz,
  closed_by       uuid references auth.users(id),
  primary key (organization_id, year)
);

alter table public.accounting_periods enable row level security;

drop policy if exists "accounting_periods_owner" on public.accounting_periods;
create policy "accounting_periods_owner" on public.accounting_periods
  for all to authenticated
  using (organization_id in (select id from public.organizations where owner_id = (select auth.uid())))
  with check (organization_id in (select id from public.organizations where owner_id = (select auth.uid())));

-- ─── 5b. Guard trigger: zabrana izmjena u zaključenoj godini ─────────────────
-- Izuzetak: nalozi zaključka i otvaranja godine (source_id počinje s 'year-end-'
-- ili 'year-open-') smiju se knjižiti U TRENUTKU zatvaranja — funkcija closeYear
-- prvo knjiži naloge pa tek onda zaključava godinu, tako da guard ovdje ne smeta.
create or replace function public.journal_entries_period_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_year   int;
  v_org    uuid;
  v_status text;
begin
  v_year := coalesce(new.period_year, old.period_year);
  v_org  := coalesce(new.organization_id, old.organization_id);

  select status into v_status
  from public.accounting_periods
  where organization_id = v_org and year = v_year;

  if v_status = 'closed' then
    -- Nalog otvaranja naredne godine (knjiži se 01.01. nakon zaključka) je dozvoljen
    if tg_op = 'INSERT' and new.source_id like 'year-open-%' then
      return new;
    end if;
    raise exception 'Poslovna godina %. je zaključena — knjiženje i izmjene nisu dozvoljeni.', v_year
      using errcode = 'check_violation';
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists journal_entries_period_guard on public.journal_entries;
create trigger journal_entries_period_guard
  before insert or update or delete on public.journal_entries
  for each row execute function public.journal_entries_period_guard();

-- Guard i na stavkama (izmjena stavke naloga u zaključenoj godini)
create or replace function public.journal_lines_period_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entry_id uuid;
  v_year     int;
  v_org      uuid;
  v_status   text;
begin
  v_entry_id := coalesce(new.journal_entry_id, old.journal_entry_id);

  select period_year, organization_id into v_year, v_org
  from public.journal_entries where id = v_entry_id;

  -- Nalog ne postoji (CASCADE brisanje u toku) — pusti
  if v_year is null then
    return coalesce(new, old);
  end if;

  select status into v_status
  from public.accounting_periods
  where organization_id = v_org and year = v_year;

  if v_status = 'closed' then
    raise exception 'Poslovna godina %. je zaključena — izmjena stavki nije dozvoljena.', v_year
      using errcode = 'check_violation';
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists journal_lines_period_guard on public.journal_lines;
create trigger journal_lines_period_guard
  before insert or update or delete on public.journal_lines
  for each row execute function public.journal_lines_period_guard();

-- ─── 4. RPC: atomsko knjiženje (broj naloga + zaglavlje + stavke) ────────────
-- Sve u jednoj transakciji. Vraća id i entry_number naloga.
-- Na duplikat source_id vraća postojeći nalog s flagom skipped=true (idempotentno).
create or replace function public.post_journal_entry(
  p_org_id      uuid,
  p_user_id     uuid,
  p_entry_date  date,
  p_description text,
  p_source_type text,
  p_source_id   text,
  p_lines       jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_year         int;
  v_month        int;
  v_seq          int;
  v_entry_number text;
  v_entry_id     uuid;
  v_debit        numeric(14,2);
  v_credit       numeric(14,2);
  v_existing     record;
  l              jsonb;
  v_sort         int := 0;
begin
  -- Ovlaštenje: pozivalac mora biti vlasnik organizacije
  if not exists (
    select 1 from public.organizations
    where id = p_org_id and owner_id = auth.uid()
  ) then
    raise exception 'Nemate ovlaštenje za ovu organizaciju.' using errcode = 'insufficient_privilege';
  end if;

  v_year  := extract(year from p_entry_date);
  v_month := extract(month from p_entry_date);

  -- Idempotencija: postojeći nalog za isti izvorni dokument
  if p_source_id is not null then
    select id, entry_number into v_existing
    from public.journal_entries
    where organization_id = p_org_id
      and source_type = p_source_type
      and source_id = p_source_id;
    if found then
      return jsonb_build_object('id', v_existing.id, 'entry_number', v_existing.entry_number, 'skipped', true);
    end if;
  end if;

  -- Validacija stavki
  select
    coalesce(sum(round((x->>'debit')::numeric, 2)), 0),
    coalesce(sum(round((x->>'credit')::numeric, 2)), 0)
  into v_debit, v_credit
  from jsonb_array_elements(p_lines) x;

  if jsonb_array_length(p_lines) < 2 then
    raise exception 'Nalog mora imati najmanje dvije stavke.' using errcode = 'check_violation';
  end if;
  if v_debit <> v_credit then
    raise exception 'Nalog nije u ravnoteži: duguje % ≠ potražuje %', v_debit, v_credit
      using errcode = 'check_violation';
  end if;
  if v_debit = 0 then
    raise exception 'Iznos naloga ne može biti nula.' using errcode = 'check_violation';
  end if;

  -- Atomska numeracija (FOR UPDATE lock po org+godina)
  insert into public.journal_entry_sequences (organization_id, year, last_number)
  values (p_org_id, v_year, 0)
  on conflict (organization_id, year) do nothing;

  update public.journal_entry_sequences
  set last_number = last_number + 1
  where organization_id = p_org_id and year = v_year
  returning last_number into v_seq;

  v_entry_number := 'NAL-' || v_year || '-' || lpad(v_seq::text, 4, '0');

  insert into public.journal_entries (
    organization_id, entry_number, entry_date, period_year, period_month,
    description, source_type, source_id, posted, created_by
  ) values (
    p_org_id, v_entry_number, p_entry_date, v_year, v_month,
    coalesce(p_description, ''), p_source_type, p_source_id, true, p_user_id
  )
  returning id into v_entry_id;

  for l in select * from jsonb_array_elements(p_lines) loop
    insert into public.journal_lines (
      journal_entry_id, organization_id, account_code, account_name,
      description, debit, credit, sort_order, partner_id
    ) values (
      v_entry_id,
      p_org_id,
      l->>'account_code',
      coalesce(l->>'account_name', ''),
      l->>'description',
      round(coalesce((l->>'debit')::numeric, 0), 2),
      round(coalesce((l->>'credit')::numeric, 0), 2),
      coalesce((l->>'sort_order')::int, v_sort),
      nullif(l->>'partner_id', '')::uuid
    );
    v_sort := v_sort + 1;
  end loop;

  return jsonb_build_object('id', v_entry_id, 'entry_number', v_entry_number, 'skipped', false);
exception
  when unique_violation then
    -- Konkurentni duplikat source_id → tretiraj kao idempotentni skip
    if p_source_id is not null then
      select id, entry_number into v_existing
      from public.journal_entries
      where organization_id = p_org_id
        and source_type = p_source_type
        and source_id = p_source_id;
      if found then
        return jsonb_build_object('id', v_existing.id, 'entry_number', v_existing.entry_number, 'skipped', true);
      end if;
    end if;
    raise;
end;
$$;

revoke all on function public.post_journal_entry(uuid, uuid, date, text, text, text, jsonb) from public;
grant execute on function public.post_journal_entry(uuid, uuid, date, text, text, text, jsonb) to authenticated;

-- ─── RPC: storno naloga (obrnute stavke, izvorni nalog ostaje) ───────────────
create or replace function public.reverse_journal_entry(
  p_org_id   uuid,
  p_user_id  uuid,
  p_entry_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entry   record;
  v_lines   jsonb;
  v_result  jsonb;
begin
  if not exists (
    select 1 from public.organizations
    where id = p_org_id and owner_id = auth.uid()
  ) then
    raise exception 'Nemate ovlaštenje za ovu organizaciju.' using errcode = 'insufficient_privilege';
  end if;

  select * into v_entry
  from public.journal_entries
  where id = p_entry_id and organization_id = p_org_id;

  if not found then
    raise exception 'Nalog nije pronađen.' using errcode = 'no_data_found';
  end if;

  -- Obrnute stavke: duguje ↔ potražuje
  select jsonb_agg(jsonb_build_object(
    'account_code', account_code,
    'account_name', account_name,
    'description', 'STORNO: ' || coalesce(description, ''),
    'debit', credit,
    'credit', debit,
    'sort_order', sort_order,
    'partner_id', partner_id
  ) order by sort_order)
  into v_lines
  from public.journal_lines
  where journal_entry_id = p_entry_id;

  if v_lines is null then
    raise exception 'Nalog nema stavki.' using errcode = 'no_data_found';
  end if;

  v_result := public.post_journal_entry(
    p_org_id,
    p_user_id,
    current_date,
    'STORNO naloga ' || v_entry.entry_number || ' — ' || v_entry.description,
    'manual',
    'storno-' || p_entry_id,
    v_lines
  );

  return v_result;
end;
$$;

revoke all on function public.reverse_journal_entry(uuid, uuid, uuid) from public;
grant execute on function public.reverse_journal_entry(uuid, uuid, uuid) to authenticated;

-- ─── Nalozi bez stavki su nevažeći: dopuna balance trigera ───────────────────
-- Postojeći triger propušta nalog bez stavki (0=0). RPC to sada sprječava,
-- a za direktne INSERT-e mimo RPC-a ostaje aplikaciona provjera.

-- ─── 6. RLS na cities (read-only referentni podaci) ──────────────────────────
alter table public.cities enable row level security;

drop policy if exists "cities_read" on public.cities;
create policy "cities_read" on public.cities
  for select to authenticated, anon
  using (true);
