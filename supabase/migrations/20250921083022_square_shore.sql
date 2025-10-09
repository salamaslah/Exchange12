/*
  # إضافة عمود الاسم العبري للعملات

  1. التغييرات على جدول currencies
    - إضافة عمود name_he (اسم العملة بالعبرية)
    - تحديث البيانات الموجودة بالأسماء العبرية

  2. البيانات
    - إضافة الأسماء العبرية لجميع العملات الموجودة
*/

-- إضافة عمود الاسم العبري
ALTER TABLE currencies 
ADD COLUMN IF NOT EXISTS name_he text;

-- تحديث البيانات الموجودة بالأسماء العبرية
UPDATE currencies SET name_he = 'דולר אמריקאי' WHERE code = 'USD';
UPDATE currencies SET name_he = 'יורו' WHERE code = 'EUR';
UPDATE currencies SET name_he = 'לירה שטרלינג' WHERE code = 'GBP';
UPDATE currencies SET name_he = 'פרנק שוויצרי' WHERE code = 'CHF';
UPDATE currencies SET name_he = 'דולר קנדי' WHERE code = 'CAD';
UPDATE currencies SET name_he = 'דולר אוסטרלי' WHERE code = 'AUD';
UPDATE currencies SET name_he = 'ין יפני' WHERE code = 'JPY';
UPDATE currencies SET name_he = 'כתר שוודי' WHERE code = 'SEK';
UPDATE currencies SET name_he = 'כתר נורווגי' WHERE code = 'NOK';
UPDATE currencies SET name_he = 'כתר דני' WHERE code = 'DKK';
UPDATE currencies SET name_he = 'לירה טורקית' WHERE code = 'TRY';
UPDATE currencies SET name_he = 'רובל רוסי' WHERE code = 'RUB';
UPDATE currencies SET name_he = 'יואן סיני' WHERE code = 'CNY';
UPDATE currencies SET name_he = 'וון קוריאני' WHERE code = 'KRW';
UPDATE currencies SET name_he = 'באט תאילנדי' WHERE code = 'THB';
UPDATE currencies SET name_he = 'דולר סינגפורי' WHERE code = 'SGD';
UPDATE currencies SET name_he = 'דולר הונג קונג' WHERE code = 'HKD';
UPDATE currencies SET name_he = 'פזו מקסיקני' WHERE code = 'MXN';
UPDATE currencies SET name_he = 'ריאל ברזילאי' WHERE code = 'BRL';
UPDATE currencies SET name_he = 'דירהם איחוד האמירויות' WHERE code = 'AED';
UPDATE currencies SET name_he = 'ריאל סעודי' WHERE code = 'SAR';
UPDATE currencies SET name_he = 'לירה מצרית' WHERE code = 'EGP';
UPDATE currencies SET name_he = 'דינר ירדני' WHERE code = 'JOD';
UPDATE currencies SET name_he = 'דינר כוויתי' WHERE code = 'KWD';
UPDATE currencies SET name_he = 'ריאל קטארי' WHERE code = 'QAR';

-- إضافة تعليق على العمود الجديد
COMMENT ON COLUMN currencies.name_he IS 'اسم العملة باللغة العبرية';