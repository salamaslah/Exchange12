/*
  # إنشاء جدول العملاء

  1. جدول جديد
    - `customers` (العملاء)
      - `id` (uuid, primary key)
      - `customer_name` (text) - اسم العميل
      - `national_id` (text) - رقم الهوية
      - `phone_number` (text) - رقم الهاتف
      - `birth_date` (date) - تاريخ الميلاد
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. الأمان
    - تفعيل RLS على الجدول
    - سياسات للقراءة والكتابة للمستخدمين المصرح لهم
*/

-- إنشاء جدول العملاء
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  national_id text UNIQUE NOT NULL,
  phone_number text NOT NULL,
  birth_date date NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- تفعيل RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان للعملاء
CREATE POLICY "Anyone can read customers"
  ON customers
  FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Authenticated users can insert customers"
  ON customers
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update customers"
  ON customers
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete customers"
  ON customers
  FOR DELETE
  TO authenticated
  USING (true);

-- إنشاء فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_customers_national_id ON customers(national_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone_number);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(customer_name);

-- إنشاء مشغل لتحديث updated_at
CREATE TRIGGER update_customers_updated_at 
    BEFORE UPDATE ON customers 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();