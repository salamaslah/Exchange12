import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

// Initialize Supabase client with fallback values
// Try to get from process.env first, then from Constants.expoConfig.extra
const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_URL ||
  'https://drmfvptsuvrqmsqtpzse.supabase.co';

const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRybWZ2cHRzdXZycW1zcXRwenNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwOTE0MzEsImV4cCI6MjA3MzY2NzQzMX0.nhamOt3pYR3BnS8cSS0pjYZD5xUtLR50h0bkRfnRUj4';

console.log('🔗 Supabase Configuration:');
console.log('   URL:', supabaseUrl);
console.log('   Key:', supabaseAnonKey ? '✅ موجود' : '❌ غير موجود');

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper function to check if Supabase is configured
export const isSupabaseConfigured = () => {
  return supabase !== null;
};

// Currency service
export const currencyService = {
  async getAll(shopUsername?: string, shopId?: string) {
    try {
      console.log('🔄 جلب جميع العملات من قاعدة البيانات...');

      // جلب العمولات والأسعار الخاصة بالمحل من جدول العمولات
      let shopCommissions: { [code: string]: { buy: number; sell: number; buy_rate: number | null; sell_rate: number | null } } = {};
      const effectiveShop = shopUsername || 'admin';
      if (isSupabaseConfigured()) {
        const { data: commData, error: commError } = await supabase!
          .from('commissions')
          .select('currency_code, buy_commission, sell_commission, buy_rate, sell_rate')
          .eq('shop_username', effectiveShop);
        if (!commError && commData) {
          commData.forEach((c: any) => {
            shopCommissions[c.currency_code] = {
              buy: c.buy_commission,
              sell: c.sell_commission,
              buy_rate: c.buy_rate,
              sell_rate: c.sell_rate,
            };
          });
          console.log(`✅ تم جلب عمولات وأسعار للمحل: ${effectiveShop} (${commData.length} عملة)`);
        }
      }

      // جلب عملات المحل من جدول shop_currencies إذا تم تمرير shopId
      let shopCurrencyIds: string[] | null = null;
      if (shopId && isSupabaseConfigured()) {
        const { data: scData } = await supabase!
          .from('shop_currencies')
          .select('currency_id')
          .eq('shop_id', shopId);
        shopCurrencyIds = (scData || []).map((row: any) => row.currency_id);
        console.log(`✅ تم جلب ${shopCurrencyIds.length} عملة خاصة بالمحل`);
      }

      if (isSupabaseConfigured()) {
        console.log('📊 استخدام Supabase لجلب العملات من جدول currencies');
        let query = supabase!.from('currencies').select('*');
        if (shopCurrencyIds && shopCurrencyIds.length > 0) {
          query = query.in('id', shopCurrencyIds);
        } else if (shopCurrencyIds) {
          // shop has no currencies yet
          return [];
        }
        const { data, error } = await query.order('code');
        if (error) throw error;
        console.log(`✅ تم جلب ${data?.length || 0} عملة من قاعدة البيانات Supabase`);
        
        // حساب أسعار الشراء والبيع من السعر الحالي والعمولات من جدول العمولات
        const currenciesWithRates = (data || []).map(currency => {
          const shopComm = shopCommissions[currency.code];
          const buyComm = shopComm ? shopComm.buy : 6;
          const sellComm = shopComm ? shopComm.sell : 6;

          if (currency.current_rate && currency.current_rate > 0) {
            const buyCommissionShekel = buyComm / 100;
            const sellCommissionShekel = sellComm / 100;

            // استخدام الأسعار المخزنة في جدول العمولات إن وجدت، وإلا حسابها
            const buyRate = shopComm?.buy_rate != null ? shopComm.buy_rate : currency.current_rate - buyCommissionShekel;
            const sellRate = shopComm?.sell_rate != null ? shopComm.sell_rate : currency.current_rate + sellCommissionShekel;

            return {
              ...currency,
              buy_commission: buyComm,
              sell_commission: sellComm,
              buy_rate: buyRate,
              sell_rate: sellRate
            };
          }
          
          return {
            ...currency,
            buy_commission: buyComm,
            sell_commission: sellComm,
          };
        });
        
        console.log('✅ تم حساب أسعار الشراء والبيع من العمولات');
        return currenciesWithRates;
      }
      
      console.log('📱 استخدام التخزين المحلي كبديل لقاعدة البيانات');
      const savedCurrencies = await AsyncStorage.getItem('managedCurrencies');
      if (savedCurrencies) {
        const currencies = JSON.parse(savedCurrencies);
        console.log(`✅ تم جلب ${currencies.length} عملة من التخزين المحلي`);
        return currencies;
      }
      
      console.log('🆕 إنشاء العملات الافتراضية لأول مرة');
      const defaultCurrencies = [
        {
          id: '1',
          name_ar: 'دولار أمريكي',
          name_en: 'US Dollar',
          name_he: 'דולר אמריקאי',
          code: 'USD',
          current_rate: 3.65,
          buy_rate: 3.59,
          sell_rate: 3.71,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '2',
          name_ar: 'يورو',
          name_en: 'Euro',
          name_he: 'יורו',
          code: 'EUR',
          current_rate: 3.95,
          buy_rate: 3.89,
          sell_rate: 4.01,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];
      
      await AsyncStorage.setItem('managedCurrencies', JSON.stringify(defaultCurrencies));
      console.log(`✅ تم إنشاء ${defaultCurrencies.length} عملة افتراضية`);
      return defaultCurrencies;
    } catch (error) {
      console.error('خطأ في جلب الأسعار:', error);
      return [];
    }
  },

  async getByCode(code: string) {
    const currencies = await this.getAll();
    return currencies.find((c: any) => c.code === code);
  },

  async create(currency: any) {
    try {
      console.log('🔄 بدء إضافة عملة جديدة:', currency);
      
      // إنشاء العملة الجديدة مع is_active = true
      const newCurrency = {
        ...currency,
        id: Date.now().toString(),
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // إضافة العملة إلى قاعدة البيانات الحقيقية
      console.log('📊 إضافة العملة إلى جدول currencies في قاعدة البيانات');
      console.log('📊 تحديث عمود is_active = true في جدول currencies');
      
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase!
          .from('currencies')
          .insert({
            code: newCurrency.code,
            name_ar: newCurrency.name_ar,
            name_en: newCurrency.name_en,
            name_he: newCurrency.name_he,
            is_active: true
          })
          .select()
          .single();
        if (error) throw error;

        // استخدام الـ id الحقيقي من قاعدة البيانات
        newCurrency.id = data.id;

        // إضافة عمولة افتراضية للمحل admin في جدول العمولات
        if (currency.buy_commission !== undefined && currency.sell_commission !== undefined) {
          await commissionService.upsert('admin', newCurrency.code, currency.buy_commission, currency.sell_commission);
        }
      }
      
      console.log(`✅ تم إضافة العملة ${newCurrency.code} في جدول currencies مع is_active = true`);
      
      // تحديث التخزين المحلي
      const savedCurrencies = await AsyncStorage.getItem('managedCurrencies');
      const currencies = savedCurrencies ? JSON.parse(savedCurrencies) : [];
      
      currencies.push(newCurrency);
      await AsyncStorage.setItem('managedCurrencies', JSON.stringify(currencies));
      
      console.log(`✅ تم تحديث التخزين المحلي بنجاح`);
      
      return newCurrency;
    } catch (error) {
      console.error('خطأ في إضافة العملة:', error);
      throw error;
    }
  },

  async update(id: string, currency: any) {
    try {
      console.log(`🔄 تحديث العملة ${id} في جدول currencies`);
      console.log('📊 البيانات المرسلة:', currency);
      
      // فصل حقول الأسعار (buy_rate/sell_rate) عن باقي الحقول
      // buy_rate و sell_rate ينتقلان إلى جدول العمولات
      const { buy_rate, sell_rate, ...currencyFields } = currency;
      
      if (isSupabaseConfigured()) {
        // تحديث جدول العملات بالحقول العادية فقط
        if (Object.keys(currencyFields).length > 0) {
          const { data, error } = await supabase!
            .from('currencies')
            .update(currencyFields)
            .eq('id', id);
          if (error) throw error;
        }

        // تحديث أسعار الشراء والبيع في جدول العمولات
        if (buy_rate !== undefined || sell_rate !== undefined) {
          // جلب رمز العملة من جدول العملات
          const { data: curData } = await supabase!
            .from('currencies')
            .select('code')
            .eq('id', id)
            .single();
          if (curData) {
            const { data: commData } = await supabase!
              .from('commissions')
              .select('buy_commission, sell_commission')
              .eq('shop_username', 'admin')
              .eq('currency_code', curData.code)
              .maybeSingle();
            const buyComm = commData?.buy_commission ?? 6;
            const sellComm = commData?.sell_commission ?? 6;
            await commissionService.upsert('admin', curData.code, buyComm, sellComm, buy_rate, sell_rate);
            console.log(`✅ تم تحديث buy_rate/sell_rate في جدول العمولات للعملة ${curData.code}`);
          }
        }
      }
      
      if (currency.is_active !== undefined) {
        console.log(`✅ تم تحديث عمود is_active إلى ${currency.is_active} في جدول currencies للعملة ${id}`);
      }
      if (currency.current_rate !== undefined) {
        console.log(`✅ تم تحديث عمود current_rate إلى ${currency.current_rate} في جدول currencies للعملة ${id}`);
      }
      
      // تحديث التخزين المحلي
      const savedCurrencies = await AsyncStorage.getItem('managedCurrencies');
      const currencies = savedCurrencies ? JSON.parse(savedCurrencies) : [];
      
      const updatedCurrencies = currencies.map((c: any) => 
        c.id === id ? { ...c, ...currency, updated_at: new Date().toISOString() } : c
      );
      
      await AsyncStorage.setItem('managedCurrencies', JSON.stringify(updatedCurrencies));
      
      console.log(`✅ تم تحديث التخزين المحلي بنجاح`);
      
      return updatedCurrencies.find((c: any) => c.id === id);
    } catch (error) {
      console.error('خطأ في تحديث العملة:', error);
      throw error;
    }
  },

  async delete(id: string) {
    try {
      console.log(`🔄 حذف العملة ${id} من جدول currencies في قاعدة البيانات`);
      
      // حذف من قاعدة البيانات الحقيقية
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase!
          .from('currencies')
          .delete()
          .eq('id', id);
        if (error) {
          console.error('خطأ في حذف العملة من قاعدة البيانات:', error);
          throw error;
        }
      }
      
      console.log(`✅ تم حذف العملة ${id} من جدول currencies بنجاح`);
      
      // حذف من التخزين المحلي
      const savedCurrencies = await AsyncStorage.getItem('managedCurrencies');
      const currencies = savedCurrencies ? JSON.parse(savedCurrencies) : [];
      
      const filteredCurrencies = currencies.filter((c: any) => c.id !== id);
      await AsyncStorage.setItem('managedCurrencies', JSON.stringify(filteredCurrencies));
      
      console.log(`✅ تم حذف العملة من التخزين المحلي أيضاً`);
      
      return true;
    } catch (error) {
      console.error('خطأ في حذف العملة:', error);
      throw error;
    }
  }
};

