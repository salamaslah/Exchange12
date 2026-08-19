/*
# Add username column to advertisements

1. Modified Tables
- `advertisements`
  - New column `username` (text, nullable) — stores the shop username that owns this ad.
  - Backfilled all existing rows to `username = 'alaa'` so current ads stay visible for that shop.
2. Security
- RLS already enabled; existing permissive public policies remain unchanged (anon + authenticated).
- No new policies needed — filtering by username happens in app queries, not RLS, because this app
  uses the anon key and the table is intentionally shared across shops.
3. Important Notes
- The column is nullable so legacy rows without a shop are not rejected, but the app will filter by
  the logged-in shop's username when fetching ads for template 3.
- Idempotent: uses DO $$ ... IF NOT EXISTS ... END $$ so re-running is safe.
*/

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'advertisements'
      AND column_name = 'username'
  ) THEN
    ALTER TABLE public.advertisements ADD COLUMN username text;
  END IF;
END $$;

UPDATE public.advertisements
SET username = 'alaa'
WHERE username IS NULL;

CREATE INDEX IF NOT EXISTS idx_advertisements_username
  ON public.advertisements (username);