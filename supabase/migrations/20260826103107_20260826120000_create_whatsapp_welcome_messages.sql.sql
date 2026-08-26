/*
# Create WhatsApp Welcome Messages Table

1. Purpose
   - Logs every welcome message sent to a customer via WhatsApp Business API.
   - Stores the customer's phone number, selected language, message content,
     delivery status, and timestamps.

2. New Tables
   - `whatsapp_welcome_messages`
     - `id` (uuid, primary key)
     - `phone_number` (text, not null) — customer's phone number in international format
     - `language` (text, not null, default 'ar') — language of the welcome message (ar/he/en)
     - `message_content` (text, not null) — the full message text that was sent
     - `status` (text, not null, default 'pending') — delivery status: pending/sent/failed
     - `whatsapp_message_id` (text, nullable) — message ID returned by WhatsApp API on success
     - `error_message` (text, nullable) — error details if sending failed
     - `shop_username` (text, nullable) — which shop sent the message
     - `created_at` (timestamptz, default now())

3. Security
   - Enable RLS on `whatsapp_welcome_messages`.
   - Allow anon + authenticated to INSERT (customers submit their phone number from the app).
   - Allow anon + authenticated to SELECT (to check delivery status).
   - No UPDATE or DELETE from the client side.

4. Indexes
   - Index on `phone_number` for lookup queries.
   - Index on `created_at` for chronological ordering.
*/

CREATE TABLE IF NOT EXISTS whatsapp_welcome_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number text NOT NULL,
  language text NOT NULL DEFAULT 'ar',
  message_content text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  whatsapp_message_id text,
  error_message text,
  shop_username text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE whatsapp_welcome_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_insert_welcome_messages" ON whatsapp_welcome_messages;
CREATE POLICY "anon_insert_welcome_messages"
  ON whatsapp_welcome_messages FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_select_welcome_messages" ON whatsapp_welcome_messages;
CREATE POLICY "anon_select_welcome_messages"
  ON whatsapp_welcome_messages FOR SELECT
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_whatsapp_welcome_phone ON whatsapp_welcome_messages(phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_welcome_created ON whatsapp_welcome_messages(created_at DESC);