// Company Settings service
export const companySettingsService = {
  async get(username?: string) {
    try {
      if (isSupabaseConfigured()) {
        let query = supabase!.from('company_settings').select('*');
        if (username) {
          query = query.eq('username', username).maybeSingle();
        } else {
          query = query.limit(1).maybeSingle();
        }
        const { data, error } = await query;
        if (error && error.code !== 'PGRST116') throw error;
        return data;
      }
      return null;
    } catch (error) {
      console.error('خطأ في جلب إعدادات الشركة:', error);
      return null;
    }
  },

  async getByUsername(username: string) {
    return this.get(username);
  },

  async create(settings: any) {
    try {
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase!
          .from('company_settings')
          .insert(settings)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      }
      return settings;
    } catch (error) {
      console.error('خطأ في إنشاء إعدادات الشركة:', error);
      throw error;
    }
  },

  async update(id: string, settings: any) {
    try {
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase!
          .from('company_settings')
          .update(settings)
          .eq('id', id)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      }
      return settings;
    } catch (error) {
      console.error('خطأ في تحديث إعدادات الشركة:', error);
      throw error;
    }
  },

  async updateByUsername(username: string, settings: any) {
    try {
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase!
          .from('company_settings')
          .update(settings)
          .eq('username', username)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      }
      return settings;
    } catch (error) {
      console.error('خطأ في تحديث إعدادات الشركة:', error);
      throw error;
    }
  }
};

