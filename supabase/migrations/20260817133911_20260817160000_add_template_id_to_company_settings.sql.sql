/*
# Add template_id column to company_settings

1. Purpose
   - Each shop can choose one of 5 price-page templates (1-5).
   - The chosen template controls the visual layout and color scheme of the prices display page.

2. Schema changes
   - company_settings: add column `template_id` (smallint, NOT NULL, default 1).
     - 1 = Classic Green & Gold (default, existing look)
     - 2 = Royal Blue & Silver
     - 3 = Midnight Purple & Neon
     - 4 = Warm Sand & Terracotta
     - 5 = Sleek Dark & Cyan

3. Security
   - No new tables; RLS already enabled on company_settings.
   - No policy changes needed; existing anon/authenticated policies cover the new column.
*/

ALTER TABLE company_settings
  ADD COLUMN IF NOT EXISTS template_id smallint NOT NULL DEFAULT 1;

COMMENT ON COLUMN company_settings.template_id IS 'رقم القالب لعرض الأسعار (1-5)';
