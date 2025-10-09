/*
  # إنشاء جدول أرصدة الخزينة

  1. جدول جديد
    - `treasury_balances` (أرصدة الخزينة)
      - `id` (uuid, primary key)
      - `currency_code` (text) - رمز العملة (ILS, USD, EUR)
      - `currency_name_ar` (text) - اسم العملة بالعربية
      - `currency_name_he` (text) - اسم العملة بالعبرية
      - `currency_name_en` (text) - اسم العملة بالإنجليزية
      - `balance_amount` (decimal) - المبلغ الموجود
      - `last_updated` (timestamp) - آخر تحديث
      - `notes` (text) - ملاحظات
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. الأمان
    - تفعيل RLS على الجدول
    - سياسات للقراءة والكتابة للمستخدمين المصرح لهم
*/

-- إنشاء جدول أرصدة الخزينة
CREATE TABLE IF NOT EXISTS treasury_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  currency_code text UNIQUE NOT NULL,
  currency_name_ar text NOT NULL,
  currency_name_he text NOT NULL,
  currency_name_en text NOT NULL,
  balance_amount decimal(15,2) NOT NULL DEFAULT 0,
  last_updated timestamptz DEFAULT now(),
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- تفعيل RLS
ALTER TABLE treasury_balances ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان لأرصدة الخزينة
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
  USING (true);

CREATE POLICY "Authenticated users can delete treasury balances"
  ON treasury_balances
  FOR DELETE
  TO authenticated
  USING (true);

-- إنشاء فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_treasury_balances_currency_code ON treasury_balances(currency_code);
CREATE INDEX IF NOT EXISTS idx_treasury_balances_last_updated ON treasury_balances(last_updated);

-- إنشاء مشغل لتحديث updated_at
CREATE TRIGGER update_treasury_balances_updated_at 
    BEFORE UPDATE ON treasury_balances 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- إدراج البيانات الافتراضية للعملات الثلاث
INSERT INTO treasury_balances (currency_code, currency_name_ar, currency_name_he, currency_name_en, balance_amount, notes) VALUES
('ILS', 'شيقل إسرائيلي', 'שקל ישראלי', 'Israeli Shekel', 10000.00, 'الرصيد الافتراضي'),
('USD', 'دولار أمريكي', 'דולר אמריקאי', 'US Dollar', 5000.00, 'الرصيد الافتراضي'),
('EUR', 'يورو', 'יורו', 'Euro', 3000.00, 'الرصيد الافتراضي')
ON CONFLICT (currency_code) DO NOTHING;