// Working Hours service
export const workingHoursService = {
  async getByCompanyId(companyId: string) {
    try {
      console.log('🔄 جلب أوقات العمل للشركة:', companyId);
      
      if (isSupabaseConfigured()) {
        console.log('📊 استخدام Supabase لجلب أوقات العمل من جدول working_hours');
        const { data, error } = await supabase!
          .from('working_hours')
          .select('*')
          .eq('company_id', companyId)
          .order('day_of_week');
        
        if (error) {
          console.error('❌ خطأ في جلب أوقات العمل من قاعدة البيانات:', error);
          throw error;
        }
        
        console.log(`✅ تم جلب ${data?.length || 0} يوم عمل من قاعدة البيانات`);
        
        // عرض تفاصيل أيام العمل
        if (data && data.length > 0) {
          const workingDays = data.filter(d => d.is_working_day === true || d.is_working_day === 'true');
          const nonWorkingDays = data.filter(d => d.is_working_day === false || d.is_working_day === 'false');
          console.log('📅 أيام العمل:', workingDays.map(d => d.day_of_week).join(', '));
          console.log('🚫 أيام الراحة:', nonWorkingDays.map(d => d.day_of_week).join(', '));
          
          // عرض تفاصيل ساعات العمل لكل يوم
          data.forEach(day => {
            const isWorking = day.is_working_day === true || day.is_working_day === 'true';
            console.log(`📊 ${day.day_of_week}: is_working_day=${day.is_working_day} (${isWorking ? 'عمل' : 'راحة'}), morning=${day.morning_start}-${day.morning_end}, evening=${day.evening_start}-${day.evening_end}`);
          });
        }
        
        return data || [];
      }
      
      console.log('📱 قاعدة البيانات غير متاحة، إرجاع قائمة فارغة');
      return [];
    } catch (error) {
      console.error('خطأ في جلب أوقات العمل:', error);
      return [];
    }
  },

  async upsert(companyId: string, workingHours: any[]) {
    try {
      if (isSupabaseConfigured()) {
        const hoursWithCompanyId = workingHours.map(day => ({
          company_id: companyId,
          day_of_week: day.key,
          is_working_day: day.is_working_day,
          morning_start: day.morning_start || '09:00',
          morning_end: day.morning_end || '14:00',
          evening_start: day.evening_start || '16:00',
          evening_end: day.evening_end || '18:00'
        }));

        const { data, error } = await supabase!
          .from('working_hours')
          .upsert(hoursWithCompanyId, { 
            onConflict: 'company_id,day_of_week' 
          })
          .select();
        
        if (error) throw error;
        return data;
      }
      return workingHours;
    } catch (error) {
      console.error('خطأ في حفظ أوقات العمل:', error);
      throw error;
    }
  }
};

