create table public.salary_periods (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid null,
  year int not null,
  month int not null check (month between 1 and 12),
  payment_date date null,
  status text default 'calculated'
    check (status in ('calculated', 'paid', 'cancelled')),
  note text null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (organization_id, year, month)
);

create table public.salary_items (
  id uuid primary key default gen_random_uuid(),
  period_id uuid not null references public.salary_periods(id) on delete cascade,
  employee_id uuid not null references public.employees(id),

  -- Sati
  hours_worked numeric(6,2) default 0,
  hours_overtime numeric(6,2) default 0,
  hours_night numeric(6,2) default 0,
  hours_sunday numeric(6,2) default 0,
  hours_holiday numeric(6,2) default 0,
  hours_sick_leave numeric(6,2) default 0,
  hours_annual_leave numeric(6,2) default 0,
  hours_total_fund numeric(6,2) default 0,

  -- Bruto i koeficijent
  gross_salary numeric(12,2) not null,
  tax_coefficient numeric(5,2) default 1.00,

  -- Doprinosi IZ plaće (radnik)
  pension_contribution numeric(12,2),
  health_contribution numeric(12,2),
  unemployment_contribution numeric(12,2),
  total_contributions_from numeric(12,2),

  -- Porez na dohodak
  tax_base numeric(12,2),
  personal_deduction numeric(12,2),
  taxable_base numeric(12,2),
  income_tax numeric(12,2),

  -- Neto
  net_salary numeric(12,2),

  -- Neoporezivi dodaci
  meal_allowance numeric(12,2) default 0,
  holiday_allowance numeric(12,2) default 0,
  transport_allowance numeric(12,2) default 0,
  other_allowances numeric(12,2) default 0,
  total_payment numeric(12,2),

  -- Doprinosi NA bruto (poslodavac)
  pension_contribution_on numeric(12,2),
  health_contribution_on numeric(12,2),
  unemployment_contribution_on numeric(12,2),
  water_contribution numeric(12,2),
  disaster_contribution numeric(12,2),
  disability_fund numeric(12,2) default 0,
  total_employer_cost numeric(12,2),

  -- Lokacija za porez (snapshot u trenutku obračuna)
  municipality_name text,
  municipality_code text,
  canton text,

  created_at timestamptz default now()
);

create index on public.salary_periods (organization_id);
create index on public.salary_items (period_id);
create index on public.salary_items (employee_id);

alter table public.salary_periods enable row level security;
alter table public.salary_items enable row level security;

create policy "Korisnik vidi vlastite periode"
  on public.salary_periods for all
  using (
    organization_id in (
      select id from public.organizations where owner_id = auth.uid()
    )
  );

create policy "Korisnik vidi vlastite stavke"
  on public.salary_items for all
  using (
    period_id in (
      select sp.id from public.salary_periods sp
      join public.organizations o on o.id = sp.organization_id
      where o.owner_id = auth.uid()
    )
  );
