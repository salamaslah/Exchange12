import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from './supabase';

export interface TreasuryBalance {
  id: string;
  currency_code: string;
  currency_name_ar: string;
  currency_name_he: string;
  currency_name_en: string;
  balance_amount: number;
  last_updated: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export const treasuryService = {
  async getAll(): Promise<TreasuryBalance[]> {
    try {
      console.log('🔄 جلب جميع أرصدة الخزينة من قاعدة البيانات...');
      
      if (isSupabaseConfigured()) {
        console.log('📊 استخدام Supabase لجلب الأرصدة من جدول treasury_balances');
        const { data, error } = await supabase!
          .from('treasury_balances')
          .select('*')
          .order('currency_code');
        
        if (error) {
          console.error('❌ خطأ في جلب الأرصدة من قاعدة البيانات:', error);
          throw error;
        }
        
        console.log(`✅ تم جلب ${data?.length || 0} رصيد من قاعدة البيانات Supabase`);
        return data || [];
      }
      
      console.log('📱 استخدام التخزين المحلي كبديل لقاعدة البيانات');
      const savedBalances = await AsyncStorage.getItem('treasuryBalances');
      if (savedBalances) {
        const balances = JSON.parse(savedBalances);
        console.log(`✅ تم جلب ${balances.length} رصيد من التخزين المحلي`);
        return balances;
      }
      
      console.log('🆕 إنشاء الأرصدة الافتراضية لأول مرة');
      const defaultBalances: TreasuryBalance[] = [
        {
          id: '1',
          currency_code: 'ILS',
          currency_name_ar: 'شيقل إسرائيلي',
          currency_name_he: 'שקל ישראלי',
          currency_name_en: 'Israeli Shekel',
          balance_amount: 10000.00,
          last_updated: new Date().toISOString(),
          notes: 'الرصيد الافتراضي',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '2',
          currency_code: 'USD',
          currency_name_ar: 'دولار أمريكي',
          currency_name_he: 'דולר אמריקאי',
          currency_name_en: 'US Dollar',
          balance_amount: 5000.00,
          last_updated: new Date().toISOString(),
          notes: 'الرصيد الافتراضي',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '3',
          currency_code: 'EUR',
          currency_name_ar: 'يورو',
          currency_name_he: 'יורו',
          currency_name_en: 'Euro',
          balance_amount: 3000.00,
          last_updated: new Date().toISOString(),
          notes: 'الرصيد الافتراضي',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];
      
      await AsyncStorage.setItem('treasuryBalances', JSON.stringify(defaultBalances));
      console.log(`✅ تم إنشاء ${defaultBalances.length} رصيد افتراضي`);
      return defaultBalances;
    } catch (error) {
      console.error('❌ خطأ في جلب أرصدة الخزينة:', error);
      return [];
    }
  },

  async getByCurrencyCode(currencyCode: string): Promise<TreasuryBalance | null> {
    try {
      console.log(`🔍 البحث عن رصيد العملة: ${currencyCode}`);
      
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase!
          .from('treasury_balances')
          .select('*')
          .eq('currency_code', currencyCode)
          .single();
        
        if (error && error.code !== 'PGRST116') {
          console.error('❌ خطأ في البحث عن الرصيد:', error);
          throw error;
        }
        
        if (data) {
          console.log(`✅ تم العثور على رصيد ${currencyCode}: ${data.balance_amount}`);
          return data;
        }
      }
      
      const balances = await this.getAll();
      const balance = balances.find(b => b.currency_code === currencyCode);
      return balance || null;
    } catch (error) {
      console.error('❌ خطأ في البحث عن رصيد العملة:', error);
      return null;
    }
  },

  async create(balance: Omit<TreasuryBalance, 'id' | 'created_at' | 'updated_at'>): Promise<TreasuryBalance> {
    try {
      console.log('🔄 إنشاء رصيد جديد:', balance);
      
      const newBalance: TreasuryBalance = {
        ...balance,
        id: Date.now().toString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      if (isSupabaseConfigured()) {
        console.log('📊 إضافة الرصيد إلى جدول treasury_balances في قاعدة البيانات');
        const { data, error } = await supabase!
          .from('treasury_balances')
          .insert({
            currency_code: balance.currency_code,
            currency_name_ar: balance.currency_name_ar,
            currency_name_he: balance.currency_name_he,
            currency_name_en: balance.currency_name_en,
            balance_amount: balance.balance_amount,
            notes: balance.notes,
            last_updated: balance.last_updated
          })
          .select()
          .single();
        
        if (error) {
          console.error('❌ خطأ في إضافة الرصيد إلى قاعدة البيانات:', error);
          throw error;
        }
        
        console.log(`✅ تم إضافة رصيد ${balance.currency_code} بنجاح في قاعدة البيانات`);
        
        // تحديث التخزين المحلي
        const savedBalances = await AsyncStorage.getItem('treasuryBalances');
        const balances = savedBalances ? JSON.parse(savedBalances) : [];
        balances.push(data);
        await AsyncStorage.setItem('treasuryBalances', JSON.stringify(balances));
        
        return data;
      }
      
      console.log('📱 حفظ الرصيد في التخزين المحلي فقط');
      const savedBalances = await AsyncStorage.getItem('treasuryBalances');
      const balances = savedBalances ? JSON.parse(savedBalances) : [];
      balances.push(newBalance);
      await AsyncStorage.setItem('treasuryBalances', JSON.stringify(balances));
      
      return newBalance;
    } catch (error) {
      console.error('❌ خطأ في إنشاء الرصيد:', error);
      throw error;
    }
  },

  async update(id: string, balance: Partial<TreasuryBalance>): Promise<TreasuryBalance> {
    try {
      console.log(`🔄 تحديث الرصيد ${id}:`, balance);
      
      const updateData = {
        ...balance,
        last_updated: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      if (isSupabaseConfigured()) {
        console.log('📊 تحديث الرصيد في جدول treasury_balances');
        const { data, error } = await supabase!
          .from('treasury_balances')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();
        
        if (error) {
          console.error('❌ خطأ في تحديث الرصيد في قاعدة البيانات:', error);
          throw error;
        }
        
        console.log(`✅ تم تحديث الرصيد بنجاح في قاعدة البيانات`);
        
        // تحديث التخزين المحلي
        const savedBalances = await AsyncStorage.getItem('treasuryBalances');
        if (savedBalances) {
          const balances = JSON.parse(savedBalances);
          const updatedBalances = balances.map((b: TreasuryBalance) => 
            b.id === id ? { ...b, ...updateData } : b
          );
          await AsyncStorage.setItem('treasuryBalances', JSON.stringify(updatedBalances));
        }
        
        return data;
      }
      
      console.log('📱 تحديث الرصيد في التخزين المحلي فقط');
      const savedBalances = await AsyncStorage.getItem('treasuryBalances');
      if (savedBalances) {
        const balances = JSON.parse(savedBalances);
        const updatedBalances = balances.map((b: TreasuryBalance) => 
          b.id === id ? { ...b, ...updateData } : b
        );
        await AsyncStorage.setItem('treasuryBalances', JSON.stringify(updatedBalances));
        
        const updatedBalance = updatedBalances.find((b: TreasuryBalance) => b.id === id);
        return updatedBalance!;
      }
      
      throw new Error('لم يتم العثور على الرصيد');
    } catch (error) {
      console.error('❌ خطأ في تحديث الرصيد:', error);
      throw error;
    }
  },

  async delete(id: string): Promise<boolean> {
    try {
      console.log(`🔄 حذف الرصيد ${id}`);
      
      if (isSupabaseConfigured()) {
        console.log('📊 حذف الرصيد من جدول treasury_balances');
        const { error } = await supabase!
          .from('treasury_balances')
          .delete()
          .eq('id', id);
        
        if (error) {
          console.error('❌ خطأ في حذف الرصيد من قاعدة البيانات:', error);
          throw error;
        }
        
        console.log(`✅ تم حذف الرصيد من قاعدة البيانات بنجاح`);
      }
      
      console.log('📱 حذف الرصيد من التخزين المحلي');
      const savedBalances = await AsyncStorage.getItem('treasuryBalances');
      if (savedBalances) {
        const balances = JSON.parse(savedBalances);
        const filteredBalances = balances.filter((b: TreasuryBalance) => b.id !== id);
        await AsyncStorage.setItem('treasuryBalances', JSON.stringify(filteredBalances));
      }
      
      return true;
    } catch (error) {
      console.error('❌ خطأ في حذف الرصيد:', error);
      throw error;
    }
  },

  async updateBalance(currencyCode: string, newAmount: number, notes?: string): Promise<TreasuryBalance | null> {
    try {
      console.log(`🔄 تحديث رصيد ${currencyCode} إلى ${newAmount}`);
      
      const existingBalance = await this.getByCurrencyCode(currencyCode);
      if (!existingBalance) {
        console.log('❌ لم يتم العثور على الرصيد');
        return null;
      }
      
      const updateData = {
        balance_amount: newAmount,
        notes: notes || existingBalance.notes,
        last_updated: new Date().toISOString()
      };
      
      return await this.update(existingBalance.id, updateData);
    } catch (error) {
      console.error('❌ خطأ في تحديث الرصيد:', error);
      throw error;
    }
  }
};