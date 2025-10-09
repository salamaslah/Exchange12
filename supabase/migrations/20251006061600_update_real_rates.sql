/*
  # تحديث أسعار الصرف من ExchangeRate-API

  1. التغييرات
    - تحديث أسعار العملات من API الحقيقي
    - حساب أسعار الشراء والبيع بناءً على العمولات
    - التقريب إلى منزلتين عشريتين

  2. البيانات
    - تحديث 25 عملة
    - المصدر: ExchangeRate-API
    - التاريخ: 6 أكتوبر 2025
*/

-- USD: 1 USD = 3.29 ILS
UPDATE currencies SET
  current_rate = 3.29,
  buy_rate = ROUND((CAST(3.29 AS NUMERIC) - (buy_commission::NUMERIC / 100))::NUMERIC, 2),
  sell_rate = ROUND((CAST(3.29 AS NUMERIC) + (sell_commission::NUMERIC / 100))::NUMERIC, 2),
  updated_at = NOW()
WHERE code = 'USD';

-- EUR: 1 EUR = 3.86 ILS
UPDATE currencies SET
  current_rate = 3.86,
  buy_rate = ROUND((CAST(3.86 AS NUMERIC) - (buy_commission::NUMERIC / 100))::NUMERIC, 2),
  sell_rate = ROUND((CAST(3.86 AS NUMERIC) + (sell_commission::NUMERIC / 100))::NUMERIC, 2),
  updated_at = NOW()
WHERE code = 'EUR';

-- GBP: 1 GBP = 4.42 ILS
UPDATE currencies SET
  current_rate = 4.42,
  buy_rate = ROUND((CAST(4.42 AS NUMERIC) - (buy_commission::NUMERIC / 100))::NUMERIC, 2),
  sell_rate = ROUND((CAST(4.42 AS NUMERIC) + (sell_commission::NUMERIC / 100))::NUMERIC, 2),
  updated_at = NOW()
WHERE code = 'GBP';

-- SAR: 1 SAR = 0.88 ILS
UPDATE currencies SET
  current_rate = 0.88,
  buy_rate = ROUND((CAST(0.88 AS NUMERIC) - (buy_commission::NUMERIC / 100))::NUMERIC, 2),
  sell_rate = ROUND((CAST(0.88 AS NUMERIC) + (sell_commission::NUMERIC / 100))::NUMERIC, 2),
  updated_at = NOW()
WHERE code = 'SAR';

-- AED: 1 AED = 0.9 ILS
UPDATE currencies SET
  current_rate = 0.9,
  buy_rate = ROUND((CAST(0.9 AS NUMERIC) - (buy_commission::NUMERIC / 100))::NUMERIC, 2),
  sell_rate = ROUND((CAST(0.9 AS NUMERIC) + (sell_commission::NUMERIC / 100))::NUMERIC, 2),
  updated_at = NOW()
WHERE code = 'AED';

-- JOD: 1 JOD = 4.64 ILS
UPDATE currencies SET
  current_rate = 4.64,
  buy_rate = ROUND((CAST(4.64 AS NUMERIC) - (buy_commission::NUMERIC / 100))::NUMERIC, 2),
  sell_rate = ROUND((CAST(4.64 AS NUMERIC) + (sell_commission::NUMERIC / 100))::NUMERIC, 2),
  updated_at = NOW()
WHERE code = 'JOD';

-- KWD: 1 KWD = 10.87 ILS
UPDATE currencies SET
  current_rate = 10.87,
  buy_rate = ROUND((CAST(10.87 AS NUMERIC) - (buy_commission::NUMERIC / 100))::NUMERIC, 2),
  sell_rate = ROUND((CAST(10.87 AS NUMERIC) + (sell_commission::NUMERIC / 100))::NUMERIC, 2),
  updated_at = NOW()
WHERE code = 'KWD';

-- QAR: 1 QAR = 0.9 ILS
UPDATE currencies SET
  current_rate = 0.9,
  buy_rate = ROUND((CAST(0.9 AS NUMERIC) - (buy_commission::NUMERIC / 100))::NUMERIC, 2),
  sell_rate = ROUND((CAST(0.9 AS NUMERIC) + (sell_commission::NUMERIC / 100))::NUMERIC, 2),
  updated_at = NOW()
