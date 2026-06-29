-- Dodavanje polja za topli obrok po danu na tabelu employees
alter table public.employees
add column if not exists meal_allowance_per_day numeric(12,2) default 16.00;
