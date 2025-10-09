const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://drmfvptsuvrqmsqtpzse.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRybWZ2cHRzdXZycW1zcXRwenNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwOTE0MzEsImV4cCI6MjA3MzY2NzQzMX0.nhamOt3pYR3BnS8cSS0pjYZD5xUtLR50h0bkRfnRUj4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRates() {
  console.log('📋 الأسعار الحالية في قاعدة البيانات:\n');

  const { data, error } = await supabase
    .from('currencies')
    .select('code, current_rate, updated_at')
    .order('code');

  if (error) {
    console.error('❌ خطأ:', error);
    return;
  }

  data.forEach(c => {
    const rate = c.current_rate ? c.current_rate.toFixed(2) : 'N/A';
    const date = new Date(c.updated_at).toLocaleString('ar');
    console.log(c.code + ': ' + rate + ' ₪ (آخر تحديث: ' + date + ')');
  });

  console.log('\n✅ إجمالي: ' + data.length + ' عملة');
}

checkRates().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
