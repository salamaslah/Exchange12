/*
# Create Coupons Table

## Purpose
Supports a discount coupon system for a currency exchange / money transfer business.
Admins create coupon codes that customers can enter to receive a discounted rate.

## New Table: coupons
| Column               | Type        | Description |
|----------------------|-------------|-------------|
| id                   | uuid PK     | Auto-generated unique identifier |
| code                 | text UNIQUE | The coupon code given to the customer (e.g. "EX-7K3M2") |
| type                 | text        | 'currency_exchange' or 'bank_transfer' |
| currency_code        | text        | For currency_exchange: which currency this applies to (e.g. 'USD') |
| discounted_buy_rate  | numeric     | For currency_exchange: overrides the buy rate shown to the customer |
| discounted_sell_rate | numeric     | For currency_exchange: overrides the sell rate shown to the customer |
| discount_percentage  | numeric     | For bank_transfer: percentage discount off the standard fee |
| is_active            | boolean     | Whether the coupon can still be redeemed (admin can deactivate) |
| is_used              | boolean     | Whether the coupon has already been redeemed |
| used_at              | timestamptz | When the coupon was redeemed |
| expires_at           | timestamptz | Optional expiry date/time |
| notes                | text        | Optional internal notes for the admin |
| created_at           | timestamptz | When the coupon was created |

## Security
- RLS enabled.
- Single-tenant (no auth): anon + authenticated roles can SELECT and UPDATE (for redemption).
- Only anon + authenticated can INSERT (admin creates) and DELETE.
- USING (true) is appropriate here because data is intentionally shared in this no-auth app.
*/

CREATE TABLE IF NOT EXISTS coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  type text NOT NULL CHECK (type IN ('currency_exchange', 'bank_transfer')),
  currency_code text,
  discounted_buy_rate numeric,
  discounted_sell_rate numeric,
  discount_percentage numeric,
  is_active boolean NOT NULL DEFAULT true,
  is_used boolean NOT NULL DEFAULT false,
  used_at timestamptz,
  expires_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_coupons" ON coupons;
CREATE POLICY "anon_select_coupons" ON coupons FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_coupons" ON coupons;
CREATE POLICY "anon_insert_coupons" ON coupons FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_coupons" ON coupons;
CREATE POLICY "anon_update_coupons" ON coupons FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_coupons" ON coupons;
CREATE POLICY "anon_delete_coupons" ON coupons FOR DELETE
  TO anon, authenticated USING (true);
