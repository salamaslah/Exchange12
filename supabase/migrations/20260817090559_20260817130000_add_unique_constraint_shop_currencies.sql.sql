/*
# Add unique constraint on shop_currencies (currency_id, shop_id)

## Summary
- The upsert in shopCurrencyService.addCurrencyToShop uses onConflict: 'currency_id,shop_id'
  but there was no unique constraint on those columns, causing the upsert to fail.
- This adds the missing unique constraint.

## Security
- No RLS changes needed.
*/

-- Add unique constraint on (currency_id, shop_id) so upserts work correctly
CREATE UNIQUE INDEX IF NOT EXISTS shop_currencies_currency_id_shop_id_key
  ON shop_currencies (currency_id, shop_id);
