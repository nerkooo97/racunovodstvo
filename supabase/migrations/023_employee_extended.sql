-- Proširenje radnika prema specifikaciji (uloga, JS3100, ugovor, staž, PIO status)

alter table public.organizations
  add column if not exists default_meal_allowance_per_day numeric(12,2) default 16.00;

alter table public.employees
  add column if not exists employee_role text default 'radnik',
  add column if not exists id_card_number text,
  add column if not exists residence_entity text default 'FBiH',
  add column if not exists insurance_registration_date date,
  add column if not exists insurance_deregistration_date date,
  add column if not exists insurance_status text default 'draft',
  add column if not exists contract_number text,
  add column if not exists probation_months int default 0,
  add column if not exists first_employment_date date,
  add column if not exists prior_experience_years int default 0,
  add column if not exists prior_experience_months int default 0,
  add column if not exists send_payslip_email boolean default false;

alter table public.employees drop constraint if exists employees_residence_entity_check;
alter table public.employees
  add constraint employees_residence_entity_check
  check (residence_entity in ('FBiH', 'RS', 'BD'));

alter table public.employees drop constraint if exists employees_insurance_status_check;
alter table public.employees
  add constraint employees_insurance_status_check
  check (insurance_status in ('draft', 'registered'));

alter table public.employees drop constraint if exists employees_probation_months_check;
alter table public.employees
  add constraint employees_probation_months_check
  check (probation_months >= 0 and probation_months <= 6);

alter table public.employees drop constraint if exists employees_prior_experience_months_check;
alter table public.employees
  add constraint employees_prior_experience_months_check
  check (prior_experience_months >= 0 and prior_experience_months <= 11);

alter table public.employees drop constraint if exists employees_status_check;
alter table public.employees
  add constraint employees_status_check
  check (status in ('draft', 'active', 'probation', 'terminated'));

alter table public.employees alter column status set default 'draft';

-- Postojeći aktivni radnici smatraju se prijavljenima
update public.employees
set insurance_status = 'registered'
where status in ('active', 'probation', 'terminated');

update public.employees
set insurance_registration_date = hire_date
where insurance_status = 'registered'
  and insurance_registration_date is null;

update public.employees
set insurance_deregistration_date = termination_date
where status = 'terminated'
  and termination_date is not null
  and insurance_deregistration_date is null;