WHERE code = 'QAR';

-- EGP: 1 EGP = 0.07 ILS
UPDATE currencies SET
  current_rate = 0.07,
  buy_rate = ROUND((CAST(0.07 AS NUMERIC) - (buy_commission::NUMERIC / 100))::NUMERIC, 2),
  sell_rate = ROUND((CAST(0.07 AS NUMERIC) + (sell_commission::NUMERIC / 100))::NUMERIC, 2),
  updated_at = NOW()
WHERE code = 'EGP';

-- TRY: 1 TRY = 0.12 ILS
UPDATE currencies SET
  current_rate = 0.12,
  buy_rate = ROUND((CAST(0.12 AS NUMERIC) - (buy_commission::NUMERIC / 100))::NUMERIC, 2),
  sell_rate = ROUND((CAST(0.12 AS NUMERIC) + (sell_commission::NUMERIC / 100))::NUMERIC, 2),
  updated_at = NOW()
WHERE code = 'TRY';

-- CAD: 1 CAD = 2.36 ILS
UPDATE currencies SET
  current_rate = 2.36,
  buy_rate = ROUND((CAST(2.36 AS NUMERIC) - (buy_commission::NUMERIC / 100))::NUMERIC, 2),
  sell_rate = ROUND((CAST(2.36 AS NUMERIC) + (sell_commission::NUMERIC / 100))::NUMERIC, 2),
  updated_at = NOW()
WHERE code = 'CAD';

-- AUD: 1 AUD = 2.17 ILS
UPDATE currencies SET
  current_rate = 2.17,
  buy_rate = ROUND((CAST(2.17 AS NUMERIC) - (buy_commission::NUMERIC / 100))::NUMERIC, 2),
  sell_rate = ROUND((CAST(2.17 AS NUMERIC) + (sell_commission::NUMERIC / 100))::NUMERIC, 2),
  updated_at = NOW()
WHERE code = 'AUD';

-- CHF: 1 CHF = 4.14 ILS
UPDATE currencies SET
  current_rate = 4.14,
  buy_rate = ROUND((CAST(4.14 AS NUMERIC) - (buy_commission::NUMERIC / 100))::NUMERIC, 2),
  sell_rate = ROUND((CAST(4.14 AS NUMERIC) + (sell_commission::NUMERIC / 100))::NUMERIC, 2),
  updated_at = NOW()
WHERE code = 'CHF';

-- JPY: 1 JPY = 0.02 ILS
UPDATE currencies SET
  current_rate = 0.02,
  buy_rate = ROUND((CAST(0.02 AS NUMERIC) - (buy_commission::NUMERIC / 100))::NUMERIC, 2),
  sell_rate = ROUND((CAST(0.02 AS NUMERIC) + (sell_commission::NUMERIC / 100))::NUMERIC, 2),
  updated_at = NOW()
WHERE code = 'JPY';

-- CNY: 1 CNY = 0.46 ILS
UPDATE currencies SET
  current_rate = 0.46,
  buy_rate = ROUND((CAST(0.46 AS NUMERIC) - (buy_commission::NUMERIC / 100))::NUMERIC, 2),
  sell_rate = ROUND((CAST(0.46 AS NUMERIC) + (sell_commission::NUMERIC / 100))::NUMERIC, 2),
  updated_at = NOW()
WHERE code = 'CNY';

-- RUB: 1 RUB = 0.03 ILS
UPDATE currencies SET
  current_rate = 0.03,
  buy_rate = ROUND((CAST(0.03 AS NUMERIC) - (buy_commission::NUMERIC / 100))::NUMERIC, 2),
  sell_rate = ROUND((CAST(0.03 AS NUMERIC) + (sell_commission::NUMERIC / 100))::NUMERIC, 2),
  updated_at = NOW()
WHERE code = 'RUB';

