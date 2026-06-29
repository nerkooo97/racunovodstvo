-- KPR-1041: prihodi / rashodi kolone per PLAN.md
alter table public.kpr_entries
  add column if not exists income_cash     numeric(14,2) default 0,
  add column if not exists income_bank     numeric(14,2) default 0,
  add column if not exists income_other    numeric(14,2) default 0,
  add column if not exists income_total    numeric(14,2) default 0,
  add column if not exists expense_goods   numeric(14,2) default 0,
  add column if not exists expense_salaries numeric(14,2) default 0,
  add column if not exists expense_contribs numeric(14,2) default 0,
  add column if not exists expense_other   numeric(14,2) default 0,
  add column if not exists expense_total   numeric(14,2) default 0;

-- PDV evidencije: odbitnost i PDV broj partnera per PLAN.md
alter table public.pdv_records
  add column if not exists partner_vat_no  text null,
  add column if not exists deductible      boolean not null default true,
  add column if not exists deductible_pct  numeric(5,2) not null default 100.00;
