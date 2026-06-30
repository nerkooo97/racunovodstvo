-- PLDI-1043 kolona 11: broj dokumenta nabavke (čl. 50 Pravilnika)
ALTER TABLE public.fixed_assets
  ADD COLUMN IF NOT EXISTS document_number text;
