/*
  # إضافة أعمدة الصور إلى جدول customers

  1. الأعمدة الجديدة
    - `image1_data` (text) - بيانات الصورة الأولى بصيغة base64
    - `image1_type` (text) - نوع الصورة الأولى (image/jpeg, image/png)
    - `image2_data` (text) - بيانات الصورة الثانية بصيغة base64
    - `image2_type` (text) - نوع الصورة الثانية (image/jpeg, image/png)

  2. الملاحظات
    - استخدام text بدلاً من bytea لسهولة التعامل مع base64 strings
    - الأعمدة اختيارية (nullable)
*/

-- إضافة أعمدة الصور
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS image1_data text,
ADD COLUMN IF NOT EXISTS image1_type text,
ADD COLUMN IF NOT EXISTS image2_data text,
ADD COLUMN IF NOT EXISTS image2_type text;

-- إضافة تعليقات توضيحية
COMMENT ON COLUMN customers.image1_data IS 'بيانات الصورة الأولى بصيغة base64 (الهوية/المستند الأول)';
COMMENT ON COLUMN customers.image1_type IS 'نوع الصورة الأولى (image/jpeg, image/png, وغيرها)';
COMMENT ON COLUMN customers.image2_data IS 'بيانات الصورة الثانية بصيغة base64 (الرخصة/الجواز/المستند الثاني)';
COMMENT ON COLUMN customers.image2_type IS 'نوع الصورة الثانية (image/jpeg, image/png, وغيرها)';
