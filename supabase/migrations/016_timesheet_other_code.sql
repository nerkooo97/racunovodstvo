-- Dodaje kolonu za "Ostalo (šifra)" — noćni rad, prekovremeni, smjenski itd.
alter table public.timesheet_days
  add column if not exists other_code text null;
