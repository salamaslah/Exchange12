/*
# Multi-shop support: exchange shops + per-shop commissions

## Purpose
Transforms the app from a single exchange shop into a multi-shop system.
Each shop has its own login credentials (username + PIN). The controller (admin)
creates shops and assigns credentials. Each shop logs in and sees the prices
page with commissions specific to that shop.

## New Tables

### 1. exchange_shops
Stores one row per exchange shop. This is the login identity table.
- `id` (uuid, primary key)
- `username` (text, unique, not null) — login username for the shop
- `password` (text, not null) — login password/PIN for the shop (plain text for now, controller-issued)
- `shop_name_ar` (text) — shop display name in Arabic
- `shop_name_he` (text) — shop display name in Hebrew
- `shop_name_en` (text) — shop display name in English
- `is_active` (boolean, default true) — whether the shop can log in
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### 2. commissions
Per-shop, per-currency buy and sell commissions. This SEPARATES commissions
from the prices (currencies) table, as requested. Each row links a shop (by
username) to a currency (by code) with its own buy_commission and sell_commission.
- `id` (uuid, primary key)
- `shop_username` (text, not null) — references exchange_shops.username
- `currency_code` (text, not null) — references currencies.code
- `buy_commission` (integer, default 6) — buy commission in agorot (100 agorot = 1 shekel)
- `sell_commission` (integer, default 6) — sell commission in agorot
- `created_at` (timestamptz)
- `updated_at` (timestamptz)
- Unique constraint on (shop_username, currency_code) so each shop has one commission row per currency.

## Security (RLS)
- Both tables are single-tenant shared (no Supabase Auth sign-in screen; the app
  uses its own username/password login against exchange_shops). So policies use
  `TO anon, authenticated` with `USING (true)` because the app's frontend talks
  via the anon key and the data is intentionally shared across the shop devices.
- This is a no-auth app from Supabase's perspective (no Supabase Auth session),
  so anon must be able to read/write these tables.

## Notes
1. The `currencies` table keeps `buy_commission` and `sell_commission` columns
   as fallback defaults. When a shop has a row in `commissions`, that value is
   used. If no row exists, the app falls back to the currencies table default.
2. The controller (admin) inserts rows into exchange_shops and commissions
   manually to provision shops.
*/

-- ── exchange_shops ──
CREATE TABLE IF NOT EXISTS exchange_shops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  password text NOT NULL,
  shop_name_ar text,
  shop_name_he text,
  shop_name_en text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE exchange_shops ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_exchange_shops" ON exchange_shops;
CREATE POLICY "anon_select_exchange_shops" ON exchange_shops FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_exchange_shops" ON exchange_shops;
CREATE POLICY "anon_insert_exchange_shops" ON exchange_shops FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_exchange_shops" ON exchange_shops;
CREATE POLICY "anon_update_exchange_shops" ON exchange_shops FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_exchange_shops" ON exchange_shops;
CREATE POLICY "anon_delete_exchange_shops" ON exchange_shops FOR DELETE
  TO anon, authenticated USING (true);

-- ── commissions ──
CREATE TABLE IF NOT EXISTS commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_username text NOT NULL,
  currency_code text NOT NULL,
  buy_commission integer NOT NULL DEFAULT 6,
  sell_commission integer NOT NULL DEFAULT 6,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT commissions_shop_currency_unique UNIQUE (shop_username, currency_code)
);

ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_commissions" ON commissions;
CREATE POLICY "anon_select_commissions" ON commissions FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_commissions" ON commissions;
CREATE POLICY "anon_insert_commissions" ON commissions FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_commissions" ON commissions;
CREATE POLICY "anon_update_commissions" ON commissions FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_commissions" ON commissions;
CREATE POLICY "anon_delete_commissions" ON commissions FOR DELETE
  TO anon, authenticated USING (true);

-- Seed a default shop so the app is usable immediately
INSERT INTO exchange_shops (username, password, shop_name_ar, shop_name_he, shop_name_en, is_active)
VALUES ('admin', '123456', 'نعامنة للصرافة', 'נעאמנה להמרות', 'Naamneh Exchange', true)
ON CONFLICT (username) DO NOTHING;