-- SEK: 1 SEK = 0.35 ILS
UPDATE currencies SET
  current_rate = 0.35,
  buy_rate = ROUND((CAST(0.35 AS NUMERIC) - (buy_commission::NUMERIC / 100))::NUMERIC, 2),
  sell_rate = ROUND((CAST(0.35 AS NUMERIC) + (sell_commission::NUMERIC / 100))::NUMERIC, 2),
  updated_at = NOW()
WHERE code = 'SEK';

-- NOK: 1 NOK = 0.32 ILS
UPDATE currencies SET
  current_rate = 0.32,
  buy_rate = ROUND((CAST(0.32 AS NUMERIC) - (buy_commission::NUMERIC / 100))::NUMERIC, 2),
  sell_rate = ROUND((CAST(0.32 AS NUMERIC) + (sell_commission::NUMERIC / 100))::NUMERIC, 2),
  updated_at = NOW()
WHERE code = 'NOK';

-- DKK: 1 DKK = 0.52 ILS
UPDATE currencies SET
  current_rate = 0.52,
  buy_rate = ROUND((CAST(0.52 AS NUMERIC) - (buy_commission::NUMERIC / 100))::NUMERIC, 2),
  sell_rate = ROUND((CAST(0.52 AS NUMERIC) + (sell_commission::NUMERIC / 100))::NUMERIC, 2),
  updated_at = NOW()
WHERE code = 'DKK';

-- SGD: 1 SGD = 2.55 ILS
UPDATE currencies SET
  current_rate = 2.55,
  buy_rate = ROUND((CAST(2.55 AS NUMERIC) - (buy_commission::NUMERIC / 100))::NUMERIC, 2),
  sell_rate = ROUND((CAST(2.55 AS NUMERIC) + (sell_commission::NUMERIC / 100))::NUMERIC, 2),
  updated_at = NOW()
WHERE code = 'SGD';

-- HKD: 1 HKD = 0.42 ILS
UPDATE currencies SET
  current_rate = 0.42,
  buy_rate = ROUND((CAST(0.42 AS NUMERIC) - (buy_commission::NUMERIC / 100))::NUMERIC, 2),
  sell_rate = ROUND((CAST(0.42 AS NUMERIC) + (sell_commission::NUMERIC / 100))::NUMERIC, 2),
  updated_at = NOW()
WHERE code = 'HKD';

-- KRW: 1 KRW = 0.0025 ILS (adjusted - was rounding to 0)
UPDATE currencies SET
  current_rate = 0.0025,
  buy_rate = ROUND((CAST(0.0025 AS NUMERIC) - (buy_commission::NUMERIC / 100))::NUMERIC, 4),
  sell_rate = ROUND((CAST(0.0025 AS NUMERIC) + (sell_commission::NUMERIC / 100))::NUMERIC, 4),
  updated_at = NOW()
WHERE code = 'KRW';

-- THB: 1 THB = 0.1 ILS
UPDATE currencies SET
  current_rate = 0.1,
  buy_rate = ROUND((CAST(0.1 AS NUMERIC) - (buy_commission::NUMERIC / 100))::NUMERIC, 2),
  sell_rate = ROUND((CAST(0.1 AS NUMERIC) + (sell_commission::NUMERIC / 100))::NUMERIC, 2),
  updated_at = NOW()
WHERE code = 'THB';

-- MXN: 1 MXN = 0.19 ILS
UPDATE currencies SET
  current_rate = 0.19,
  buy_rate = ROUND((CAST(0.19 AS NUMERIC) - (buy_commission::NUMERIC / 100))::NUMERIC, 2),
  sell_rate = ROUND((CAST(0.19 AS NUMERIC) + (sell_commission::NUMERIC / 100))::NUMERIC, 2),
  updated_at = NOW()
WHERE code = 'MXN';

-- BRL: 1 BRL = 0.62 ILS
UPDATE currencies SET
  current_rate = 0.62,
  buy_rate = ROUND((CAST(0.62 AS NUMERIC) - (buy_commission::NUMERIC / 100))::NUMERIC, 2),
  sell_rate = ROUND((CAST(0.62 AS NUMERIC) + (sell_commission::NUMERIC / 100))::NUMERIC, 2),
  updated_at = NOW()
WHERE code = 'BRL';
