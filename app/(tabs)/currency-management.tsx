import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Alert, Modal, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { currencyService, supabase } from '@/lib/supabase';
import { exchangeRateAPI } from '@/lib/exchangeRateAPI';

interface Currency {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  name_he?: string;
  buy_commission: number;
  sell_commission: number;
  is_active: boolean;
  current_rate?: number;
  buy_rate?: number;
  sell_rate?: number;
  sort_num?: number;
  created_at: string;
  updated_at: string;
}

export default function CurrencyManagementScreen() {
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCommissionModal, setShowCommissionModal] = useState(false);
  const [editingCurrency, setEditingCurrency] = useState<Currency | null>(null);
  const [editType, setEditType] = useState<'buy' | 'sell'>('buy');
  const [commissionValue, setCommissionValue] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCurrencyForm, setNewCurrencyForm] = useState({
    code: '',
    name_ar: '',
    name_en: '',
    name_he: '',
    current_rate: '',
    buy_commission: '6',
    sell_commission: '6'
  });
  const [isAutoUpdateRunning, setIsAutoUpdateRunning] = useState(false);
  const [showEditRateModal, setShowEditRateModal] = useState(false);
  const [editingRateCurrency, setEditingRateCurrency] = useState<Currency | null>(null);
  const [newRateValue, setNewRateValue] = useState('');
  const router = useRouter();

  // قائمة العملات المتاحة للإضافة
  const availableCurrencies = [
    { code: 'USD', name_ar: 'دولار أمريكي', name_en: 'US Dollar', name_he: 'דולר אמריקאי' },
    { code: 'EUR', name_ar: 'يورو', name_en: 'Euro', name_he: 'יורו' },
    { code: 'GBP', name_ar: 'جنيه إسترليني', name_en: 'British Pound', name_he: 'לירה שטרלינג' },
    { code: 'CHF', name_ar: 'فرنك سويسري', name_en: 'Swiss Franc', name_he: 'פרנק שוויצרי' },
    { code: 'CAD', name_ar: 'دولار كندي', name_en: 'Canadian Dollar', name_he: 'דולר קנדי' },
    { code: 'AUD', name_ar: 'دولار أسترالي', name_en: 'Australian Dollar', name_he: 'דולר אוסטרלי' },
    { code: 'JPY', name_ar: 'ين ياباني', name_en: 'Japanese Yen', name_he: 'ין יפני' },
    { code: 'SEK', name_ar: 'كرونة سويدية', name_en: 'Swedish Krona', name_he: 'כתר שוודי' },
    { code: 'NOK', name_ar: 'كرونة نرويجية', name_en: 'Norwegian Krone', name_he: 'כתר נורווגי' },
    { code: 'DKK', name_ar: 'كرونة دنماركية', name_en: 'Danish Krone', name_he: 'כתר דני' },
    { code: 'TRY', name_ar: 'ليرة تركية', name_en: 'Turkish Lira', name_he: 'לירה טורקית' },
    { code: 'RUB', name_ar: 'روبل روسي', name_en: 'Russian Ruble', name_he: 'רובל רוסי' },
    { code: 'CNY', name_ar: 'يوان صيني', name_en: 'Chinese Yuan', name_he: 'יואן סיני' },
    { code: 'KRW', name_ar: 'وون كوري', name_en: 'Korean Won', name_he: 'וון קוריאני' },
    { code: 'THB', name_ar: 'بات تايلندي', name_en: 'Thai Baht', name_he: 'באט תאילנדי' },
    { code: 'SGD', name_ar: 'دولار سنغافوري', name_en: 'Singapore Dollar', name_he: 'דולר סינגפורי' },
    { code: 'HKD', name_ar: 'دولار هونغ كونغ', name_en: 'Hong Kong Dollar', name_he: 'דולר הונג קונג' },
    { code: 'MXN', name_ar: 'بيزو مكسيكي', name_en: 'Mexican Peso', name_he: 'פזו מקסיקני' },
    { code: 'BRL', name_ar: 'ريال برازيلي', name_en: 'Brazilian Real', name_he: 'ריאל ברזילאי' },
    { code: 'AED', name_ar: 'درهم إماراتي', name_en: 'UAE Dirham', name_he: 'דירהם איחוד האמירויות' },
    { code: 'SAR', name_ar: 'ريال سعودي', name_en: 'Saudi Riyal', name_he: 'ריאל סעודי' },
    { code: 'EGP', name_ar: 'جنيه مصري', name_en: 'Egyptian Pound', name_he: 'לירה מצרית' },
    { code: 'JOD', name_ar: 'دينار أردني', name_en: 'Jordanian Dinar', name_he: 'דינר ירדני' },
    { code: 'KWD', name_ar: 'دينار كويتي', name_en: 'Kuwaiti Dinar', name_he: 'דינר כוויתי' },
    { code: 'QAR', name_ar: 'ريال قطري', name_en: 'Qatari Riyal', name_he: 'ריאל קטארי' }
  ];

  useEffect(() => {
    loadCurrencies();
    setupRealtimeSubscription();
    loadAutoUpdateStatus();

    return () => {
      console.log('🔌 تنظيف الاشتراكات عند الخروج');
    };
  }, []);

  const loadAutoUpdateStatus = async () => {
    try {
      const status = await AsyncStorage.getItem('auto_update_enabled');
      setIsAutoUpdateRunning(status === 'true');
      console.log('📊 حالة القراءة التلقائية:', status === 'true' ? 'مفعلة' : 'معطلة');
    } catch (error) {
      console.error('❌ خطأ في قراءة حالة التحديث التلقائي:', error);
    }
  };

  // إعداد الاشتراك في التحديثات الفورية من Supabase
  const setupRealtimeSubscription = () => {
    console.log('🔄 إعداد الاشتراك في التحديثات الفورية لجدول العملات...');

    const channel = supabase
      .channel('currencies-realtime-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // جميع الأحداث: INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'currencies'
        },
        (payload) => {
          console.log('🔔 تم الكشف عن تغيير في جدول العملات:', payload.eventType);
          handleRealtimeChange(payload);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ تم الاشتراك بنجاح في التحديثات الفورية');
        } else {
          console.log('📡 حالة الاشتراك:', status);
        }
      });

    return () => {
      console.log('🔌 إلغاء الاشتراك في التحديثات الفورية');
      supabase.removeChannel(channel);
    };
  };

  // معالجة التغييرات الفورية
  const handleRealtimeChange = (payload: any) => {
    const { eventType, new: newRecord, old: oldRecord } = payload;

    setCurrencies((prevCurrencies) => {
      switch (eventType) {
        case 'INSERT':
          // إضافة عملة جديدة
          console.log('➕ إضافة عملة جديدة:', newRecord.code);
          const exists = prevCurrencies.some(c => c.id === newRecord.id);
          if (exists) return prevCurrencies;

          return [...prevCurrencies, newRecord as Currency].sort((a, b) => {
            // ترتيب حسب sort_num تصاعدياً
            const sortA = a.sort_num ?? 999;
            const sortB = b.sort_num ?? 999;
            return sortA - sortB;
          });

        case 'UPDATE':
          // تحديث عملة موجودة
          console.log('✏️ تحديث عملة:', newRecord.code);
          return prevCurrencies.map((currency) =>
            currency.id === newRecord.id ? (newRecord as Currency) : currency
          ).sort((a, b) => {
            // ترتيب حسب sort_num تصاعدياً
            const sortA = a.sort_num ?? 999;
            const sortB = b.sort_num ?? 999;
            return sortA - sortB;
          });

        case 'DELETE':
          // حذف عملة
          console.log('🗑️ حذف عملة:', oldRecord.code);
          return prevCurrencies.filter((currency) => currency.id !== oldRecord.id);

        default:
          return prevCurrencies;
      }
    });

    // عرض إشعار للمستخدم
    if (eventType === 'UPDATE') {
      console.log('💡 تم تحديث العملة تلقائياً في الواجهة');
    }
  };

  const loadCurrencies = async () => {
    try {
      setLoading(true);
      console.log('🔄 تحميل جميع العملات من قاعدة البيانات Supabase...');
      
      // جلب العملات من قاعدة البيانات
      const currenciesData = await currencyService.getAll();
      console.log(`✅ تم تحميل ${currenciesData.length} عملة من قاعدة البيانات Supabase`);
      
      // ترتيب العملات حسب sort_num تصاعدياً
      const sortedCurrencies = currenciesData.sort((a: Currency, b: Currency) => {
        const sortA = a.sort_num ?? 999;
        const sortB = b.sort_num ?? 999;
        return sortA - sortB;
      });
      
      setCurrencies(sortedCurrencies);
    } catch (error) {
      console.error('❌ خطأ في تحميل العملات من قاعدة البيانات:', error);
      Alert.alert('خطأ', 'حدث خطأ في تحميل العملات من قاعدة البيانات');
    } finally {
      setLoading(false);
    }
  };

  const toggleCurrencyStatus = async (currencyId: string) => {
    try {
      const currency = currencies.find(c => c.id === currencyId);
      if (!currency) return;

      const newStatus = !currency.is_active;
      console.log(`🔄 تغيير حالة العملة ${currency.name_ar} (${currency.code}) إلى ${newStatus ? 'متوفرة' : 'غير متوفرة'}`);
      
      // تحديث العملة في قاعدة البيانات
      await currencyService.update(currencyId, { 
        is_active: newStatus,
        updated_at: new Date().toISOString()
      });
      
      // إعادة تحميل العملات من قاعدة البيانات
      await loadCurrencies();
      
      console.log(`✅ تم تحديث حالة العملة ${currency.name_ar} بنجاح`);
      
      Alert.alert(
        '✅ تم التحديث', 
        `تم ${newStatus ? 'تفعيل' : 'تعطيل'} عملة ${currency.name_ar}`
      );
      
    } catch (error) {
      console.error('❌ خطأ في تحديث حالة العملة في قاعدة البيانات:', error);
      Alert.alert('❌ خطأ', 'حدث خطأ في تحديث حالة العملة في قاعدة البيانات');
    }
  };

  const deleteCurrency = async (currency: Currency) => {
    try {
      console.log(`🗑️ بدء حذف العملة ${currency.name_ar} (${currency.code})...`);
      
      // حذف العملة من قاعدة البيانات
      await currencyService.delete(currency.id);
      
      // إعادة تحميل العملات من قاعدة البيانات
      await loadCurrencies();
      
      console.log(`✅ تم حذف العملة ${currency.code} بنجاح`);
      
      Alert.alert(
        '✅ تم الحذف',
        `تم حذف عملة ${currency.name_ar} (${currency.code}) بنجاح`
      );
      
    } catch (error) {
      console.error('❌ خطأ في حذف العملة من قاعدة البيانات:', error);
      Alert.alert('❌ خطأ', 'حدث خطأ في حذف العملة من قاعدة البيانات');
    }
  };

  const confirmDeleteCurrency = (currency: Currency) => {
    Alert.alert(
      '🗑️ حذف العملة',
      `هل تريد حذف عملة ${currency.name_ar} (${currency.code}) نهائياً؟\n\nتحذير: هذا الإجراء لا يمكن التراجع عنه!`,
      [
        {
          text: 'إلغاء',
          style: 'cancel'
        },
        {
          text: 'نعم، احذف',
          style: 'destructive',
          onPress: () => deleteCurrency(currency)
        }
      ]
    );
  };

  const toggleAutoUpdate = async () => {
    try {
      if (isAutoUpdateRunning) {
        console.log('⏹️ إيقاف قراءة الأسعار التلقائية...');
        exchangeRateAPI.stopAutoUpdate();
        await AsyncStorage.setItem('auto_update_enabled', 'false');
        setIsAutoUpdateRunning(false);
        Alert.alert(
          '⏹️ تم الإيقاف',
          'تم إيقاف قراءة الأسعار التلقائية من API\nيمكنك الآن تعديل الأسعار يدوياً بالضغط على السعر الحالي',
          [{ text: 'حسناً' }]
        );
      } else {
        console.log('▶️ تشغيل قراءة الأسعار التلقائية...');
        exchangeRateAPI.startAutoUpdate();
        await AsyncStorage.setItem('auto_update_enabled', 'true');
        setIsAutoUpdateRunning(true);
        Alert.alert(
          '▶️ تم التشغيل',
          'تم تشغيل قراءة الأسعار التلقائية من API\nسيتم تحديث الأسعار كل 5 دقائق',
          [{ text: 'حسناً' }]
        );
        await loadCurrencies();
      }
    } catch (error) {
      console.error('❌ خطأ في تبديل حالة التحديث التلقائي:', error);
      Alert.alert('خطأ', 'حدث خطأ في تبديل حالة التحديث التلقائي');
    }
  };

  const openCommissionModal = (currency: Currency, type: 'buy' | 'sell') => {
    setEditingCurrency(currency);
    setEditType(type);
    setCommissionValue((type === 'buy' ? currency.buy_commission : currency.sell_commission).toString());
    setShowCommissionModal(true);
  };

  const openEditRateModal = (currency: Currency) => {
    setEditingRateCurrency(currency);
    setNewRateValue(currency.current_rate?.toString() || '');
    setShowEditRateModal(true);
  };

  const saveNewRate = async () => {
    if (!editingRateCurrency || !newRateValue) {
      Alert.alert('خطأ', 'يرجى إدخال السعر الجديد');
      return;
    }

    const newRate = parseFloat(newRateValue);
    if (isNaN(newRate) || newRate <= 0) {
      Alert.alert('خطأ', 'يرجى إدخال سعر صحيح');
      return;
    }

    try {
      console.log(`🔄 تحديث السعر اليدوي للعملة ${editingRateCurrency.name_ar} إلى ${newRate}`);

      const buyCommission = (editingRateCurrency.buy_commission || 6) / 100;
      const sellCommission = (editingRateCurrency.sell_commission || 6) / 100;

      const buyRate = Math.round((newRate - buyCommission) * 100) / 100;
      const sellRate = Math.round((newRate + sellCommission) * 100) / 100;

      await currencyService.update(editingRateCurrency.id, {
        current_rate: newRate,
        buy_rate: buyRate,
        sell_rate: sellRate,
        updated_at: new Date().toISOString()
      });

      await loadCurrencies();
      setShowEditRateModal(false);
      setEditingRateCurrency(null);
      setNewRateValue('');

      console.log(`✅ تم تحديث السعر بنجاح`);
      Alert.alert(
        '✅ تم التحديث',
        `تم تحديث سعر ${editingRateCurrency.name_ar} إلى ${newRate.toFixed(2)} ₪`
      );
    } catch (error) {
      console.error('❌ خطأ في حفظ السعر الجديد:', error);
      Alert.alert('❌ خطأ', 'حدث خطأ في حفظ السعر الجديد');
    }
  };

  const saveCommission = async () => {
    if (!editingCurrency || !commissionValue) {
      Alert.alert('خطأ', 'يرجى إدخال قيمة العمولة');
      return;
    }

    const newCommission = parseInt(commissionValue);
    if (isNaN(newCommission) || newCommission < 0) {
      Alert.alert('خطأ', 'يرجى إدخال قيمة صحيحة للعمولة');
      return;
    }

    try {
      console.log(`🔄 تحديث عمولة ${editType === 'buy' ? 'الشراء' : 'البيع'} للعملة ${editingCurrency.name_ar}`);
      
      // تحضير البيانات للتحديث
      const updateData: any = { updated_at: new Date().toISOString() };
      
      if (editType === 'buy') {
        updateData.buy_commission = newCommission;
      } else {
        updateData.sell_commission = newCommission;
      }
      
      // تحديث العملة في قاعدة البيانات
      await currencyService.update(editingCurrency.id, updateData);
      
      // إعادة تحميل العملات من قاعدة البيانات
      await loadCurrencies();
      
      setShowCommissionModal(false);
      setEditingCurrency(null);
      setCommissionValue('');
      
      console.log(`✅ تم تحديث العمولة بنجاح`);
      
      Alert.alert(
        '✅ تم التحديث', 
        `تم تحديث عمولة ${editType === 'buy' ? 'الشراء' : 'البيع'} لعملة ${editingCurrency.name_ar}`
      );
    } catch (error) {
      console.error('❌ خطأ في حفظ العمولة في قاعدة البيانات:', error);
      Alert.alert('❌ خطأ', 'حدث خطأ في حفظ العمولة في قاعدة البيانات');
    }
  };

  const addNewCurrency = async (currencyData: any) => {
    try {
      console.log(`🔄 إضافة عملة جديدة: ${currencyData.name_ar} (${currencyData.code})`);
      
      // التحقق من وجود العملة في القائمة المحلية
      const existingCurrency = currencies.find(c => c.code === currencyData.code);
      
      if (existingCurrency) {
        Alert.alert('تنبيه', `عملة ${currencyData.name_ar} موجودة بالفعل`);
        return;
      }
      
      // إنشاء عملة جديدة في قاعدة البيانات
      const newCurrencyData = {
        code: currencyData.code,
        name_ar: currencyData.name_ar,
        name_en: currencyData.name_en,
        name_he: currencyData.name_he,
        current_rate: getDefaultRate(currencyData.code),
        buy_commission: 6,
        sell_commission: 6,
        is_active: true
      };
      
      // حساب أسعار الشراء والبيع
      newCurrencyData.buy_rate = newCurrencyData.current_rate - (newCurrencyData.buy_commission / 100);
      newCurrencyData.sell_rate = newCurrencyData.current_rate + (newCurrencyData.sell_commission / 100);
      
      // إضافة العملة إلى قاعدة البيانات
      await currencyService.create(newCurrencyData);
      
      // إعادة تحميل العملات من قاعدة البيانات
      await loadCurrencies();
      
      console.log(`✅ تم إضافة العملة ${currencyData.code} بنجاح`);
      
      Alert.alert(
        '✅ تم بنجاح', 
        `تم إضافة عملة ${currencyData.name_ar} بحالة متوفرة`
      );
      
    } catch (error) {
      console.error('❌ خطأ في إضافة العملة إلى قاعدة البيانات:', error);
      Alert.alert('❌ خطأ', 'حدث خطأ في إضافة العملة إلى قاعدة البيانات');
    }
  };

  const getDefaultRate = (code: string): number => {
    const defaultRates: { [key: string]: number } = {
      USD: 3.65, EUR: 3.95, GBP: 4.60, CHF: 4.10, CAD: 2.70,
      AUD: 2.40, JPY: 0.025, SEK: 0.35, NOK: 0.34, DKK: 0.54,
      TRY: 0.12, RUB: 0.037, CNY: 0.51, KRW: 0.0028, THB: 0.105,
      SGD: 2.75, HKD: 0.48, MXN: 0.19, BRL: 0.62, AED: 1.00,
      SAR: 0.98, EGP: 0.075, JOD: 5.20, KWD: 12.00, QAR: 1.01
    };
    return defaultRates[code] || 1.0;
  };

  // تصفية العملات المتاحة للإضافة
  const filteredAvailableCurrencies = availableCurrencies.filter(ac => {
    const existingCurrency = currencies.find(c => c.code === ac.code);
    return !existingCurrency;
  });

  const handleLogout = async () => {
    router.replace('/(tabs)/accounting');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.container, styles.centerContent]}>
          <Text style={styles.loadingText}>جاري تحميل العملات...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>إدارة العملات</Text>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>خروج</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {/* Real-time Status Indicator */}
          <View style={styles.realtimeIndicator}>
            <View style={styles.realtimeDot} />
            <Text style={styles.realtimeText}>
              🔄 التحديثات تلقائية - أي تغيير في قاعدة البيانات سيظهر فوراً
            </Text>
          </View>

          {/* Auto Update Toggle Button */}
          <View style={styles.updateButtonContainer}>
            <TouchableOpacity
              style={[
                styles.updateRatesButton,
                isAutoUpdateRunning ? styles.stopButton : styles.startButton
              ]}
              onPress={toggleAutoUpdate}
            >
              <Text style={styles.updateRatesButtonText}>
                {isAutoUpdateRunning ? '⏹️ إيقاف قراءة الأسعار' : '▶️ تشغيل قراءة الأسعار'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Add Currency Button */}
          <View style={styles.addButtonContainer}>
            <TouchableOpacity
              style={styles.addNewCurrencyButton}
              onPress={() => setShowAddModal(true)}
            >
              <Text style={styles.addNewCurrencyButtonText}>➕ إضافة عملة جديدة</Text>
            </TouchableOpacity>
          </View>

          {/* All Currencies Table */}
          <View style={styles.tableContainer}>
            <Text style={styles.tableTitle}>جميع العملات ({currencies.length})</Text>
            
            {/* Table Header */}
            <View style={styles.tableHeader}>
              <View style={styles.headerCell}>
                <Text style={styles.headerText}>العملة</Text>
              </View>
              <View style={styles.headerCell}>
                <Text style={styles.headerText}>السعر الحالي</Text>
              </View>
              <View style={styles.headerCell}>
                <Text style={styles.headerText}>شراء</Text>
              </View>
              <View style={styles.headerCell}>
                <Text style={styles.headerText}>بيع</Text>
              </View>
              <View style={styles.headerCell}>
                <Text style={styles.headerText}>الحالة</Text>
              </View>
              <View style={styles.headerCell}>
                <Text style={styles.headerText}>حذف</Text>
              </View>
            </View>

            {/* Currency Rows */}
            {currencies.map((currency, index) => (
              <View key={currency.id} style={[
                styles.tableRow, 
                index % 2 === 0 ? styles.evenRow : styles.oddRow,
                !currency.is_active && styles.inactiveRow
              ]}>
                <View style={styles.currencyCell}>
                  <Text style={[styles.currencyCode, !currency.is_active && styles.inactiveText]}>
                    {currency.code}
                  </Text>
                  <Text style={[styles.currencyName, !currency.is_active && styles.inactiveText]}>
                    {currency.name_ar}
                  </Text>
                  <Text style={[styles.currencyNameEn, !currency.is_active && styles.inactiveText]}>
                    {currency.name_en}
                  </Text>
                </View>
                
                <TouchableOpacity
                  style={styles.rateCell}
                  onPress={() => openEditRateModal(currency)}
                >
                  <Text style={[styles.currentRate, !currency.is_active && styles.inactiveText]}>
                    {currency.current_rate ? currency.current_rate.toFixed(2) : 'N/A'}
                  </Text>
                  <Text style={[styles.editHint, !currency.is_active && styles.inactiveText]}>
                    اضغط للتعديل
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.rateCell}
                  onPress={() => openCommissionModal(currency, 'buy')}
                >
                  <Text style={[styles.buyRate, !currency.is_active && styles.inactiveText]}>
                    {currency.buy_rate ? currency.buy_rate.toFixed(2) : 'N/A'}
                  </Text>
                  <Text style={[styles.commissionText, !currency.is_active && styles.inactiveText]}>
                    عمولة: {currency.buy_commission} أجورة
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.rateCell}
                  onPress={() => openCommissionModal(currency, 'sell')}
                >
                  <Text style={[styles.sellRate, !currency.is_active && styles.inactiveText]}>
                    {currency.sell_rate ? currency.sell_rate.toFixed(2) : 'N/A'}
                  </Text>
                  <Text style={[styles.commissionText, !currency.is_active && styles.inactiveText]}>
                    عمولة: {currency.sell_commission} أجورة
                  </Text>
                </TouchableOpacity>
                
                <View style={styles.statusCell}>
                  <TouchableOpacity
                    style={[
                      styles.statusButton,
                      currency.is_active ? styles.activeButton : styles.inactiveButton
                    ]}
                    onPress={() => toggleCurrencyStatus(currency.id)}
                  >
                    <Text style={styles.statusButtonText}>
                      {currency.is_active ? 'متوفرة' : 'غير متوفرة'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.actionsCell}>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => confirmDeleteCurrency(currency)}
                  >
                    <Text style={styles.deleteButtonText}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            {/* No Currencies Message */}
            {currencies.length === 0 && (
              <View style={styles.noCurrenciesContainer}>
                <Text style={styles.noCurrenciesText}>لا توجد عملات محفوظة</Text>
                <Text style={styles.noCurrenciesSubText}>يرجى إضافة عملات جديدة</Text>
              </View>
            )}
          </View>
        </View>

        {/* Commission Modal */}
        <Modal
          visible={showCommissionModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowCommissionModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  تعديل عمولة {editType === 'buy' ? 'الشراء' : 'البيع'}
                </Text>
                <TouchableOpacity 
                  style={styles.closeButton} 
                  onPress={() => setShowCommissionModal(false)}
                >
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.modalContent}>
                {editingCurrency && (
                  <>
                    <Text style={styles.currencyInfo}>
                      العملة: {editingCurrency.name_ar} ({editingCurrency.code})
                    </Text>
                    
                    <Text style={styles.inputLabel}>
                      عمولة {editType === 'buy' ? 'الشراء' : 'البيع'} (بالأجورات):
                    </Text>
                    
                    <TextInput
                      style={styles.input}
                      value={commissionValue}
                      onChangeText={setCommissionValue}
                      placeholder="6"
                      keyboardType="numeric"
                      autoFocus={true}
                      selectTextOnFocus={true}
                    />
                    
                    <Text style={styles.commissionNote}>
                      * كل 100 أجورة = 1 شيقل
                    </Text>
                    
                    <TouchableOpacity 
                      style={styles.saveButton} 
                      onPress={saveCommission}
                    >
                      <Text style={styles.saveButtonText}>حفظ العمولة</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          </View>
        </Modal>

        {/* Add Currency Modal */}
        <Modal
          visible={showAddModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowAddModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.addModalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>إضافة عملة جديدة</Text>
                <TouchableOpacity 
                  style={styles.closeButton} 
                  onPress={() => {
                    setShowAddModal(false);
                    setNewCurrencyForm({
                      code: '',
                      name_ar: '',
                      name_en: '',
                      name_he: '',
                      current_rate: '',
                      buy_commission: '6',
                      sell_commission: '6'
                    });
                  }}
                >
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView 
                style={styles.addModalContent}
                showsVerticalScrollIndicator={true}
                contentContainerStyle={styles.addModalScrollContent}
              >
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>رمز العملة (مثل USD, EUR):</Text>
                  <TextInput
                    style={styles.input}
                    value={newCurrencyForm.code}
                    onChangeText={(text) => setNewCurrencyForm(prev => ({ ...prev, code: text.toUpperCase() }))}
                    placeholder="USD"
                    maxLength={3}
                    autoCapitalize="characters"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>اسم العملة بالعربية:</Text>
                  <TextInput
                    style={styles.input}
                    value={newCurrencyForm.name_ar}
                    onChangeText={(text) => setNewCurrencyForm(prev => ({ ...prev, name_ar: text }))}
                    placeholder="دولار أمريكي"
                    textAlign="right"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>اسم العملة بالإنجليزية:</Text>
                  <TextInput
                    style={styles.input}
                    value={newCurrencyForm.name_en}
                    onChangeText={(text) => setNewCurrencyForm(prev => ({ ...prev, name_en: text }))}
                    placeholder="US Dollar"
                    textAlign="left"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>اسم العملة بالعبرية:</Text>
                  <TextInput
                    style={styles.input}
                    value={newCurrencyForm.name_he}
                    onChangeText={(text) => setNewCurrencyForm(prev => ({ ...prev, name_he: text }))}
                    placeholder="דולר אמריקאי"
                    textAlign="right"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>السعر الحالي (مقابل الشيقل):</Text>
                  <TextInput
                    style={styles.input}
                    value={newCurrencyForm.current_rate}
                    onChangeText={(text) => setNewCurrencyForm(prev => ({ ...prev, current_rate: text }))}
                    placeholder="3.65"
                    keyboardType="decimal-pad"
                    textAlign="center"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>عمولة الشراء (بالأجورات):</Text>
                  <TextInput
                    style={styles.input}
                    value={newCurrencyForm.buy_commission}
                    onChangeText={(text) => setNewCurrencyForm(prev => ({ ...prev, buy_commission: text }))}
                    placeholder="6"
                    keyboardType="numeric"
                    textAlign="center"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>عمولة البيع (بالأجورات):</Text>
                  <TextInput
                    style={styles.input}
                    value={newCurrencyForm.sell_commission}
                    onChangeText={(text) => setNewCurrencyForm(prev => ({ ...prev, sell_commission: text }))}
                    placeholder="6"
                    keyboardType="numeric"
                    textAlign="center"
                  />
                </View>

                <Text style={styles.commissionNote}>
                  * كل 100 أجورة = 1 شيقل
                </Text>

                <TouchableOpacity 
                  style={styles.saveButton} 
                  onPress={saveNewCurrency}
                >
                  <Text style={styles.saveButtonText}>💾 حفظ العملة الجديدة</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Edit Rate Modal */}
        <Modal
          visible={showEditRateModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowEditRateModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>تعديل السعر الحالي</Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setShowEditRateModal(false)}
                >
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.modalContent}>
                {editingRateCurrency && (
                  <>
                    <Text style={styles.currencyInfo}>
                      العملة: {editingRateCurrency.name_ar} ({editingRateCurrency.code})
                    </Text>

                    <Text style={styles.inputLabel}>
                      السعر الحالي الجديد (مقابل الشيقل):
                    </Text>

                    <TextInput
                      style={styles.input}
                      value={newRateValue}
                      onChangeText={setNewRateValue}
                      placeholder="3.65"
                      keyboardType="decimal-pad"
                      autoFocus={true}
                      selectTextOnFocus={true}
                    />

                    <Text style={styles.commissionNote}>
                      * سيتم تحديث أسعار الشراء والبيع تلقائياً حسب العمولات
                    </Text>

                    <TouchableOpacity
                      style={styles.saveButton}
                      onPress={saveNewRate}
                    >
                      <Text style={styles.saveButtonText}>حفظ السعر الجديد</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

const saveNewCurrency = async () => {
  // التحقق من البيانات المطلوبة
  if (!newCurrencyForm.code.trim()) {
    Alert.alert('خطأ', 'يرجى إدخال رمز العملة');
    return;
  }

  if (!newCurrencyForm.name_ar.trim()) {
    Alert.alert('خطأ', 'يرجى إدخال اسم العملة بالعربية');
    return;
  }

  if (!newCurrencyForm.name_en.trim()) {
    Alert.alert('خطأ', 'يرجى إدخال اسم العملة بالإنجليزية');
    return;
  }

  if (!newCurrencyForm.current_rate.trim()) {
    Alert.alert('خطأ', 'يرجى إدخال السعر الحالي');
    return;
  }

  const currentRate = parseFloat(newCurrencyForm.current_rate);
  const buyCommission = parseInt(newCurrencyForm.buy_commission);
  const sellCommission = parseInt(newCurrencyForm.sell_commission);

  if (isNaN(currentRate) || currentRate <= 0) {
    Alert.alert('خطأ', 'يرجى إدخال سعر صحيح');
    return;
  }

  if (isNaN(buyCommission) || buyCommission < 0) {
    Alert.alert('خطأ', 'يرجى إدخال عمولة شراء صحيحة');
    return;
  }

  if (isNaN(sellCommission) || sellCommission < 0) {
    Alert.alert('خطأ', 'يرجى إدخال عمولة بيع صحيحة');
    return;
  }

  // التحقق من عدم وجود العملة مسبقاً
  const existingCurrency = currencies.find(c => c.code === newCurrencyForm.code);
  if (existingCurrency) {
    Alert.alert('تنبيه', `عملة ${newCurrencyForm.code} موجودة بالفعل`);
    return;
  }

  try {
    console.log(`🔄 إضافة عملة جديدة: ${newCurrencyForm.name_ar} (${newCurrencyForm.code})`);
    
    // إنشاء بيانات العملة الجديدة
    const newCurrencyData = {
      code: newCurrencyForm.code,
      name_ar: newCurrencyForm.name_ar,
      name_en: newCurrencyForm.name_en,
      name_he: newCurrencyForm.name_he || newCurrencyForm.name_en,
      current_rate: currentRate,
      buy_commission: buyCommission,
      sell_commission: sellCommission,
      is_active: true
    };
    
    // إضافة العملة إلى قاعدة البيانات
    await currencyService.create(newCurrencyData);
    
    // إعادة تحميل العملات من قاعدة البيانات
    await loadCurrencies();
    
    // إغلاق النافذة وإعادة تعيين النموذج
    setShowAddModal(false);
    setNewCurrencyForm({
      code: '',
      name_ar: '',
      name_en: '',
      name_he: '',
      current_rate: '',
      buy_commission: '6',
      sell_commission: '6'
    });
    
    console.log(`✅ تم إضافة العملة ${newCurrencyForm.code} بنجاح`);
    
    Alert.alert(
      '✅ تم بنجاح', 
      `تم إضافة عملة ${newCurrencyForm.name_ar} (${newCurrencyForm.code}) بحالة متوفرة`
    );
    
  } catch (error) {
    console.error('❌ خطأ في إضافة العملة إلى قاعدة البيانات:', error);
    Alert.alert('❌ خطأ', 'حدث خطأ في إضافة العملة إلى قاعدة البيانات');
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0FDF4',
  },
  scrollContainer: {
    flex: 1,
    padding: 20,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#065F46',
  },
  logoutButton: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  content: {
    marginBottom: 20,
  },
  realtimeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DBEAFE',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#93C5FD',
  },
  realtimeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
    marginRight: 10,
  },
  realtimeText: {
    flex: 1,
    fontSize: 13,
    color: '#1E40AF',
    fontWeight: '600',
  },
  updateButtonContainer: {
    marginBottom: 15,
  },
  updateRatesButton: {
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  startButton: {
    backgroundColor: '#10B981',
  },
  stopButton: {
    backgroundColor: '#EF4444',
  },
  updateRatesButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  addButtonContainer: {
    marginBottom: 20,
  },
  addNewCurrencyButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#059669',
    borderStyle: 'dashed',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  addNewCurrencyButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#059669',
  },
  tableContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  tableTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    padding: 15,
    textAlign: 'center',
    backgroundColor: '#F3F4F6',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#065F46',
    paddingVertical: 12,
  },
  headerCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  headerText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  evenRow: {
    backgroundColor: '#F9FAFB',
  },
  oddRow: {
    backgroundColor: '#FFFFFF',
  },
  inactiveRow: {
    backgroundColor: '#FEF3C7',
    opacity: 0.8,
  },
  currencyCell: {
    flex: 1.2,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  currencyCode: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  currencyName: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
  },
  currencyNameEn: {
    fontSize: 9,
    color: '#9CA3AF',
    marginTop: 1,
  },
  inactiveText: {
    color: '#92400E',
    opacity: 0.7,
  },
  rateCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  currentRate: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1E40AF',
  },
  editHint: {
    fontSize: 8,
    color: '#9CA3AF',
    marginTop: 2,
    textAlign: 'center',
  },
  buyRate: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#DC2626',
  },
  sellRate: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#059669',
  },
  commissionText: {
    fontSize: 9,
    color: '#6B7280',
    marginTop: 2,
    textAlign: 'center',
  },
  statusCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    minWidth: 70,
  },
  activeButton: {
    backgroundColor: '#059669',
  },
  inactiveButton: {
    backgroundColor: '#F59E0B',
  },
  statusButtonText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  actionsCell: {
    flex: 0.6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    backgroundColor: '#DC2626',
    width: 35,
    height: 35,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonText: {
    fontSize: 16,
  },
  noCurrenciesContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noCurrenciesText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  noCurrenciesSubText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 450,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
  },
  addModalContent: {
    maxHeight: 500,
  },
  addModalScrollContent: {
    paddingBottom: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalContent: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    padding: 12,
    fontSize: 16,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
  },
  currencyInfo: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 20,
    backgroundColor: '#F3F4F6',
    padding: 10,
    borderRadius: 8,
  },
  inputLabel: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 10,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    padding: 15,
    fontSize: 18,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    textAlign: 'center',
    marginBottom: 10,
  },
  commissionNote: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  saveButton: {
    backgroundColor: '#059669',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});