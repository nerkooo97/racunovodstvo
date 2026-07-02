-- ════════════════════════════════════════════════════════════════════════════
-- Zalihe (klasa 1) za d.o.o. — periodični sistem:
-- primljena faktura za robu koja se drži na zalihama knjiži se na 1300
-- (Zalihe robe), a ne direktno na rashod. Rashod (5010 Nabavna vrijednost
-- prodate robe) knjiži se razduženjem nakon popisa (inventure).
-- ════════════════════════════════════════════════════════════════════════════

alter table public.received_invoices
  drop constraint if exists received_invoices_expense_type_check;

alter table public.received_invoices
  add constraint received_invoices_expense_type_check
  check (expense_type in ('goods', 'services', 'inventory'));
