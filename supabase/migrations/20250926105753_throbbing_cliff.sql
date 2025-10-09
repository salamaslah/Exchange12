/*
  # إضافة أسماء الخدمات بالعبرية والإنجليزية

  1. التغييرات على جدول services
    - إضافة عمود service_name_he (اسم الخدمة بالعبرية)
    - إضافة عمود service_name_en (اسم الخدمة بالإنجليزية)
    - تحديث البيانات الموجودة بالترجمات

  2. البيانات
    - إضافة ترجمات لجميع الخدمات الموجودة
    - الحفاظ على service_name كاسم عربي
*/

-- إضافة أعمدة الأسماء بالعبرية والإنجليزية
ALTER TABLE services 
ADD COLUMN IF NOT EXISTS service_name_he text,
ADD COLUMN IF NOT EXISTS service_name_en text;

-- تحديث البيانات الموجودة بالترجمات
UPDATE services SET 
  service_name_he = 'יצירת כרטיס',
  service_name_en = 'Create Card'
WHERE service_number = 1;

UPDATE services SET 
  service_name_he = 'העברה לחו"ל',
  service_name_en = 'International Transfer'
WHERE service_number = 2;

UPDATE services SET 
  service_name_he = 'משיכת העברה',
  service_name_en = 'Receive Transfer'
WHERE service_number = 3;

UPDATE services SET 
  service_name_he = 'פדיון צ\'קים',
  service_name_en = 'Check Cashing'
WHERE service_number = 4;

UPDATE services SET 
  service_name_he = 'העברה לחשבון הבנק',
  service_name_en = 'Bank Account Transfer'
WHERE service_number = 5;

UPDATE services SET 
  service_name_he = 'משיכה מכרטיס',
  service_name_en = 'Card Withdrawal'
WHERE service_number = 6;

UPDATE services SET 
  service_name_he = 'הפקדה בכרטיס',
  service_name_en = 'Card Deposit'
WHERE service_number = 7;

-- إضافة تعليقات على الأعمدة الجديدة
COMMENT ON COLUMN services.service_name_he IS 'اسم الخدمة باللغة العبرية';
COMMENT ON COLUMN services.service_name_en IS 'اسم الخدمة باللغة الإنجليزية';

-- إنشاء فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_services_name_he ON services(service_name_he);
CREATE INDEX IF NOT EXISTS idx_services_name_en ON services(service_name_en);