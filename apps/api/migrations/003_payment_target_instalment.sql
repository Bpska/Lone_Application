ALTER TABLE payments
  ADD COLUMN target_instalment_id uuid REFERENCES instalments(id);

CREATE INDEX payments_target_instalment_idx
  ON payments(target_instalment_id)
  WHERE target_instalment_id IS NOT NULL;
