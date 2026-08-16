/*
# Create shop_currencies table

## Summary
- Creates a new table `shop_currencies` that links currencies to exchange shops.
- Each row stores: currency_id (from currencies table) and shop_id (from company_settings table).
- This allows each shop to have its own set of currencies it deals with.
- Enables RLS with anon+authenticated CRUD (no-auth app pattern).

## New Table: shop_currencies
- id (uuid, primary key)
- currency_id (uuid, FK to currencies.id, NOT NULL)
- shop_id (uuid, FK to company_settings.id, NOT NULL)
- is_active (boolean, default true)
- created_at (timestamptz, default now())
- Unique constraint on (currency_id, shop_id) to prevent duplicates

## Security
- RLS enabled, anon+authenticated CRUD (single-tenant pattern, app uses anon key).
*/

CREATE TABLE IF NOT EXISTS shop_currencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  currency_id uuid NOT NULL REFERENCES currencies(id) ON DELETE CASCADE,
  shop_id uuid NOT NULL REFERENCES company_settings(id) ON DELETE CASCADE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Unique constraint: one shop can't have the same currency twice
CREATE UNIQUE INDEX IF NOT EXISTS shop_currencies_currency_shop_key
  ON shop_currencies (currency_id, shop_id);

ALTER TABLE shop_currencies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_shop_currencies" ON shop_currencies;
CREATE POLICY "anon_select_shop_currencies" ON shop_currencies FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_shop_currencies" ON shop_currencies;
CREATE POLICY "anon_insert_shop_currencies" ON shop_currencies FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_shop_currencies" ON shop_currencies;
CREATE POLICY "anon_update_shop_currencies" ON shop_currencies FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_shop_currencies" ON shop_currencies;
CREATE POLICY "anon_delete_shop_currencies" ON shop_currencies FOR DELETE
  TO anon, authenticated USING (true);