// Service service
export const serviceService = {
  async getAll() {
    try {
      console.log('🔄 جلب جميع الخدمات من جدول services في قاعدة البيانات...');
      
      if (isSupabaseConfigured()) {
        console.log('📊 استخدام Supabase لجلب الخدمات من جدول services');
        const { data, error } = await supabase!
          .from('services')
          .select('id, service_number, service_name, service_name_he, service_name_en, created_at, updated_at')
          .order('service_number');
        if (error) throw error;
        console.log(`✅ تم جلب ${data?.length || 0} خدمة من قاعدة البيانات Supabase`);
        return data || [];
      }
      
      console.log('📱 استخدام الخدمات الافتراضية');
      return [
        { id: '1', service_number: 1, service_name: 'إنشاء فيزا', service_name_he: 'יצירת כרטיס', service_name_en: 'Create Card' },
        { id: '2', service_number: 2, service_name: 'تحويل للخارج', service_name_he: 'העברה לחו"ל', service_name_en: 'International Transfer' },
        { id: '3', service_number: 3, service_name: 'سحب حوالة', service_name_he: 'משיכת העברה', service_name_en: 'Receive Transfer' },
        { id: '4', service_number: 4, service_name: 'صرافة شيكات', service_name_he: 'פדיון צ\'קים', service_name_en: 'Check Cashing' },
        { id: '5', service_number: 5, service_name: 'تحويل لحساب بنك صاحب المحل', service_name_he: 'העברה לחשבון הבנק', service_name_en: 'Bank Account Transfer' },
        { id: '6', service_number: 6, service_name: 'سحب من الفيزا', service_name_he: 'משיכה מכרטיס', service_name_en: 'Card Withdrawal' },
        { id: '7', service_number: 7, service_name: 'إيداع في الفيزا', service_name_he: 'הפקדה בכרטיס', service_name_en: 'Card Deposit' }
      ];
    } catch (error) {
      console.error('❌ خطأ في جلب الخدمات:', error);
      return [];
    }
  },

  async create(service: any) {
    console.log('Create service:', service);
    return service;
  },

  async update(id: string, service: any) {
    console.log('Update service:', id, service);
    return service;
  },

  async delete(id: string) {
    console.log('Delete service:', id);
  }
};

