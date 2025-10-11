/*
  # التأكد من وجود جدول أرصدة الخزينة

  1. جدول
    - `treasury_balances` (أرصدة الخزينة)
      - `id` (uuid, primary key)
      - `currency_code` (text) - رمز العملة (ILS, USD, EUR)
      - `currency_name_ar` (text) - اسم العملة بالعربية
      - `balance_amount` (decimal) - المبلغ الموجود
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. الأمان
    - تفعيل RLS على الجدول
    - سياسات للقراءة والكتابة
*/

-- إنشاء جدول أرصدة الخزينة
CREATE TABLE IF NOT EXISTS treasury_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  currency_code text UNIQUE NOT NULL,
  currency_name_ar text NOT NULL,
  balance_amount decimal(15,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- تفعيل RLS
ALTER TABLE treasury_balances ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان
CREATE POLICY "Anyone can read treasury balances"
  ON treasury_balances
  FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Authenticated users can insert treasury balances"
  ON treasury_balances
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update treasury balances"
  ON treasury_balances
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- إنشاء فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_treasury_balances_currency_code ON treasury_balances(currency_code);

-- إدراج البيانات الافتراضية
INSERT INTO treasury_balances (currency_code, currency_name_ar, balance_amount) VALUES
('ILS', 'شيكل إسرائيلي', 10000.00),
('USD', 'دولار أمريكي', 5000.00),
('EUR', 'يورو', 3000.00),
('JOD', 'دينار أردني', 2000.00),
('GBP', 'جنيه إسترليني', 1500.00)
ON CONFLICT (currency_code) DO NOTHING;
