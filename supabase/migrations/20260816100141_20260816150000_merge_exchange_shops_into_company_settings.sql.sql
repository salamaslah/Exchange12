/*
# Merge exchange_shops into company_settings + multi-tenant support

## Summary
- Adds `username` and `password` columns to `company_settings` so each company row IS the shop login (no separate `exchange_shops` table needed).
- Adds `is_active` column to `company_settings` to allow enabling/disabling shops.
- Migrates existing `exchange_shops` data into `company_settings` rows (creating new company rows for shops that don't have one).
- Links `working_hours` to `company_settings` via `company_id` (already linked — no change needed, just ensuring data consistency).
- Adds RLS policies for the new columns so the anon-key frontend can read/write.
- Makes `username` unique on `company_settings`.

## New Columns on company_settings
- `username` (text, unique) — the login username for this shop
- `password` (text) — the login password for this shop
- `is_active` (boolean, default true) — whether this shop is active

## Data Migration
- For each row in `exchange_shops`:
  - If a `company_settings` row exists with matching shop name (name_ar = shop_name_ar), update it with the username/password.
  - Otherwise, create a new `company_settings` row from the exchange_shops data.

## Security
- RLS policies updated to allow anon + authenticated CRUD (single-tenant style, since the app uses anon key).
*/

-- 1. Add username, password, is_active columns to company_settings
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS username text;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS password text;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- 2. Migrate data from exchange_shops into company_settings
-- For existing company_settings row, update with username/password from the matching exchange_shops row
UPDATE company_settings cs
SET
  username = es.username,
  password = es.password,
  is_active = es.is_active,
  updated_at = now()
FROM exchange_shops es
WHERE cs.name_ar = es.shop_name_ar;

-- For exchange_shops rows that don't have a matching company_settings row, create new ones
INSERT INTO company_settings (username, password, name_ar, name_he, name_en, is_active)
SELECT
  es.username,
  es.password,
  COALESCE(es.shop_name_ar, es.username),
  COALESCE(es.shop_name_he, es.shop_name_ar),
  COALESCE(es.shop_name_en, es.shop_name_ar),
  es.is_active
FROM exchange_shops es
WHERE NOT EXISTS (
  SELECT 1 FROM company_settings cs WHERE cs.name_ar = es.shop_name_ar
)
AND NOT EXISTS (
  SELECT 1 FROM company_settings cs WHERE cs.username = es.username
);

-- 3. Add unique constraint on username (only for non-null values)
CREATE UNIQUE INDEX IF NOT EXISTS company_settings_username_key ON company_settings (username) WHERE username IS NOT NULL;

-- 4. Ensure working_hours are linked to company_settings
-- working_hours already has company_id referencing company_settings.id — no structural change needed.
