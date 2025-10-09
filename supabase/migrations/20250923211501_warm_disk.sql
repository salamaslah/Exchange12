/*
  # إضافة عمود سعر العملة

  1. التغييرات على جدول currencies
    - إضافة عمود current_rate (سعر العملة الحالي)
    - تحديث البيانات الموجودة بأسعار افتراضية

  2. البيانات
    - إضافة أسعار افتراضية لجميع العملات الموجودة
*/

-- إضافة عمود سعر العملة الحالي
ALTER TABLE currencies 
ADD COLUMN IF NOT EXISTS current_rate decimal(10,4) DEFAULT 0;

-- تحديث البيانات الموجودة بأسعار افتراضية
UPDATE currencies SET current_rate = 3.65 WHERE code = 'USD';
UPDATE currencies SET current_rate = 3.95 WHERE code = 'EUR';
UPDATE currencies SET current_rate = 4.60 WHERE code = 'GBP';
UPDATE currencies SET current_rate = 4.10 WHERE code = 'CHF';
UPDATE currencies SET current_rate = 2.70 WHERE code = 'CAD';
UPDATE currencies SET current_rate = 2.40 WHERE code = 'AUD';
UPDATE currencies SET current_rate = 0.025 WHERE code = 'JPY';
UPDATE currencies SET current_rate = 0.35 WHERE code = 'SEK';
UPDATE currencies SET current_rate = 0.34 WHERE code = 'NOK';
UPDATE currencies SET current_rate = 0.54 WHERE code = 'DKK';
UPDATE currencies SET current_rate = 0.12 WHERE code = 'TRY';
UPDATE currencies SET current_rate = 0.037 WHERE code = 'RUB';
UPDATE currencies SET current_rate = 0.51 WHERE code = 'CNY';
UPDATE currencies SET current_rate = 0.0028 WHERE code = 'KRW';
UPDATE currencies SET current_rate = 0.105 WHERE code = 'THB';
UPDATE currencies SET current_rate = 2.75 WHERE code = 'SGD';
UPDATE currencies SET current_rate = 0.48 WHERE code = 'HKD';
UPDATE currencies SET current_rate = 0.19 WHERE code = 'MXN';
UPDATE currencies SET current_rate = 0.62 WHERE code = 'BRL';
UPDATE currencies SET current_rate = 1.00 WHERE code = 'AED';
UPDATE currencies SET current_rate = 0.98 WHERE code = 'SAR';
UPDATE currencies SET current_rate = 0.075 WHERE code = 'EGP';
UPDATE currencies SET current_rate = 5.20 WHERE code = 'JOD';
UPDATE currencies SET current_rate = 12.00 WHERE code = 'KWD';
UPDATE currencies SET current_rate = 1.01 WHERE code = 'QAR';

-- إضافة تعليق على العمود الجديد
COMMENT ON COLUMN currencies.current_rate IS 'سعر العملة الحالي مقابل الشيقل';

-- إنشاء فهرس للأداء
CREATE INDEX IF NOT EXISTS idx_currencies_current_rate ON currencies(current_rate);