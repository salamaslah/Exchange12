/*
  # إضافة تفاصيل الخدمات

  1. التعديلات
    - إضافة عمود `details_ar` (text) - تفاصيل الخدمة بالعربية
    - إضافة عمود `details_he` (text) - تفاصيل الخدمة بالعبرية
    - إضافة عمود `details_en` (text) - تفاصيل الخدمة بالإنجليزية

  2. البيانات
    - تحديث تفاصيل جميع الخدمات الثمانية
*/

-- إضافة أعمدة التفاصيل
ALTER TABLE services
ADD COLUMN IF NOT EXISTS details_ar text,
ADD COLUMN IF NOT EXISTS details_he text,
ADD COLUMN IF NOT EXISTS details_en text;

-- تحديث تفاصيل الخدمات
UPDATE services SET
  details_ar = 'خدمة إنشاء بطاقة فيزا جديدة للعملاء',
  details_he = 'שירות יצירת כרטיס ויזה חדש ללקוחות',
  details_en = 'Service for creating new visa cards for customers'
WHERE service_number = 1;

UPDATE services SET
  details_ar = 'خدمة تحويل الأموال إلى الخارج عبر شركات التحويل المعتمدة',
  details_he = 'שירות העברת כספים לחו"ל דרך חברות העברה מורשות',
  details_en = 'International money transfer service through authorized companies'
WHERE service_number = 2;

UPDATE services SET
  details_ar = 'خدمة استلام الحوالات المالية من الخارج',
  details_he = 'שירות קבלת העברות כספים מחו"ל',
  details_en = 'Service for receiving money transfers from abroad'
WHERE service_number = 3;

UPDATE services SET
  details_ar = 'خدمة صرف الشيكات البنكية والشخصية',
  details_he = 'שירות פדיון צ\'קים בנקאיים ואישיים',
  details_en = 'Bank and personal check cashing service'
WHERE service_number = 4;

UPDATE services SET
  details_ar = 'خدمة تحويل الأموال إلى حساب البنك التجاري',
  details_he = 'שירות העברת כספים לחשבון הבנק המסחרי',
  details_en = 'Money transfer service to business bank account'
WHERE service_number = 5;

UPDATE services SET
  details_ar = 'خدمة سحب الأموال من بطاقة الفيزا',
  details_he = 'שירות משיכת כספים מכרטיס ויזה',
  details_en = 'Visa card cash withdrawal service'
WHERE service_number = 6;

UPDATE services SET
  details_ar = 'خدمة إيداع الأموال في بطاقة الفيزا',
  details_he = 'שירות הפקדת כספים בכרטיס ויזה',
  details_en = 'Visa card deposit service'
WHERE service_number = 7;

UPDATE services SET
  details_ar = 'خدمة تبديل العملات الأجنبية والمحلية',
  details_he = 'שירות החלפת מטבעות זרים ומקומיים',
  details_en = 'Foreign and local currency exchange service'
WHERE service_number = 8;
