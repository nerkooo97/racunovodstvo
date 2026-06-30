-- Analitičke kartice kupaca/dobavljača (čl. 18 + čl. 23 Zakona o računovodstvu FBiH 15/21)
-- Svaka stavka naloga dobija opcioni partner_id za filtriranje po partneru (saldakonti).
ALTER TABLE public.journal_lines
  ADD COLUMN IF NOT EXISTS partner_id uuid REFERENCES public.partners(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS journal_lines_partner_idx
  ON public.journal_lines (organization_id, partner_id)
  WHERE partner_id IS NOT NULL;

-- Kompozitni indeks za karticu partnera (sortirana po datumu)
CREATE INDEX IF NOT EXISTS journal_lines_partner_date_idx
  ON public.journal_lines (organization_id, partner_id, journal_entry_id)
  WHERE partner_id IS NOT NULL;
