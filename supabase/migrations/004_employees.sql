create table public.employees (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid null, -- FK → clients.id dodat u 013_clients.sql

  -- Lični podaci
  first_name text not null,
  last_name text not null,
  maiden_name text null,
  jmbg text not null,
  date_of_birth date null,
  gender text check (gender in ('M', 'F')),
  email text null,

  -- Adresa (određuje gdje ide porez na dohodak)
  address text null,
  city text null,
  municipality text null,
  municipality_code text null,
  canton text null,

  -- Kvalifikacije (za JS3100)
  education_level text null,
  occupation_name text null,
  occupation_code text null,

  -- Osnov osiguranja (za JS3100)
  insurance_basis_name text null,
  insurance_basis_code text null,
  payment_basis_name text null,
  payment_basis_code text null,

  -- Radno mjesto
  job_title text null,
  job_position_code text null,
  work_hours_per_day int default 8,
  work_minutes_per_day int default 0,
  weekly_hours int default 40,

  -- Plata
  gross_salary numeric(12,2) null,
  net_salary numeric(12,2) null,
  salary_type text default 'net_contract'
    check (salary_type in ('target_net', 'net_contract', 'gross_base')),
  tax_coefficient numeric(5,2) default 1.00,

  -- Bankovni račun radnika
  bank_account text null,
  bank_name text null,

  -- Datumi
  hire_date date not null,
  termination_date date null,

  -- Ugovor
  contract_type text default 'indefinite'
    check (contract_type in ('indefinite', 'fixed')),
  contract_end_date date null,
  probation boolean default false,
  probation_end_date date null,
  notice_period text default '30 dana',

  -- Status
  status text default 'active'
    check (status in ('active', 'terminated', 'probation')),
  is_owner boolean default false,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index on public.employees (organization_id);
create index on public.employees (organization_id, status);

alter table public.employees enable row level security;

create policy "Korisnik vidi vlastite radnike"
  on public.employees for select
  using (
    organization_id in (
      select id from public.organizations where owner_id = auth.uid()
    )
  );

create policy "Korisnik može dodavati radnike"
  on public.employees for insert
  with check (
    organization_id in (
      select id from public.organizations where owner_id = auth.uid()
    )
  );

create policy "Korisnik može ažurirati vlastite radnike"
  on public.employees for update
  using (
    organization_id in (
      select id from public.organizations where owner_id = auth.uid()
    )
  );

create policy "Korisnik može brisati vlastite radnike"
  on public.employees for delete
  using (
    organization_id in (
      select id from public.organizations where owner_id = auth.uid()
    )
  );