// Transaction service
export const transactionService = {
  async getAll() {
    try {
      console.log('🔄 جلب جميع المعاملات من قاعدة البيانات...');
      
      if (isSupabaseConfigured()) {
        console.log('📊 استخدام Supabase لجلب المعاملات من جدول transactions');
        const { data, error } = await supabase!
          .from('transactions')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        console.log(`✅ تم جلب ${data?.length || 0} معاملة من قاعدة البيانات Supabase`);
        return data || [];
      }
      
      console.log('📱 استخدام التخزين المحلي كبديل لقاعدة البيانات');
      const savedTransactions = await AsyncStorage.getItem('transactions');
      if (savedTransactions) {
        const transactions = JSON.parse(savedTransactions);
        console.log(`✅ تم جلب ${transactions.length} معاملة من التخزين المحلي`);
        return transactions;
      }
      
      console.log('📝 لا توجد معاملات محفوظة');
      return [];
    } catch (error) {
      console.error('❌ خطأ في جلب المعاملات:', error);
      return [];
    }
  },

  async create(transaction: any) {
    try {
      console.log('🔄 إنشاء معاملة جديدة:', transaction);
      
      const newTransaction = {
        ...transaction,
        id: Date.now().toString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      if (isSupabaseConfigured()) {
        console.log('📊 إضافة المعاملة إلى جدول transactions في قاعدة البيانات');
        const { data, error } = await supabase!
          .from('transactions')
          .insert({
            service_number: transaction.service_number,
            amount_paid: transaction.amount_paid,
            currency_paid: transaction.currency_paid,
            amount_received: transaction.amount_received,
            currency_received: transaction.currency_received,
            customer_id: transaction.customer_id,
            notes: transaction.notes,
            is_completed: false
          })
          .select()
          .single();
        
        if (error) {
          console.error('❌ خطأ في إضافة المعاملة إلى قاعدة البيانات:', error);
          throw error;
        }
        
        console.log(`✅ تم إضافة المعاملة بنجاح في قاعدة البيانات (ID: ${data.id})`);
        
        // حفظ نسخة في التخزين المحلي للتوافق
        const savedTransactions = await AsyncStorage.getItem('transactions');
        const transactions = savedTransactions ? JSON.parse(savedTransactions) : [];
        transactions.push(data);
        await AsyncStorage.setItem('transactions', JSON.stringify(transactions));
        
        return data;
      }
      
      console.log('📱 حفظ المعاملة في التخزين المحلي فقط');
      const savedTransactions = await AsyncStorage.getItem('transactions');
      const transactions = savedTransactions ? JSON.parse(savedTransactions) : [];
      transactions.push(newTransaction);
      await AsyncStorage.setItem('transactions', JSON.stringify(transactions));
      console.log(`✅ تم حفظ المعاملة في التخزين المحلي`);
      
      return newTransaction;
    } catch (error) {
      console.error('❌ خطأ في إنشاء المعاملة:', error);
      throw error;
    }
  },

  async update(id: string, transaction: any) {
    console.log('Update transaction:', id, transaction);
    return transaction;
  },

  async delete(id: string) {
    console.log('Delete transaction:', id);
  }
};

// Customer service
export const customerService = {
  async getAll() {
    try {
      console.log('🔄 جلب جميع الزبائن من قاعدة البيانات...');
      
      if (isSupabaseConfigured()) {
        console.log('📊 استخدام Supabase لجلب الزبائن من جدول customers');
        const { data, error } = await supabase!
          .from('customers')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        console.log(`✅ تم جلب ${data?.length || 0} زبون من قاعدة البيانات Supabase`);
        return data || [];
      }
      
      console.log('📱 استخدام التخزين المحلي كبديل لقاعدة البيانات');
      const savedCustomers = await AsyncStorage.getItem('customers');
      if (savedCustomers) {
        const customers = JSON.parse(savedCustomers);
        console.log(`✅ تم جلب ${customers.length} زبون من التخزين المحلي`);
        return customers;
      }
      
      console.log('📝 لا توجد بيانات زبائن محفوظة');
      return [];
    } catch (error) {
      console.error('❌ خطأ في جلب بيانات الزبائن:', error);
      return [];
    }
  },

  async getByNationalId(nationalId: string) {
    try {
      console.log(`🔍 البحث عن زبون برقم الهوية: ${nationalId}`);
      
      if (isSupabaseConfigured()) {
        console.log('📊 البحث في جدول customers في قاعدة البيانات');
        console.log('🔗 Supabase URL:', process.env.EXPO_PUBLIC_SUPABASE_URL ? 'متوفر' : 'غير متوفر');
        console.log('🔑 Supabase Key:', process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ? 'متوفر' : 'غير متوفر');
        
        const { data, error } = await supabase!
          .from('customers')
          .select('*')
          .eq('national_id', nationalId)
          .single();
        
        if (error && error.code !== 'PGRST116') {
          console.error('❌ خطأ في البحث عن الزبون:', error);
          console.error('❌ تفاصيل الخطأ:', JSON.stringify(error, null, 2));
          throw error;
        }
        
        if (data) {
          console.log(`✅ تم العثور على الزبون: ${data.customer_name}`);
          console.log('📊 بيانات الزبون:', JSON.stringify(data, null, 2));
          return data;
        } else {
          console.log('📝 لم يتم العثور على الزبون في قاعدة البيانات');
          return null;
        }
      }
      
      console.log('📱 البحث في التخزين المحلي');
      const savedCustomers = await AsyncStorage.getItem('customers');
      if (savedCustomers) {
        const customers = JSON.parse(savedCustomers);
        const customer = customers.find((c: any) => c.national_id === nationalId);
        if (customer) {
          console.log(`✅ تم العثور على الزبون في التخزين المحلي: ${customer.customer_name}`);
          return customer;
        }
      }
      
      console.log('📝 لم يتم العثور على الزبون');
      return null;
    } catch (error) {
      console.error('❌ خطأ في البحث عن الزبون:', error);
      return null;
    }
  },

  async getByPhoneNumber(phoneNumber: string) {
    try {
      console.log(`🔍 البحث عن زبون برقم الهاتف: ${phoneNumber}`);
      
      if (isSupabaseConfigured()) {
        console.log('📊 البحث في جدول customers في قاعدة البيانات');
        const { data, error } = await supabase!
          .from('customers')
          .select('*')
          .eq('phone_number', phoneNumber)
          .single();
        
        if (error && error.code !== 'PGRST116') {
          console.error('❌ خطأ في البحث عن الزبون:', error);
          console.error('❌ تفاصيل الخطأ:', JSON.stringify(error, null, 2));
          throw error;
        }
        
        if (data) {
          console.log(`✅ تم العثور على الزبون: ${data.customer_name}`);
          return data;
        } else {
          console.log('📝 لم يتم العثور على الزبون في قاعدة البيانات');
          return null;
        }
      }
      
      console.log('📱 البحث في التخزين المحلي');
      const savedCustomers = await AsyncStorage.getItem('customers');
      if (savedCustomers) {
        const customers = JSON.parse(savedCustomers);
        const customer = customers.find((c: any) => c.phone_number === phoneNumber);
        if (customer) {
          console.log(`✅ تم العثور على الزبون في التخزين المحلي: ${customer.customer_name}`);
          return customer;
        }
      }
      
      console.log('📝 لم يتم العثور على الزبون');
      return null;
    } catch (error) {
      console.error('❌ خطأ في البحث عن الزبون:', error);
      return null;
    }
  },

  async create(customer: any) {
    try {
      console.log('🔄 إنشاء زبون جديد:', customer);
      console.log('🔗 حالة Supabase:', isSupabaseConfigured() ? 'متصل' : 'غير متصل');
      
      if (isSupabaseConfigured()) {
        console.log('📊 إضافة الزبون إلى جدول customers في قاعدة البيانات');
        console.log('📊 البيانات المرسلة:', {
          customer_name: customer.customer_name,
          national_id: customer.national_id,
          phone_number: customer.phone_number,
          birth_date: customer.birth_date
        });
        
        // إعداد البيانات للإرسال (فقط الحقول الموجودة)
        const insertData: any = {
          customer_name: customer.customer_name,
          national_id: customer.national_id,
          phone_number: customer.phone_number
        };

        // إضافة الحقول الاختيارية إذا كانت موجودة
        if (customer.birth_date) insertData.birth_date = customer.birth_date;
        if (customer.image1_data) insertData.image1_data = customer.image1_data;
        if (customer.image1_type) insertData.image1_type = customer.image1_type;
        if (customer.image2_data) insertData.image2_data = customer.image2_data;
        if (customer.image2_type) insertData.image2_type = customer.image2_type;

        console.log('📊 البيانات النهائية المرسلة:', { ...insertData, image1_data: insertData.image1_data ? 'موجودة' : null, image2_data: insertData.image2_data ? 'موجودة' : null });

        const { data, error } = await supabase!
          .from('customers')
          .insert(insertData)
          .select()
          .single();
        
        if (error) {
          console.error('❌ خطأ في إضافة الزبون إلى قاعدة البيانات:', error);
          console.error('❌ تفاصيل الخطأ الكاملة:', JSON.stringify(error, null, 2));
          console.error('❌ نوع الخطأ:', error.code);
          console.error('❌ رسالة الخطأ:', error.message);
          throw error;
        }
        
        console.log(`✅ تم إضافة الزبون بنجاح في قاعدة البيانات: ${data.customer_name} (ID: ${data.id})`);
        console.log('📊 البيانات المُرجعة:', JSON.stringify(data, null, 2));
        
        // حفظ نسخة في التخزين المحلي للتوافق
        const savedCustomers = await AsyncStorage.getItem('customers');
        const customers = savedCustomers ? JSON.parse(savedCustomers) : [];
        customers.push(data);
        await AsyncStorage.setItem('customers', JSON.stringify(customers));
        
        return data;
      }
      
      console.log('📱 حفظ الزبون في التخزين المحلي فقط');
      const newCustomer = { ...customer, id: Date.now().toString() };
      const savedCustomers = await AsyncStorage.getItem('customers');
      const customers = savedCustomers ? JSON.parse(savedCustomers) : [];
      customers.push(newCustomer);
      await AsyncStorage.setItem('customers', JSON.stringify(customers));
      console.log(`✅ تم حفظ الزبون في التخزين المحلي: ${newCustomer.customer_name}`);
      
      return newCustomer;
    } catch (error) {
      console.error('❌ خطأ في إنشاء الزبون:', error);
      console.error('❌ تفاصيل الخطأ الكاملة:', JSON.stringify(error, null, 2));
      throw error;
    }
  },

  async update(id: string, customer: any) {
    try {
      console.log(`🔄 تحديث بيانات الزبون: ${customer.customer_name} (ID: ${id})`);
      
      if (isSupabaseConfigured()) {
        console.log('📊 تحديث الزبون في جدول customers في قاعدة البيانات');

        // إعداد البيانات للتحديث (فقط الحقول الموجودة)
        const updateData: any = {};
        if (customer.customer_name) updateData.customer_name = customer.customer_name;
        if (customer.phone_number) updateData.phone_number = customer.phone_number;
        if (customer.birth_date) updateData.birth_date = customer.birth_date;
        if (customer.image1_data) updateData.image1_data = customer.image1_data;
        if (customer.image1_type) updateData.image1_type = customer.image1_type;
        if (customer.image2_data) updateData.image2_data = customer.image2_data;
        if (customer.image2_type) updateData.image2_type = customer.image2_type;

        console.log('📊 البيانات المحدثة:', updateData);

        // البحث بـ national_id بدلاً من id إذا كان id هو رقم الهوية
        let query = supabase!.from('customers').update(updateData);
        
        // إذا كان id يبدو كرقم هوية (9 أرقام)، ابحث بـ national_id
        if (id.length === 9 && /^\d+$/.test(id)) {
          console.log('🔍 البحث بـ national_id:', id);
          query = query.eq('national_id', id);
        } else {
          console.log('🔍 البحث بـ id:', id);
          query = query.eq('id', id);
        }
        
        const { data, error } = await query.select().single();
        
        if (error) {
          console.error('❌ خطأ في تحديث الزبون في قاعدة البيانات:', error);
          console.error('❌ تفاصيل الخطأ:', JSON.stringify(error, null, 2));
          throw error;
        }
        
        console.log(`✅ تم تحديث الزبون بنجاح في قاعدة البيانات: ${data.customer_name}`);
        
        // تحديث التخزين المحلي أيضاً
        const savedCustomers = await AsyncStorage.getItem('customers');
        if (savedCustomers) {
          const customers = JSON.parse(savedCustomers);
          const updatedCustomers = customers.map((c: any) => 
            c.national_id === customer.national_id ? { ...c, ...customer } : c
          );
          await AsyncStorage.setItem('customers', JSON.stringify(updatedCustomers));
        }
        
        return data;
      }
      
      console.log('📱 تحديث الزبون في التخزين المحلي فقط');
      const savedCustomers = await AsyncStorage.getItem('customers');
      if (savedCustomers) {
        const customers = JSON.parse(savedCustomers);
        const updatedCustomers = customers.map((c: any) => 
          c.national_id === customer.national_id ? { ...c, ...customer } : c
        );
        await AsyncStorage.setItem('customers', JSON.stringify(updatedCustomers));
        console.log(`✅ تم تحديث الزبون في التخزين المحلي: ${customer.customer_name}`);
      }
      
      return customer;
    } catch (error) {
      console.error('❌ خطأ في تحديث الزبون:', error);
      throw error;
    }
  },

  async delete(id: string) {
    try {
      console.log(`🔄 حذف الزبون: ${id}`);
      
      if (isSupabaseConfigured()) {
        console.log('📊 حذف الزبون من جدول customers في قاعدة البيانات');
        const { error } = await supabase!
          .from('customers')
          .delete()
          .eq('id', id);
        
        if (error) {
          console.error('❌ خطأ في حذف الزبون من قاعدة البيانات:', error);
          console.error('❌ تفاصيل الخطأ:', JSON.stringify(error, null, 2));
          throw error;
        }
        
        console.log(`✅ تم حذف الزبون من قاعدة البيانات بنجاح`);
      }
      
      console.log('📱 حذف الزبون من التخزين المحلي');
      const savedCustomers = await AsyncStorage.getItem('customers');
      if (savedCustomers) {
        const customers = JSON.parse(savedCustomers);
        const filteredCustomers = customers.filter((c: any) => c.id !== id);
        await AsyncStorage.setItem('customers', JSON.stringify(filteredCustomers));
        console.log(`✅ تم حذف الزبون من التخزين المحلي`);
      }
      
      return true;
    } catch (error) {
      console.error('❌ خطأ في حذف الزبون:', error);
      throw error;
    }
  }
};
// Coupon service
export const couponService = {
  generateCode(type: 'currency_exchange' | 'bank_transfer'): string {
    const prefix = type === 'currency_exchange' ? 'EX' : 'BNK';
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return `${prefix}-${code}`;
  },

  async getAll() {
    try {
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase!
          .from('coupons')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
      }
      return [];
    } catch (error) {
      console.error('خطأ في جلب الكوبونات:', error);
      return [];
    }
  },

  async getByCode(code: string) {
    try {
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase!
          .from('coupons')
          .select('*')
          .eq('code', code.toUpperCase().trim())
          .maybeSingle();
        if (error) throw error;
        return data;
      }
      return null;
    } catch (error) {
      console.error('خطأ في جلب الكوبون:', error);
      return null;
    }
  },

  async create(coupon: {
    code: string;
    type: 'currency_exchange' | 'bank_transfer';
    currency_code?: string;
    discounted_buy_rate?: number;
    discounted_sell_rate?: number;
    discount_percentage?: number;
    expires_at?: string;
    notes?: string;
  }) {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase!
        .from('coupons')
        .insert({ ...coupon, code: coupon.code.toUpperCase().trim() })
        .select()
        .single();
      if (error) throw error;
      return data;
    }
    throw new Error('Supabase not configured');
  },

  async markUsed(id: string) {
    if (isSupabaseConfigured()) {
      const { error } = await supabase!
        .from('coupons')
        .update({ is_used: true, used_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    }
  },

  async toggleActive(id: string, is_active: boolean) {
    if (isSupabaseConfigured()) {
      const { error } = await supabase!
        .from('coupons')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    }
  },

  async delete(id: string) {
    if (isSupabaseConfigured()) {
      const { error } = await supabase!
        .from('coupons')
        .delete()
        .eq('id', id);
      if (error) throw error;
    }
  }
};

// Exchange Shop service (multi-shop login via company_settings)
export const exchangeShopService = {
  async login(username: string, password: string) {
    try {
      // Super-admin special case
      if (username.trim() === 'admin' && password === '123456') {
        return {
          success: true,
          shop: {
            id: 'super-admin',
            username: 'admin',
            shop_name_ar: 'متحكم الشركات',
            shop_name_he: 'מנהל על',
            shop_name_en: 'Super Admin',
          },
          isSuperAdmin: true,
        };
      }

      if (isSupabaseConfigured()) {
        const { data, error } = await supabase!
          .from('company_settings')
          .select('id, username, password, name_ar, name_he, name_en, is_active')
          .eq('username', username.trim())
          .maybeSingle();

        if (error) throw error;
        if (!data) return { success: false, error: 'اسم المستخدم غير موجود' };
        if (!data.is_active) return { success: false, error: 'هذا الحساب غير مفعّل' };
        if (data.password !== password) return { success: false, error: 'كلمة المرور غير صحيحة' };

        return {
          success: true,
          shop: {
            id: data.id,
            username: data.username,
            shop_name_ar: data.name_ar,
            shop_name_he: data.name_he,
            shop_name_en: data.name_en,
          },
        };
      }
      return { success: false, error: 'اسم المستخدم أو كلمة المرور غير صحيحة' };
    } catch (error) {
      console.error('خطأ في تسجيل الدخول:', error);
      return { success: false, error: 'حدث خطأ في الاتصال بقاعدة البيانات' };
    }
  },

  async getAll() {
    try {
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase!
          .from('company_settings')
          .select('id, username, password, name_ar, name_he, name_en, is_active, created_at, updated_at, address_ar, address_he, address_en, phone1, phone2, phone3')
          .order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
      }
      return [];
    } catch (error) {
      console.error('خطأ في جلب المحلات:', error);
      return [];
    }
  },

  async create(shop: {
    username: string;
    password: string;
    shop_name_ar?: string;
    shop_name_he?: string;
    shop_name_en?: string;
    address_ar?: string;
    address_he?: string;
    address_en?: string;
    phone1?: string;
    phone2?: string;
    phone3?: string;
  }) {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase!
        .from('company_settings')
        .insert({
          username: shop.username,
          password: shop.password,
          name_ar: shop.shop_name_ar || shop.username,
          name_he: shop.shop_name_he || shop.shop_name_ar || shop.username,
          name_en: shop.shop_name_en || shop.shop_name_ar || shop.username,
          address_ar: shop.address_ar || '',
          address_he: shop.address_he || '',
          address_en: shop.address_en || '',
          phone1: shop.phone1 || '',
          phone2: shop.phone2 || '',
          phone3: shop.phone3 || '',
          is_active: true,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    }
    throw new Error('Supabase not configured');
  },

  async update(id: string, shop: any) {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase!
        .from('company_settings')
        .update(shop)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    }
  },

  async delete(id: string) {
    if (isSupabaseConfigured()) {
      // Delete working hours first
      await supabase!.from('working_hours').delete().eq('company_id', id);
      // Delete commissions
      const { data: shop } = await supabase!
        .from('company_settings')
        .select('username')
        .eq('id', id)
        .maybeSingle();
      if (shop?.username) {
        await supabase!.from('commissions').delete().eq('shop_username', shop.username);
      }
      // Delete the shop
      const { error } = await supabase!
        .from('company_settings')
        .delete()
        .eq('id', id);
      if (error) throw error;
    }
  },
};

