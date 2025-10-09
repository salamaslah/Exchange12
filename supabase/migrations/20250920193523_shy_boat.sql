/*
  # تحديث هيكل جدول العملات

  1. التغييرات على جدول currencies
    - إزالة أعمدة buy_rate و sell_rate (لأن الأسعار تُجلب من الموقع)
    - إضافة عمود buy_commission (عمولة الشراء بالأجورات)
    - إضافة عمود sell_commission (عمولة البيع بالأجورات)
    - إضافة عمود is_active (لتفعيل/تعطيل العملة)

  2. البيانات الافتراضية
    - تحديث العملات الموجودة بالعمولات الافتراضية
    - إضافة المزيد من العملات المدعومة
*/

-- إضافة الأعمدة الجديدة
ALTER TABLE currencies 
ADD COLUMN IF NOT EXISTS buy_commission integer DEFAULT 6,
ADD COLUMN IF NOT EXISTS sell_commission integer DEFAULT 6,
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- إزالة الأعمدة القديمة (الأسعار)
ALTER TABLE currencies 
DROP COLUMN IF EXISTS buy_rate,
DROP COLUMN IF EXISTS sell_rate;

-- تحديث البيانات الموجودة
UPDATE currencies SET 
  buy_commission = 6,
  sell_commission = 6,
  is_active = true
WHERE buy_commission IS NULL OR sell_commission IS NULL;

-- حذف البيانات القديمة وإعادة إدراج البيانات المحدثة
DELETE FROM currencies;

-- إدراج العملات الأساسية مع العمولات
INSERT INTO currencies (name_ar, name_en, code, buy_commission, sell_commission, is_active) VALUES
('دولار أمريكي', 'US Dollar', 'USD', 6, 6, true),
('يورو', 'Euro', 'EUR', 6, 6, true),
('جنيه إسترليني', 'British Pound', 'GBP', 8, 8, false),
('فرنك سويسري', 'Swiss Franc', 'CHF', 8, 8, false),
('دولار كندي', 'Canadian Dollar', 'CAD', 8, 8, false),
('دولار أسترالي', 'Australian Dollar', 'AUD', 8, 8, false),
('ين ياباني', 'Japanese Yen', 'JPY', 10, 10, false),
('كرونة سويدية', 'Swedish Krona', 'SEK', 10, 10, false),
('كرونة نرويجية', 'Norwegian Krone', 'NOK', 10, 10, false),
('كرونة دنماركية', 'Danish Krone', 'DKK', 10, 10, false),
('ليرة تركية', 'Turkish Lira', 'TRY', 12, 12, false),
('روبل روسي', 'Russian Ruble', 'RUB', 15, 15, false),
('يوان صيني', 'Chinese Yuan', 'CNY', 10, 10, false),
('وون كوري', 'Korean Won', 'KRW', 15, 15, false),
('بات تايلندي', 'Thai Baht', 'THB', 12, 12, false),
('دولار سنغافوري', 'Singapore Dollar', 'SGD', 8, 8, false),
('دولار هونغ كونغ', 'Hong Kong Dollar', 'HKD', 10, 10, false),
('بيزو مكسيكي', 'Mexican Peso', 'MXN', 15, 15, false),
('ريال برازيلي', 'Brazilian Real', 'BRL', 12, 12, false),
('درهم إماراتي', 'UAE Dirham', 'AED', 5, 5, false),
('ريال سعودي', 'Saudi Riyal', 'SAR', 5, 5, false),
('جنيه مصري', 'Egyptian Pound', 'EGP', 20, 20, false),
('دينار أردني', 'Jordanian Dinar', 'JOD', 8, 8, false),
('دينار كويتي', 'Kuwaiti Dinar', 'KWD', 8, 8, false),
('ريال قطري', 'Qatari Riyal', 'QAR', 5, 5, false);

-- إنشاء فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_currencies_is_active ON currencies(is_active);
CREATE INDEX IF NOT EXISTS idx_currencies_code_active ON currencies(code, is_active);

-- تحديث التعليقات
COMMENT ON COLUMN currencies.buy_commission IS 'عمولة الشراء بالأجورات (100 أجورة = 1 شيقل)';
COMMENT ON COLUMN currencies.sell_commission IS 'عمولة البيع بالأجورات (100 أجورة = 1 شيقل)';
COMMENT ON COLUMN currencies.is_active IS 'حالة تفعيل العملة في النظام';