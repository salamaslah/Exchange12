/*
  # إضافة أعمدة الصور لجدول الزبائن

  1. التغييرات على جدول customers
    - إضافة عمود image1_uri (صورة الهوية)
    - إضافة عمود image2_uri (صورة الرخصة/الجواز/المستند الثاني)

  2. البيانات
    - الأعمدة اختيارية ويمكن أن تكون null
*/

-- إضافة أعمدة الصور لجدول الزبائن
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS image1_uri text,
ADD COLUMN IF NOT EXISTS image2_uri text;

-- إضافة تعليقات على الأعمدة الجديدة
COMMENT ON COLUMN customers.image1_uri IS 'رابط صورة الهوية أو المستند الأول';
COMMENT ON COLUMN customers.image2_uri IS 'رابط صورة الرخصة/الجواز أو المستند الثاني';