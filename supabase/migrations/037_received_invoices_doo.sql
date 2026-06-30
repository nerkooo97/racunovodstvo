-- DOO: primljene fakture dobijaju polja za PDV razrez i vezu na GK nalog
ALTER TABLE public.received_invoices
  ADD COLUMN IF NOT EXISTS amount_base   numeric(14,2),
  ADD COLUMN IF NOT EXISTS vat_amount    numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS expense_type  text NOT NULL DEFAULT 'goods'
      CHECK (expense_type IN ('goods', 'services')),
  ADD COLUMN IF NOT EXISTS is_foreign    boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS gl_entry_id   uuid REFERENCES public.journal_entries(id) ON DELETE SET NULL;

-- Za postojeće obrt zapise: amount_base = amount (ukupan iznos, bez PDV razreza)
UPDATE public.received_invoices
  SET amount_base = amount
  WHERE amount_base IS NULL;

CREATE INDEX IF NOT EXISTS received_invoices_gl_entry_idx
  ON public.received_invoices (gl_entry_id) WHERE gl_entry_id IS NOT NULL;
