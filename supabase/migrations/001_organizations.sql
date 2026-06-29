create table public.organizations (
  id                uuid        primary key default gen_random_uuid(),
  owner_id          uuid        not null references auth.users(id) on delete cascade,
  name              text        not null,
  type              text        not null default 'obrt' check (type in ('obrt', 'doo')),
  tax_id            text,
  vat_number        text,
  is_vat_registered boolean     not null default false,
  address           text,
  city              text,
  canton            text,
  municipality      text,
  municipality_code text,
  activity_code     text,
  activity_name     text,
  phone             text,
  email             text,
  bank_account      text,
  bank_name         text,
  logo_url          text,
  plan              text        not null default 'free' check (plan in ('free', 'pro', 'business')),
  plan_expires_at   timestamptz,
  trial_ends_at     timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table public.organizations enable row level security;

create policy "Korisnik upravlja vlastitim organizacijama"
  on public.organizations
  for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());
