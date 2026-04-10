-- P1-I (migration portion): Unique partial index on contracts(pairing_code)
-- Source: data-model-audit.md Finding PA-1
-- Prevents two contracts from sharing the same active pairing code.
-- Partial (WHERE pairing_code IS NOT NULL) so NULL values are not constrained.
-- The companion application-level fix (atomic UPDATE-WHERE in redeem route) is
-- owned by security-engineer.

CREATE UNIQUE INDEX IF NOT EXISTS contracts_pairing_code_unique
  ON contracts(pairing_code)
  WHERE pairing_code IS NOT NULL;

NOTIFY pgrst, 'reload schema';
