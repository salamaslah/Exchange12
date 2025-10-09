/*
  # إنشاء جداول إعدادات الشركة وأوقات العمل

  1. جداول جديدة
    - `company_settings` (إعدادات الشركة)
      - `id` (uuid, primary key)
      - `name_ar` (text) - اسم الشركة بالعربية
      - `name_he` (text) - اسم الشركة بالعبرية
      - `name_en` (text) - اسم الشركة بالإنجليزية
      - `address_ar` (text) - العنوان بالعربية
      - `address_he` (text) - العنوان بالعبرية
      - `address_en` (text) - العنوان بالإنجليزية
      - `phone1` (text) - الهاتف الأول
      - `phone2` (text) - الهاتف الثاني
      - `phone3` (text) - الهاتف الثالث
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `working_hours` (أوقات العمل)
      - `id` (uuid, primary key)
      - `company_id` (uuid, foreign key)
      - `day_of_week` (text) - يوم الأسبوع
      - `is_working_day` (boolean) - هل يوم عمل
      - `morning_start` (time) - بداية الدوام الصباحي
      - `morning_end` (time) - نهاية الدوام الصباحي
      - `evening_start` (time) - بداية الدوام المسائي
      - `evening_end` (time) - نهاية الدوام المسائي
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. الأمان
    - تفعيل RLS على كلا الجدولين
    - سياسات للقراءة والكتابة للمستخدمين المصرح لهم
*/

-- إنشاء جدول إعدادات الشركة
CREATE TABLE IF NOT EXISTS company_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar text NOT NULL DEFAULT 'نعامنة للصرافة',
  name_he text NOT NULL DEFAULT 'נעאמנה להמרות',
  name_en text NOT NULL DEFAULT 'Naamneh Exchange',
  address_ar text NOT NULL DEFAULT 'عرابة الشارع الرئيسي',
  address_he text NOT NULL DEFAULT 'ערבה הרחוב הראשי',
  address_en text NOT NULL DEFAULT 'Arraba Main Street',
  phone1 text NOT NULL DEFAULT '05260000841',
  phone2 text DEFAULT '',
  phone3 text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- إنشاء جدول أوقات العمل
CREATE TABLE IF NOT EXISTS working_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES company_settings(id) ON DELETE CASCADE,
  day_of_week text NOT NULL CHECK (day_of_week IN ('sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday')),
  is_working_day boolean DEFAULT true,
  morning_start time DEFAULT '08:00',
  morning_end time DEFAULT '12:00',
  evening_start time DEFAULT '14:00',
  evening_end time DEFAULT '18:00',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id, day_of_week)
);

-- تفعيل RLS
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE working_hours ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان لإعدادات الشركة
CREATE POLICY "Anyone can read company settings"
  ON company_settings
  FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Authenticated users can insert company settings"
  ON company_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update company settings"
  ON company_settings
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete company settings"
  ON company_settings
  FOR DELETE
  TO authenticated
  USING (true);

-- سياسات الأمان لأوقات العمل
CREATE POLICY "Anyone can read working hours"
  ON working_hours
  FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Authenticated users can insert working hours"
  ON working_hours
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update working hours"
  ON working_hours
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete working hours"
  ON working_hours
  FOR DELETE
  TO authenticated
  USING (true);

-- إنشاء فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_working_hours_company_id ON working_hours(company_id);
CREATE INDEX IF NOT EXISTS idx_working_hours_day ON working_hours(day_of_week);

-- إنشاء مشغلات لتحديث updated_at
CREATE TRIGGER update_company_settings_updated_at 
    BEFORE UPDATE ON company_settings 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_working_hours_updated_at 
    BEFORE UPDATE ON working_hours 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- إدراج بيانات افتراضية لإعدادات الشركة
INSERT INTO company_settings (name_ar, name_he, name_en, address_ar, address_he, address_en, phone1) 
VALUES (
  'نعامنة للصرافة',
  'נעאמנה להמרות',
  'Naamneh Exchange',
  'عرابة الشارع الرئيسي',
  'ערבה הרחוב הראשי',
  'Arraba Main Street',
  '05260000841'
) ON CONFLICT DO NOTHING;

-- إدراج أوقات العمل الافتراضية
DO $$
DECLARE
    company_uuid uuid;
    days text[] := ARRAY['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    day_name text;
BEGIN
    -- الحصول على معرف الشركة
    SELECT id INTO company_uuid FROM company_settings LIMIT 1;
    
    -- إدراج أوقات العمل لكل يوم
    FOREACH day_name IN ARRAY days
    LOOP
        INSERT INTO working_hours (
            company_id, 
            day_of_week, 
            is_working_day, 
            morning_start, 
            morning_end, 
            evening_start, 
            evening_end
        ) VALUES (
            company_uuid,
            day_name,
            CASE 
                WHEN day_name IN ('sunday', 'monday', 'tuesday', 'wednesday', 'thursday') THEN true
                ELSE false
            END,
            '08:00',
            '12:00',
            '14:00',
            '18:00'
        ) ON CONFLICT (company_id, day_of_week) DO NOTHING;
    END LOOP;
END $$;