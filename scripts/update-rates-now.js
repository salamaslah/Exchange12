const { createClient } = require('@supabase/supabase-js');

// تكوين Supabase
const supabaseUrl = 'https://drmfvptsuvrqmsqtpzse.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRybWZ2cHRzdXZycW1zcXRwenNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwOTE0MzEsImV4cCI6MjA3MzY2NzQzMX0.nhamOt3pYR3BnS8cSS0pjYZD5xUtLR50h0bkRfnRUj4';

const supabase = createClient(supabaseUrl, supabaseKey);

// الأسعار الحقيقية من ExchangeRate-API
const rates = {
  'USD': 3.29,
  'EUR': 3.86,
  'GBP': 4.42,
  'SAR': 0.88,
  'AED': 0.90,
  'JOD': 4.64,
  'KWD': 10.87,
  'QAR': 0.90,
  'EGP': 0.07,
  'TRY': 0.12,
  'CAD': 2.36,
  'AUD': 2.17,
  'CHF': 4.14,
  'JPY': 0.02,
  'CNY': 0.46,
  'RUB': 0.03,
  'SEK': 0.35,
  'NOK': 0.32,
  'DKK': 0.52,
  'SGD': 2.55,
  'HKD': 0.42,
  'KRW': 0.0025,
  'THB': 0.10,
  'MXN': 0.19,
  'BRL': 0.62
};

async function updateRates() {
  console.log('🔄 بدء تحديث الأسعار...\n');

  let successCount = 0;
  let errorCount = 0;

  for (const [code, currentRate] of Object.entries(rates)) {
    try {
      // جلب العملة للحصول على العمولات
      const { data: currency, error: fetchError } = await supabase
        .from('currencies')
        .select('id, buy_commission, sell_commission')
        .eq('code', code)
        .single();

      if (fetchError) {
        console.log(`⚠️  ${code}: العملة غير موجودة`);
        errorCount++;
        continue;
      }

      // حساب أسعار الشراء والبيع
      const buyCommission = (currency.buy_commission || 6) / 100;
      const sellCommission = (currency.sell_commission || 6) / 100;

      const buyRate = Math.round((currentRate - buyCommission) * 100) / 100;
      const sellRate = Math.round((currentRate + sellCommission) * 100) / 100;

      // تحديث العملة (فقط current_rate)
      const { error: updateError } = await supabase
        .from('currencies')
        .update({
          current_rate: currentRate,
          updated_at: new Date().toISOString()
        })
        .eq('id', currency.id);

      if (updateError) {
        console.log(`❌ ${code}: خطأ في التحديث`);
        console.error(updateError);
        errorCount++;
      } else {
        console.log(`✅ ${code}: ${currentRate.toFixed(2)} | شراء: ${buyRate.toFixed(2)} | بيع: ${sellRate.toFixed(2)}`);
        successCount++;
      }

    } catch (error) {
      console.error(`❌ ${code}: خطأ غير متوقع`, error.message);
      errorCount++;
    }
  }

  console.log(`\n📊 النتائج:`);
  console.log(`   ✅ تم التحديث بنجاح: ${successCount} عملة`);
  console.log(`   ❌ فشل التحديث: ${errorCount} عملة`);
  console.log(`   📅 وقت التحديث: ${new Date().toLocaleString('ar')}`);
}

updateRates()
  .then(() => {
    console.log('\n✅ تم الانتهاء من التحديث!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ خطأ عام:', error);
    process.exit(1);
  });
