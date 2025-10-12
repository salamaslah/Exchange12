/*
  # Create Currency Update Log Table

  1. New Tables
    - `currency_update_log`
      - `id` (uuid, primary key) - معرف فريد للسجل
      - `last_update` (timestamptz) - وقت وتاريخ آخر تحديث للعملات
      - `created_at` (timestamptz) - وقت إنشاء السجل
      - `updated_at` (timestamptz) - وقت آخر تعديل

  2. Security
    - Enable RLS on `currency_update_log` table
    - Add policy for authenticated users to read the log
    - Add policy for authenticated users to update the log

  3. Notes
    - سيحتوي الجدول على سجل واحد فقط يتم تحديثه في كل مرة
    - يمكن استخدام هذا الجدول لتتبع آخر تحديث للعملات
    - سيتم إدراج سجل أولي بتاريخ قديم لبدء التتبع
*/

-- Create the currency_update_log table
CREATE TABLE IF NOT EXISTS currency_update_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  last_update timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE currency_update_log ENABLE ROW LEVEL SECURITY;

-- Policy for reading the log (anyone can read)
CREATE POLICY "Anyone can read currency update log"
  ON currency_update_log
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Policy for updating the log (authenticated users only)
CREATE POLICY "Authenticated users can update currency log"
  ON currency_update_log
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy for inserting (authenticated users only)
CREATE POLICY "Authenticated users can insert currency log"
  ON currency_update_log
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Insert initial record with old timestamp to trigger first update
INSERT INTO currency_update_log (id, last_update, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  now() - interval '10 minutes',
  now(),
  now()
)
ON CONFLICT DO NOTHING;