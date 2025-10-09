/*
  # إضافة أسعار افتراضية للعملات

  1. التغييرات على جدول currencies
    - إضافة أعمدة buy_rate و sell_rate
    - تحديث البيانات الموجودة بأسعار محسوبة من العمولات

  2. البيانات
    - حساب أسعار الشراء والبيع من السعر الحالي والعمولات
*/

-- إضافة أعمدة أسعار الشراء والبيع
ALTER TABLE currencies 
ADD COLUMN IF NOT EXISTS buy_rate decimal(10,4) DEFAULT 0,
ADD COLUMN IF NOT EXISTS sell_rate decimal(10,4) DEFAULT 0;

-- تحديث أسعار الشراء والبيع بناءً على السعر الحالي والعمولات
UPDATE currencies SET 
  buy_rate = current_rate - (buy_commission::decimal / 100),
  sell_rate = current_rate + (sell_commission::decimal / 100)
WHERE current_rate > 0;

-- إضافة تعليقات على الأعمدة
COMMENT ON COLUMN currencies.buy_rate IS 'سعر الشراء (السعر الحالي - عمولة الشراء)';
COMMENT ON COLUMN currencies.sell_rate IS 'سعر البيع (السعر الحالي + عمولة البيع)';

-- إنشاء فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_currencies_buy_rate ON currencies(buy_rate);
CREATE INDEX IF NOT EXISTS idx_currencies_sell_rate ON currencies(sell_rate);