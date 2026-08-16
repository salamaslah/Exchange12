/*
# Move buy_rate and sell_rate from currencies table to commissions table
#
# 1. Add buy_rate and sell_rate columns to commissions table
# 2. Migrate existing buy_rate/sell_rate values from currencies to commissions (admin shop)
# 3. Drop buy_rate and sell_rate columns from currencies table
#
# After this migration:
# - currencies table: only currency details + current_rate (no buy_rate/sell_rate)
# - commissions table: buy/sell commission + buy_rate/sell_rate per shop + currency
*/

-- Step 1: Add buy_rate and sell_rate columns to commissions table
ALTER TABLE commissions ADD COLUMN IF NOT EXISTS buy_rate numeric;
ALTER TABLE commissions ADD COLUMN IF NOT EXISTS sell_rate numeric;

-- Step 2: Migrate existing buy_rate/sell_rate from currencies to commissions for admin shop
UPDATE commissions c
SET buy_rate = cur.buy_rate,
    sell_rate = cur.sell_rate,
    updated_at = now()
FROM currencies cur
WHERE c.currency_code = cur.code
  AND c.shop_username = 'admin'
  AND (cur.buy_rate IS NOT NULL OR cur.sell_rate IS NOT NULL);

-- Step 3: Drop buy_rate and sell_rate columns from currencies table
ALTER TABLE currencies DROP COLUMN IF EXISTS buy_rate;
ALTER TABLE currencies DROP COLUMN IF EXISTS sell_rate;
