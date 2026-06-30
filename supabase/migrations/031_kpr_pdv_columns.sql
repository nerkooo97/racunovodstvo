-- KPR-1041 kolone 14 i 20: PDV u prihodima i PDV u rashodima
-- Obavezne samo za PDV-registrovane obrtnike; ostali ostavljaju 0
ALTER TABLE public.kpr_entries
  ADD COLUMN IF NOT EXISTS income_vat  numeric(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS expense_vat numeric(14,2) DEFAULT 0;
