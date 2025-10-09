import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with fallback values
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

// Only create Supabase client if valid credentials are provided
export const supabase = (supabaseUrl !== 'https://placeholder.supabase.co' && supabaseAnonKey !== 'placeholder-key') 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Helper function to check if Supabase is configured
export const isSupabaseConfigured = () => {
  return supabase !== null;
};

// Currency service
export const currencyService = {
  async getAll() {
    try {
      console.log('🔄 جلب جميع العملات من قاعدة البيانات...');
      
      if (isSupabaseConfigured()) {
        console.log('📊 استخدام Supabase لجلب العملات من جدول currencies');
        const { data, error } = await supabase!
          .from('currencies')
          .select('*')
          .order('code');
        if (error) throw error;
        console.log(`✅ تم جلب ${data?.length || 0} عملة من قاعدة البيانات Supabase`);
        return data || [];
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
          buy_commission: 6,
          sell_commission: 6,
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
          buy_commission: 6,
          sell_commission: 6,
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
    return currencies.find(c => c.code === code);
  },

  async create(currency: any) {
    try {
      console.log('🔄 بدء إضافة عملة جديدة:', currency);
      
      // إنشاء العملة الجديدة مع is_active = true
      const newCurrency = {
        ...currency,
        id: Date.now().toString(),
        buy_rate: currency.buy_rate || 3.18,
        sell_rate: currency.sell_rate || 3.30,
        buy_commission: currency.buy_commission || 6,
        sell_commission: currency.sell_commission || 6,
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
            buy_commission: newCurrency.buy_commission,
            sell_commission: newCurrency.sell_commission,
            is_active: true
          });
        if (error) throw error;
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
      
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase!
          .from('currencies')
          .update(currency)
          .eq('id', id);
        if (error) throw error;
      }
      
      if (currency.is_active !== undefined) {
        console.log(`✅ تم تحديث عمود is_active إلى ${currency.is_active} في جدول currencies للعملة ${id}`);
      }
      if (currency.buy_commission !== undefined) {
        console.log(`✅ تم تحديث عمود buy_commission إلى ${currency.buy_commission} في جدول currencies للعملة ${id}`);
      }
      if (currency.sell_commission !== undefined) {
        console.log(`✅ تم تحديث عمود sell_commission إلى ${currency.sell_commission} في جدول currencies للعملة ${id}`);
      }
      if (currency.current_rate !== undefined) {
        console.log(`✅ تم تحديث عمود current_rate إلى ${currency.current_rate} في جدول currencies للعملة ${id}`);
      }
      if (currency.buy_rate !== undefined) {
        console.log(`✅ تم تحديث عمود buy_rate إلى ${currency.buy_rate} في جدول currencies للعملة ${id}`);
      }
      if (currency.sell_rate !== undefined) {
        console.log(`✅ تم تحديث عمود sell_rate إلى ${currency.sell_rate} في جدول currencies للعملة ${id}`);
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
  async get() {
    try {
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase!
          .from('company_settings')
          .select('*')
          .limit(1)
          .single();
        
        if (error && error.code !== 'PGRST116') throw error;
        return data;
      }
      return null;
    } catch (error) {
      console.error('خطأ في جلب إعدادات الشركة:', error);
      return null;
    }
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
          is_working_day: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'saturday'].includes(day.key),
          morning_start: '09:00',
          morning_end: '14:00',
          evening_start: '16:00',
          evening_end: '18:00'
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
    return [];
  },

  async create(transaction: any) {
    console.log('Create transaction:', transaction);
    return { ...transaction, id: Date.now().toString() };
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
        const { data, error } = await supabase!
          .from('customers')
          .select('*')
          .eq('national_id', nationalId)
          .single();
        
        if (error && error.code !== 'PGRST116') {
          console.error('❌ خطأ في البحث عن الزبون:', error);
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
      
      if (isSupabaseConfigured()) {
        console.log('📊 إضافة الزبون إلى جدول customers في قاعدة البيانات');
        const { data, error } = await supabase!
          .from('customers')
          .insert({
            customer_name: customer.customer_name,
            national_id: customer.national_id,
            phone_number: customer.phone_number,
            birth_date: customer.birth_date
          })
          .select()
          .single();
        
        if (error) {
          console.error('❌ خطأ في إضافة الزبون إلى قاعدة البيانات:', error);
          throw error;
        }
        
        console.log(`✅ تم إضافة الزبون بنجاح في قاعدة البيانات: ${data.customer_name} (ID: ${data.id})`);
        
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
      throw error;
    }
  },

  async update(id: string, customer: any) {
    try {
      console.log(`🔄 تحديث بيانات الزبون: ${customer.customer_name} (ID: ${id})`);
      
      if (isSupabaseConfigured()) {
        console.log('📊 تحديث الزبون في جدول customers في قاعدة البيانات');
        
        // البحث بـ national_id بدلاً من id إذا كان id هو رقم الهوية
        let query = supabase!.from('customers').update({
          customer_name: customer.customer_name,
          phone_number: customer.phone_number,
          birth_date: customer.birth_date
        });
        
        // إذا كان id يبدو كرقم هوية (9 أرقام)، ابحث بـ national_id
        if (id.length === 9 && /^\d+$/.test(id)) {
          query = query.eq('national_id', id);
        } else {
          query = query.eq('id', id);
        }
        
        const { data, error } = await query.select().single();
        
        if (error) {
          console.error('❌ خطأ في تحديث الزبون في قاعدة البيانات:', error);
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