/*
# Migrate commissions from currencies table to commissions table
#
# 1. Insert per-currency commissions for the 'admin' shop into the commissions table
#    using the existing buy_commission and sell_commission values from currencies.
# 2. Drop buy_commission and sell_commission columns from the currencies table.
#
# After this migration:
# - currencies table: only currency details + current_rate (no commission columns)
# - commissions table: buy/sell commission per shop_username + currency_code
*/

-- Step 1: Migrate existing commissions to the commissions table for 'admin' shop
INSERT INTO commissions (shop_username, currency_code, buy_commission, sell_commission)
SELECT 'admin', code, buy_commission, sell_commission
FROM currencies
WHERE buy_commission IS NOT NULL OR sell_commission IS NOT NULL
ON CONFLICT (shop_username, currency_code) DO UPDATE
  SET buy_commission = EXCLUDED.buy_commission,
      sell_commission = EXCLUDED.sell_commission,
      updated_at = now();

-- Step 2: Remove commission columns from currencies table
ALTER TABLE currencies DROP COLUMN IF EXISTS buy_commission;
ALTER TABLE currencies DROP COLUMN IF EXISTS sell_commission;
