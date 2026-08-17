/*
# Move is_active from currencies to shop_currencies

## Summary
- Drops the `is_active` column from the `currencies` table.
- The availability of a currency per shop is now controlled by `shop_currencies.is_active`.
- Also drops the `toggleActive` function on currencies if it exists.

## Security
- No RLS changes needed; shop_currencies already has policies.
*/

-- Drop the is_active column from currencies
ALTER TABLE currencies DROP COLUMN IF EXISTS is_active;
