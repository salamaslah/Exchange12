/*
  # تحديث جدول الزبائن لحفظ الصور

  1. التغييرات على جدول customers
    - تغيير نوع أعمدة الصور من text إلى bytea لحفظ البيانات الثنائية
    - إضافة أعمدة لحفظ أنواع الصور (MIME types)

  2. الأعمدة الجديدة
    - image1_data (bytea) - بيانات الصورة الأولى
    - image1_type (text) - نوع الصورة الأولى (image/jpeg, image/png)
    - image2_data (bytea) - بيانات الصورة الثانية  
    - image2_type (text) - نوع الصورة الثانية
*/

-- إزالة الأعمدة القديمة إذا كانت موجودة
ALTER TABLE customers 
DROP COLUMN IF EXISTS image1_uri,
DROP COLUMN IF EXISTS image2_uri;

-- إضافة أعمدة الصور الجديدة
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS image1_data bytea,
ADD COLUMN IF NOT EXISTS image1_type text,
ADD COLUMN IF NOT EXISTS image2_data bytea,
ADD COLUMN IF NOT EXISTS image2_type text;

-- إضافة تعليقات على الأعمدة الجديدة
COMMENT ON COLUMN customers.image1_data IS 'بيانات الصورة الأولى (الهوية/المستند الأول)';
COMMENT ON COLUMN customers.image1_type IS 'نوع الصورة الأولى (image/jpeg, image/png)';
COMMENT ON COLUMN customers.image2_data IS 'بيانات الصورة الثانية (الرخصة/الجواز/المستند الثاني)';
COMMENT ON COLUMN customers.image2_type IS 'نوع الصورة الثانية (image/jpeg, image/png)';