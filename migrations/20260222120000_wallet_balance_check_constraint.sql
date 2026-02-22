-- Wallet balance non-negative CHECK constraint
-- Prevents balance from going below zero at the database level
-- This is a safety net for race conditions and application bugs

DO $$
BEGIN
  -- parent_wallet: balance must be >= 0
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'parent_wallet_balance_non_negative'
  ) THEN
    ALTER TABLE parent_wallet ADD CONSTRAINT parent_wallet_balance_non_negative CHECK (balance >= 0);
  END IF;

  -- wallets (Phase 2): balance must be >= 0
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'wallets_balance_non_negative'
  ) THEN
    ALTER TABLE wallets ADD CONSTRAINT wallets_balance_non_negative CHECK (balance >= 0);
  END IF;
END
$$;
