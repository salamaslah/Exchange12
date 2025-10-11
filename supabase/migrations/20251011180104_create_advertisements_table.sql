/*
  # إنشاء جدول الإعلانات

  1. جدول جديد
    - `advertisements` (الإعلانات)
      - `id` (uuid, primary key)
      - `position` (text) - موقع الإعلان (top, bottom, left, right)
      - `title` (text) - عنوان الإعلان
      - `description` (text) - وصف الإعلان
      - `image_url` (text) - رابط الصورة
      - `is_active` (boolean) - حالة تفعيل الإعلان
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. الأمان
    - تفعيل RLS على الجدول
    - سياسات للقراءة والكتابة للمستخدمين المصرح لهم
*/

-- إنشاء جدول الإعلانات
CREATE TABLE IF NOT EXISTS advertisements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  position text NOT NULL CHECK (position IN ('top', 'bottom', 'left', 'right')),
  title text NOT NULL,
  description text,
  image_url text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- تفعيل RLS
ALTER TABLE advertisements ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان للإعلانات
CREATE POLICY "Anyone can read advertisements"
  ON advertisements
  FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Authenticated users can insert advertisements"
  ON advertisements
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update advertisements"
  ON advertisements
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete advertisements"
  ON advertisements
  FOR DELETE
  TO authenticated
  USING (true);

-- إنشاء فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_advertisements_position ON advertisements(position);
CREATE INDEX IF NOT EXISTS idx_advertisements_active ON advertisements(is_active);

-- إدراج إعلانات افتراضية
INSERT INTO advertisements (position, title, description, image_url, is_active) VALUES
('top', 'Western Union - تحويل للخارج', 'خدمات تحويل الأموال السريعة والآمنة لجميع أنحاء العالم', 'https://images.pexels.com/photos/259027/pexels-photo-259027.jpeg?auto=compress&cs=tinysrgb&w=400', true),
('bottom', 'WorldCom - خدمات الفيزا', 'سحب وإيداع من جميع أنواع بطاقات الفيزا والماستركارد', 'https://images.pexels.com/photos/164527/pexels-photo-164527.jpeg?auto=compress&cs=tinysrgb&w=400', true),
('left', 'MoneyGram - حوالات سريعة', 'استلام وإرسال الحوالات بأسرع وقت وأفضل الأسعار', 'https://images.pexels.com/photos/259200/pexels-photo-259200.jpeg?auto=compress&cs=tinysrgb&w=300', true),
('right', 'صرافة العملات المتميزة', 'أفضل أسعار الصرف في المدينة مع خدمة عملاء ممتازة', 'https://images.pexels.com/photos/259132/pexels-photo-259132.jpeg?auto=compress&cs=tinysrgb&w=300', true)
ON CONFLICT DO NOTHING;