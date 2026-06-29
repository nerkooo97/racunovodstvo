-- Migration for full payroll alignment with FBiH standards

-- 1. Proširenje tabele employees
alter table public.employees
add column if not exists minuli_rad_rate numeric(5,2) default 0.40,
add column if not exists overtime_rate numeric(5,2) default 25.00,
add column if not exists night_rate numeric(5,2) default 25.00,
add column if not exists sunday_rate numeric(5,2) default 20.00,
add column if not exists holiday_rate numeric(5,2) default 50.00,
add column if not exists company_car_benefit numeric(12,2) default 0.00;

-- 2. Proširenje tabele salary_items
alter table public.salary_items
add column if not exists worked_minutes int default 10560,
add column if not exists standard_minutes int default 10560,
add column if not exists overtime_amount numeric(12,2) default 0.00,
add column if not exists night_amount numeric(12,2) default 0.00,
add column if not exists sunday_amount numeric(12,2) default 0.00,
add column if not exists holiday_amount numeric(12,2) default 0.00,
add column if not exists minuli_rad_years int default 0,
add column if not exists minuli_rad_amount numeric(12,2) default 0.00,
add column if not exists pro_rate_factor numeric(6,4) default 1.0000,
add column if not exists min_base_applied boolean default false,
add column if not exists company_car_bruto numeric(12,2) default 0.00;
