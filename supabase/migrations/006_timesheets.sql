create table public.timesheets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  year int not null,
  month int not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (organization_id, employee_id, year, month)
);

create table public.timesheet_days (
  id uuid primary key default gen_random_uuid(),
  timesheet_id uuid not null references public.timesheets(id) on delete cascade,
  date date not null,
  start_time time null,
  end_time time null,
  break_minutes int default 30,
  total_hours numeric(5,2) null,
  overtime_hours numeric(5,2) default 0,
  night_hours numeric(5,2) default 0,
  field_work_hours numeric(5,2) default 0,
  standby_hours numeric(5,2) default 0,
  sunday_hours numeric(5,2) default 0,
  holiday_hours numeric(5,2) default 0,
  absence_code text null,
  note text null,
  is_day_off boolean default false,
  manual_override boolean default false,
  unique (timesheet_id, date)
);

create table public.timesheet_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  default_start time default '08:00',
  default_end time default '16:00',
  default_break_minutes int default 30,
  days_off int[] default '{6,7}',
  count_annual_leave boolean default true,
  count_holiday boolean default true,
  count_sick_leave boolean default false,
  unique (user_id, organization_id)
);

create index on public.timesheets (organization_id, employee_id);
create index on public.timesheet_days (timesheet_id, date);

alter table public.timesheets enable row level security;
alter table public.timesheet_days enable row level security;
alter table public.timesheet_settings enable row level security;

create policy "Timesheets — vlastite organizacije"
  on public.timesheets for all
  using (
    organization_id in (
      select id from public.organizations where owner_id = auth.uid()
    )
  );

create policy "Timesheet dani — vlastite organizacije"
  on public.timesheet_days for all
  using (
    timesheet_id in (
      select ts.id from public.timesheets ts
      join public.organizations o on o.id = ts.organization_id
      where o.owner_id = auth.uid()
    )
  );

create policy "Timesheet podešavanja — vlastiti korisnik"
  on public.timesheet_settings for all
  using (user_id = auth.uid());