// Commission service (per-shop, per-currency)
export const commissionService = {
  async getByShop(shopUsername: string) {
    try {
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase!
          .from('commissions')
          .select('*')
          .eq('shop_username', shopUsername);
        if (error) throw error;
        return data || [];
      }
      return [];
    } catch (error) {
      console.error('خطأ في جلب العمولات:', error);
      return [];
    }
  },

  async upsert(shopUsername: string, currencyCode: string, buyCommission: number, sellCommission: number, buyRate?: number, sellRate?: number) {
    if (isSupabaseConfigured()) {
      const payload: any = {
        shop_username: shopUsername,
        currency_code: currencyCode,
        buy_commission: buyCommission,
        sell_commission: sellCommission,
        updated_at: new Date().toISOString(),
      };
      if (buyRate !== undefined) payload.buy_rate = buyRate;
      if (sellRate !== undefined) payload.sell_rate = sellRate;
      const { data, error } = await supabase!
        .from('commissions')
        .upsert(payload, { onConflict: 'shop_username,currency_code' })
        .select()
        .single();
      if (error) throw error;
      return data;
    }
  },

  async getAll() {
    try {
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase!
          .from('commissions')
          .select('*');
        if (error) throw error;
        return data || [];
      }
      return [];
    } catch (error) {
      console.error('خطأ في جلب جميع العمولات:', error);
      return [];
    }
  },

  async delete(id: string) {
    if (isSupabaseConfigured()) {
      const { error } = await supabase!
        .from('commissions')
        .delete()
        .eq('id', id);
      if (error) throw error;
    }
  },
};

