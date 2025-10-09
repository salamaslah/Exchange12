/*
  # إنشاء جداول العملات والخدمات

  1. جداول جديدة
    - `currencies` (العملات)
      - `id` (uuid, primary key)
      - `name_ar` (text) - اسم العملة بالعربية
      - `name_en` (text) - اسم العملة بالإنجليزية
      - `code` (text) - رمز العملة (USD, EUR, etc.)
      - `buy_rate` (decimal) - سعر الشراء
      - `sell_rate` (decimal) - سعر البيع
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `services` (الخدمات)
      - `id` (uuid, primary key)
      - `service_number` (integer) - رقم الخدمة
      - `service_name` (text) - اسم الخدمة
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. الأمان
    - تفعيل RLS على كلا الجدولين
    - سياسات للقراءة والكتابة للمستخدمين المصرح لهم
*/

-- إنشاء جدول العملات
CREATE TABLE IF NOT EXISTS currencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar text NOT NULL,
  name_en text NOT NULL,
  code text UNIQUE NOT NULL,
  buy_rate decimal(10,4) NOT NULL DEFAULT 0,
  sell_rate decimal(10,4) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- إنشاء جدول الخدمات
CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_number integer UNIQUE NOT NULL,
  service_name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- تفعيل RLS
ALTER TABLE currencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان للعملات
CREATE POLICY "Anyone can read currencies"
  ON currencies
  FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Authenticated users can insert currencies"
  ON currencies
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update currencies"
  ON currencies
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete currencies"
  ON currencies
  FOR DELETE
  TO authenticated
  USING (true);

-- سياسات الأمان للخدمات
CREATE POLICY "Anyone can read services"
  ON services
  FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Authenticated users can insert services"
  ON services
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update services"
  ON services
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete services"
  ON services
  FOR DELETE
  TO authenticated
  USING (true);

-- إدراج بيانات العملات الأولية
INSERT INTO currencies (name_ar, name_en, code, buy_rate, sell_rate) VALUES
('دولار أمريكي', 'US Dollar', 'USD', 3.65, 3.70),
('يورو', 'Euro', 'EUR', 3.95, 4.00),
('جنيه إسترليني', 'British Pound', 'GBP', 4.60, 4.70),
('فرنك سويسري', 'Swiss Franc', 'CHF', 4.10, 4.20),
('دولار كندي', 'Canadian Dollar', 'CAD', 2.70, 2.80),
('دولار أسترالي', 'Australian Dollar', 'AUD', 2.40, 2.50),
('ين ياباني', 'Japanese Yen', 'JPY', 0.024, 0.026),
('كرونة سويدية', 'Swedish Krona', 'SEK', 0.34, 0.36),
('كرونة نرويجية', 'Norwegian Krone', 'NOK', 0.33, 0.35),
('كرونة دنماركية', 'Danish Krone', 'DKK', 0.53, 0.55),
('ليرة تركية', 'Turkish Lira', 'TRY', 0.11, 0.13),
('روبل روسي', 'Russian Ruble', 'RUB', 0.035, 0.040),
('يوان صيني', 'Chinese Yuan', 'CNY', 0.50, 0.52),
('وون كوري', 'Korean Won', 'KRW', 0.0027, 0.0029),
('بات تايلندي', 'Thai Baht', 'THB', 0.10, 0.11),
('دولار سنغافوري', 'Singapore Dollar', 'SGD', 2.70, 2.80),
('دولار هونغ كونغ', 'Hong Kong Dollar', 'HKD', 0.47, 0.49),
('بيزو مكسيكي', 'Mexican Peso', 'MXN', 0.18, 0.20),
('ريال برازيلي', 'Brazilian Real', 'BRL', 0.60, 0.65),
('درهم إماراتي', 'UAE Dirham', 'AED', 0.99, 1.01),
('ريال سعودي', 'Saudi Riyal', 'SAR', 0.97, 0.99),
('جنيه مصري', 'Egyptian Pound', 'EGP', 0.074, 0.076),
('دينار أردني', 'Jordanian Dinar', 'JOD', 5.15, 5.25),
('دينار كويتي', 'Kuwaiti Dinar', 'KWD', 11.90, 12.10),
('ريال قطري', 'Qatari Riyal', 'QAR', 1.00, 1.02);

-- إدراج بيانات الخدمات الأولية
INSERT INTO services (service_number, service_name) VALUES
(1, 'صرافة أموال'),
(2, 'تحويل للخارج'),
(3, 'صرافة شيكات'),
(4, 'تحويل لحساب بنك صاحب المحل'),
(5, 'سحب من الفيزا'),
(6, 'إيداع في الفيزا');

-- إنشاء فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_currencies_code ON currencies(code);
CREATE INDEX IF NOT EXISTS idx_services_number ON services(service_number);

-- إنشاء دالة لتحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- إنشاء المشغلات لتحديث updated_at
CREATE TRIGGER update_currencies_updated_at 
    BEFORE UPDATE ON currencies 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_services_updated_at 
    BEFORE UPDATE ON services 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();