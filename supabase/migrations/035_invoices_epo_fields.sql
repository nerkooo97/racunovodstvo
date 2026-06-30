-- EPO-1044 potraživanja strana: dopuna tabele invoices za praćenje naplate i veze na KPR
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS payment_date  date,
  ADD COLUMN IF NOT EXISTS paid_amount   numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS kpr_entry_id  uuid REFERENCES kpr_entries(id) ON DELETE SET NULL;