// Shop Currencies service (links currencies to shops)
export const shopCurrencyService = {
  async getByShop(shopId: string) {
    try {
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase!
          .from('shop_currencies')
          .select('currency_id, is_active')
          .eq('shop_id', shopId);
        if (error) throw error;
        return data || [];
      }
      return [];
    } catch (error) {
      console.error('خطأ في جلب عملات المحل:', error);
      return [];
    }
  },

  async getActiveCurrencyIds(shopId: string): Promise<string[]> {
    try {
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase!
          .from('shop_currencies')
          .select('currency_id')
          .eq('shop_id', shopId);
        if (error) throw error;
        return (data || []).map((row: any) => row.currency_id);
      }
      return [];
    } catch (error) {
      console.error('خطأ في جلب عملات المحل:', error);
      return [];
    }
  },

  async addCurrencyToShop(currencyId: string, shopId: string) {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase!
        .from('shop_currencies')
        .upsert(
          { currency_id: currencyId, shop_id: shopId, is_active: true },
          { onConflict: 'currency_id,shop_id' }
        )
        .select()
        .single();
      if (error) throw error;
      return data;
    }
  },

  async removeCurrencyFromShop(currencyId: string, shopId: string) {
    if (isSupabaseConfigured()) {
      const { error } = await supabase!
        .from('shop_currencies')
        .delete()
        .eq('currency_id', currencyId)
        .eq('shop_id', shopId);
      if (error) throw error;
    }
  },

  async toggleActive(currencyId: string, shopId: string, isActive: boolean) {
    if (isSupabaseConfigured()) {
      const { error } = await supabase!
        .from('shop_currencies')
        .update({ is_active: isActive })
        .eq('currency_id', currencyId)
        .eq('shop_id', shopId);
      if (error) throw error;
    }
  },
};

