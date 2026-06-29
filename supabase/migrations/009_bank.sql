CREATE TABLE IF NOT EXISTS bank_statements (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  bank            text        NOT NULL,
  account_number  text,
  period_from     date        NOT NULL,
  period_to       date        NOT NULL,
  opening_balance numeric(14,2) NOT NULL DEFAULT 0,
  closing_balance numeric(14,2) NOT NULL DEFAULT 0,
  file_url        text,
  imported_at     timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE bank_statements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bank_statements_owner" ON bank_statements
  USING (
    organization_id IN (
      SELECT id FROM organizations WHERE owner_id = auth.uid()
    )
  );

CREATE TABLE IF NOT EXISTS transactions (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  statement_id        uuid        NOT NULL REFERENCES bank_statements(id) ON DELETE CASCADE,
  organization_id     uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  transaction_date    date        NOT NULL,
  value_date          date,
  amount              numeric(14,2) NOT NULL,
  direction           text        NOT NULL CHECK (direction IN ('credit','debit')),
  counterparty_name   text,
  counterparty_account text,
  description         text,
  reference_number    text,
  partner_id          uuid        REFERENCES partners(id),
  match_score         int         NOT NULL DEFAULT 0,
  status              text        NOT NULL DEFAULT 'unmatched'
                                  CHECK (status IN ('unmatched','review','confirmed')),
  kpr_entry_id        uuid,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "transactions_owner" ON transactions
  USING (
    organization_id IN (
      SELECT id FROM organizations WHERE owner_id = auth.uid()
    )
  );
