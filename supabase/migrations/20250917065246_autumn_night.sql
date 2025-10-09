/*
  # إنشاء جدول المعاملات

  1. جدول جديد
    - `transactions` (المعاملات)
      - `id` (uuid, primary key)
      - `service_number` (integer) - رقم الخدمة
      - `amount_paid` (decimal) - المبلغ الذي دفعه الزبون
      - `currency_paid` (text) - العملة التي دفع بها الزبون
      - `amount_received` (decimal) - المبلغ الذي تلقاه الزبون
      - `currency_received` (text) - العملة التي تلقاها الزبون
      - `customer_id` (text) - رقم هوية الزبون
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. الأمان
    - تفعيل RLS على الجدول
    - سياسات للقراءة والكتابة للمستخدمين المصرح لهم
*/

-- إنشاء جدول المعاملات
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_number integer NOT NULL,
  amount_paid decimal(15,4) NOT NULL DEFAULT 0,
  currency_paid text NOT NULL DEFAULT 'ILS',
  amount_received decimal(15,4) NOT NULL DEFAULT 0,
  currency_received text NOT NULL DEFAULT 'ILS',
  customer_id text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- تفعيل RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان للمعاملات
CREATE POLICY "Anyone can read transactions"
  ON transactions
  FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Authenticated users can insert transactions"
  ON transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update transactions"
  ON transactions
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete transactions"
  ON transactions
  FOR DELETE
  TO authenticated
  USING (true);

-- إنشاء فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_transactions_service_number ON transactions(service_number);
CREATE INDEX IF NOT EXISTS idx_transactions_customer_id ON transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);

-- إنشاء مشغل لتحديث updated_at
CREATE TRIGGER update_transactions_updated_at 
    BEFORE UPDATE ON transactions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();