// Currency Update Log service
export const currencyUpdateLogService = {
  async getAutoUpdateStatus() {
    try {
      console.log('🔄 جلب حالة التحديث التلقائي من جدول currency_update_log...');

      if (isSupabaseConfigured()) {
        const { data, error } = await supabase!
          .from('currency_update_log')
          .select('auto_update_enabled')
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error('❌ خطأ في جلب حالة التحديث التلقائي:', error);
          return false;
        }

        const status = data?.auto_update_enabled || false;
        console.log(`✅ حالة التحديث التلقائي: ${status ? 'مفعّل' : 'معطّل'}`);
        return status;
      }

      return false;
    } catch (error) {
      console.error('❌ خطأ في جلب حالة التحديث التلقائي:', error);
      return false;
    }
  },

  async setAutoUpdateStatus(enabled: boolean) {
    try {
      console.log(`🔄 تحديث حالة التحديث التلقائي إلى: ${enabled ? 'مفعّل' : 'معطّل'}`);

      if (isSupabaseConfigured()) {
        // جلب السجل الأول للحصول على ID
        const { data: existingLog } = await supabase!
          .from('currency_update_log')
          .select('id')
          .limit(1)
          .maybeSingle();

        if (existingLog) {
          // تحديث السجل الموجود فقط - لا ننشئ سجل جديد أبداً
          console.log(`📝 تحديث السجل الموجود (ID: ${existingLog.id})`);
          const { error: updateError } = await supabase!
            .from('currency_update_log')
            .update({
              auto_update_enabled: enabled,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingLog.id);

          if (updateError) {
            console.error('❌ خطأ في تحديث حالة التحديث التلقائي:', updateError);
            throw updateError;
          }

          console.log(`✅ تم تحديث حالة التحديث التلقائي في السجل ${existingLog.id}`);
        } else {
          console.warn('⚠️ لا يوجد سجل في جدول currency_update_log - يرجى تشغيل الـ migrations أولاً');
          throw new Error('لا يوجد سجل في currency_update_log');
        }

        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ خطأ في تحديث حالة التحديث التلقائي:', error);
      throw error;
    }
  }
};
