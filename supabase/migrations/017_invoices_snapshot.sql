-- Dodaje snapshot kolone za prodavca i kupca na fakturi (PLAN.md - Snapshot pravilo)
-- Snapshot se snima u trenutku izdavanja fakture; podaci se ne smiju mijenjati
alter table public.invoices
  add column if not exists seller_name    text null,
  add column if not exists seller_address text null,
  add column if not exists seller_city    text null,
  add column if not exists seller_jib     text null,
  add column if not exists seller_vat_no  text null,
  add column if not exists seller_phone   text null,
  add column if not exists seller_email   text null,
  add column if not exists seller_account text null,
  add column if not exists buyer_name     text null,
  add column if not exists buyer_address  text null,
  add column if not exists buyer_city     text null,
  add column if not exists buyer_jib      text null,
  add column if not exists buyer_vat_no   text null,
  add column if not exists buyer_email    text null,
  add column if not exists buyer_phone    text null;

-- Dodaje 'advance' (avansna faktura) tip
alter table public.invoices
  drop constraint if exists invoices_type_check;

alter table public.invoices
  add constraint invoices_type_check
    check (type in ('invoice','proforma','credit_note','advance'));

-- Dodaje PDV checkbox flag
alter table public.invoices
  add column if not exists charges_vat boolean not null default true;
