import AsyncStorage from '@react-native-async-storage/async-storage';
import { currencyService, supabase } from './supabase';

// ExchangeRate-API service
export class ExchangeRateAPIService {
  private apiKey: string = '6375a29a46d85cb492b9e541';
  private baseUrl: string = 'https://v6.exchangerate-api.com/v6';
  private baseCurrency: string = 'ILS'; // الشيقل كعملة أساسية
  private updateInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.loadApiKey();
  }

  // تحميل مفتاح API من المتغيرات البيئية أو التخزين المحلي
  private async loadApiKey() {
    try {
      // محاولة جلب المفتاح من المتغيرات البيئية أولاً
      const envApiKey = process.env.EXPO_PUBLIC_EXCHANGERATE_API_KEY;
      if (envApiKey) {
        this.apiKey = envApiKey;
        console.log('✅ تم تحميل مفتاح API من المتغيرات البيئية');
        return;
      }

      // إذا لم يكن في المتغيرات البيئية، جلبه من التخزين المحلي
      const savedApiKey = await AsyncStorage.getItem('exchangerate_api_key');
      if (savedApiKey) {
        this.apiKey = savedApiKey;
        console.log('✅ تم تحميل مفتاح API من التخزين المحلي');
      } else {
        console.log('⚠️ لم يتم العثور على مفتاح API - يرجى إدخاله في الإعدادات');
      }
    } catch (error) {
      console.error('❌ خطأ في تحميل مفتاح API:', error);
    }
  }

  // حفظ مفتاح API
  async setApiKey(apiKey: string) {
    try {
      this.apiKey = apiKey;
      await AsyncStorage.setItem('exchangerate_api_key', apiKey);
      console.log('✅ تم حفظ مفتاح API بنجاح');
      return true;
    } catch (error) {
      console.error('❌ خطأ في حفظ مفتاح API:', error);
      return false;
    }
  }

  // التحقق من صحة مفتاح API
  async validateApiKey(apiKey?: string): Promise<boolean> {
    const keyToTest = apiKey || this.apiKey;
    if (!keyToTest) return false;

    try {
      const response = await fetch(`${this.baseUrl}/${keyToTest}/latest/${this.baseCurrency}`);
      const data = await response.json();
      
      if (data.result === 'success') {
        console.log('✅ مفتاح API صحيح');
        return true;
      } else {
        console.log('❌ مفتاح API غير صحيح:', data.error_type);
        return false;
      }
    } catch (error) {
      console.error('❌ خطأ في التحقق من مفتاح API:', error);
      return false;
    }
  }

  // جلب أسعار العملات من API
  async fetchExchangeRates(): Promise<{ success: boolean; rates?: any; error?: string }> {
    if (!this.apiKey) {
      return { success: false, error: 'مفتاح API غير موجود' };
    }

    try {
      console.log('🔄 جلب أسعار العملات من ExchangeRate-API...');
      
      const response = await fetch(`${this.baseUrl}/${this.apiKey}/latest/${this.baseCurrency}`);
      const data = await response.json();

      if (data.result === 'success') {
        console.log('✅ تم جلب أسعار العملات بنجاح');
        
        // تحويل الأسعار (من الشيقل إلى العملات الأخرى إلى العكس)
        const convertedRates: { [key: string]: number } = {};

        for (const [currency, rate] of Object.entries(data.conversion_rates)) {
          if (typeof rate === 'number' && rate > 0) {
            // تحويل من "1 شيقل = X عملة أجنبية" إلى "1 عملة أجنبية = X شيقل"
            // وتقريب إلى منزلتين عشريتين
            const convertedRate = 1 / rate;
            convertedRates[currency] = Math.round(convertedRate * 100) / 100;
          }
        }

        return { 
          success: true, 
          rates: convertedRates,
        };
      } else {
        console.error('❌ خطأ من API:', data.error_type);
        return { success: false, error: data.error_type };
      }
    } catch (error) {
      console.error('❌ خطأ في جلب أسعار العملات:', error);
      return { success: false, error: 'خطأ في الاتصال بالخدمة' };
    }
  }

  // التحقق من الحاجة لتحديث الأسعار (كل 5 دقائق)
  async shouldUpdateRates(): Promise<boolean> {
    try {
      if (!supabase) {
        console.log('⚠️ Supabase غير متوفر، استخدام التحديث الفوري');
        return true;
      }

      const { data, error } = await supabase
        .from('currency_update_log')
        .select('last_update')
        .maybeSingle();

      if (error) {
        console.error('❌ خطأ في جلب آخر تحديث:', error);
        return true;
      }

      if (!data) {
        console.log('⚠️ لا يوجد سجل تحديث، سيتم التحديث الآن');
        return true;
      }

      const lastUpdate = new Date(data.last_update);
      const now = new Date();
      const diffMinutes = (now.getTime() - lastUpdate.getTime()) / 60000;

      console.log(`⏱️ آخر تحديث كان قبل ${diffMinutes.toFixed(1)} دقيقة`);

      return diffMinutes >= 5;
    } catch (error) {
      console.error('❌ خطأ في التحقق من وقت التحديث:', error);
      return true;
    }
  }

  // تحديث وقت آخر تحديث في قاعدة البيانات
  async updateLastUpdateTime(): Promise<void> {
    try {
      if (!supabase) {
        console.log('⚠️ Supabase غير متوفر، لن يتم تحديث وقت التحديث');
        return;
      }

      const now = new Date().toISOString();

      // محاولة الحصول على السجل الموجود
      const { data: existingLog } = await supabase
        .from('currency_update_log')
        .select('id')
        .maybeSingle();

      if (existingLog) {
        // تحديث السجل الموجود
        const { error } = await supabase
          .from('currency_update_log')
          .update({
            last_update: now,
            updated_at: now
          })
          .eq('id', existingLog.id);

        if (error) {
          console.error('❌ خطأ في تحديث وقت التحديث:', error);
        } else {
          console.log(`✅ تم تحديث وقت آخر تحديث: ${now}`);
        }
      } else {
        // إنشاء سجل جديد
        const { error } = await supabase
          .from('currency_update_log')
          .insert({
            last_update: now,
            created_at: now,
            updated_at: now
          });

        if (error) {
          console.error('❌ خطأ في إنشاء سجل التحديث:', error);
        } else {
          console.log(`✅ تم إنشاء سجل تحديث جديد: ${now}`);
        }
      }

      // حفظ في التخزين المحلي أيضاً
      await AsyncStorage.setItem('lastRatesUpdate', new Date().toLocaleString('ar'));
      await AsyncStorage.setItem('lastApiUpdate', now);
    } catch (error) {
      console.error('❌ خطأ في تحديث وقت التحديث:', error);
    }
  }

  // تحديث أسعار العملات في قاعدة البيانات
  async updateCurrencyRatesInDatabase(): Promise<{ success: boolean; updatedCount?: number; error?: string }> {
    try {
      console.log('🔄 بدء تحديث أسعار العملات في قاعدة البيانات...');

      // التحقق من الحاجة للتحديث
      const shouldUpdate = await this.shouldUpdateRates();
      if (!shouldUpdate) {
        console.log('⏭️ لم يمر 5 دقائق بعد، لا حاجة للتحديث');
        return { success: true, updatedCount: 0 };
      }

      // جلب الأسعار من API
      const ratesResult = await this.fetchExchangeRates();
      if (!ratesResult.success || !ratesResult.rates) {
        return { success: false, error: ratesResult.error };
      }

      // جلب العملات من قاعدة البيانات
      const currencies = await currencyService.getAll();
      if (!currencies || currencies.length === 0) {
        return { success: false, error: 'لا توجد عملات في قاعدة البيانات' };
      }

      let updatedCount = 0;

      // تحديث كل عملة
      for (const currency of currencies) {
        const apiRate = ratesResult.rates[currency.code];

        if (apiRate && apiRate > 0) {
          // حساب أسعار الشراء والبيع بناءً على العمولات
          const buyCommissionShekel = (currency.buy_commission || 6) / 100;
          const sellCommissionShekel = (currency.sell_commission || 6) / 100;

          // تقريب السعر الأساسي لمنزلتين
          const roundedRate = Math.round(apiRate * 100) / 100;

          // حساب أسعار الشراء والبيع وتقريبها
          const buyRate = Math.round((roundedRate - buyCommissionShekel) * 100) / 100;
          const sellRate = Math.round((roundedRate + sellCommissionShekel) * 100) / 100;

          // تحديث العملة في قاعدة البيانات
          await currencyService.update(currency.id, {
            current_rate: roundedRate,
            buy_rate: buyRate,
            sell_rate: sellRate,
            updated_at: new Date().toISOString()
          });

          updatedCount++;
          console.log(`✅ تم تحديث ${currency.name_ar} (${currency.code}): ${roundedRate.toFixed(2)}`);
        } else {
          console.log(`⚠️ لم يتم العثور على سعر ${currency.name_ar} (${currency.code}) في API`);
        }
      }

      // تحديث وقت آخر تحديث في قاعدة البيانات
      await this.updateLastUpdateTime();

      console.log(`✅ تم تحديث ${updatedCount} عملة في قاعدة البيانات`);

      return { success: true, updatedCount };

    } catch (error) {
      console.error('❌ خطأ في تحديث أسعار العملات في قاعدة البيانات:', error);
      return { success: false, error: 'خطأ في تحديث قاعدة البيانات' };
    }
  }

  // بدء التحديث التلقائي كل 5 دقائق
  startAutoUpdate() {
    // إيقاف التحديث السابق إن وجد
    this.stopAutoUpdate();

    console.log('🔄 بدء التحديث التلقائي للأسعار كل 5 دقائق...');

    // تحديث فوري
    this.updateCurrencyRatesInDatabase();

    // تحديث كل 5 دقائق (300000 مللي ثانية)
    this.updateInterval = setInterval(async () => {
      console.log('⏰ تحديث تلقائي للأسعار...');
      await this.updateCurrencyRatesInDatabase();
    }, 5 * 60 * 1000);
  }

  // إيقاف التحديث التلقائي
  stopAutoUpdate() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
      console.log('⏹️ تم إيقاف التحديث التلقائي للأسعار');
    }
  }

  // التحقق من حالة التحديث التلقائي
  isAutoUpdateRunning(): boolean {
    return this.updateInterval !== null;
  }

  // جلب معلومات آخر تحديث
  async getLastUpdateInfo(): Promise<{ lastUpdate?: string; lastApiUpdate?: string }> {
    try {
      // محاولة الحصول على البيانات من قاعدة البيانات أولاً
      if (supabase) {
        const { data } = await supabase
          .from('currency_update_log')
          .select('last_update')
          .maybeSingle();

        if (data) {
          const lastUpdate = new Date(data.last_update);
          return {
            lastUpdate: lastUpdate.toLocaleString('ar'),
            lastApiUpdate: data.last_update
          };
        }
      }

      // الرجوع للتخزين المحلي إذا لم يكن هناك بيانات
      const lastUpdate = await AsyncStorage.getItem('lastRatesUpdate');
      const lastApiUpdate = await AsyncStorage.getItem('lastApiUpdate');

      return {
        lastUpdate: lastUpdate || undefined,
        lastApiUpdate: lastApiUpdate || undefined
      };
    } catch (error) {
      console.error('خطأ في جلب معلومات آخر تحديث:', error);
      return {};
    }
  }

  // إحصائيات الاستخدام
  async getUsageStats(): Promise<{ success: boolean; stats?: any; error?: string }> {
    if (!this.apiKey) {
      return { success: false, error: 'مفتاح API غير موجود' };
    }

    try {
      const response = await fetch(`${this.baseUrl}/${this.apiKey}/quota`);
      const data = await response.json();

      if (data.result === 'success') {
        return { 
          success: true, 
          stats: {
            plan_quota: data.plan_quota,
            requests_used: data.requests_used,
            requests_remaining: data.requests_remaining
          }
        };
      } else {
        return { success: false, error: data.error_type };
      }
    } catch (error) {
      console.error('خطأ في جلب إحصائيات الاستخدام:', error);
      return { success: false, error: 'خطأ في الاتصال بالخدمة' };
    }
  }
}

// إنشاء instance واحد للاستخدام في التطبيق
export const exchangeRateAPI = new ExchangeRateAPIService();