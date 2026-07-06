import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal,
  TextInput, Alert, SafeAreaView, Image, Dimensions, Linking,
  AppState, AppStateStatus, Platform, Animated
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { currencyService, companySettingsService, workingHoursService, currencyUpdateLogService } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';
import { exchangeRateAPI } from '@/lib/exchangeRateAPI';
import { useAutoUpdateRates } from '@/hooks/useAutoUpdateRates';
import { LinearGradient } from 'expo-linear-gradient';

interface Currency {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  name_he?: string;
  current_rate: number;
  buy_rate: number;
  sell_rate: number;
  is_active: boolean;
  sort_num?: number;
}

interface CompanyInfo {
  name_ar: string;
  name_he: string;
  name_en: string;
  address_ar: string;
  address_he: string;
  address_en: string;
  phone1: string;
  phone2?: string;
  phone3?: string;
}

interface WorkingHours {
  day_of_week: string;
  is_working_day: boolean;
  morning_start: string;
  morning_end: string;
  evening_start: string;
  evening_end: string;
}

interface Advertisement {
  id: string;
  position: string;
  title: string;
  description: string;
  image_url: string | number | any;
  is_active: boolean;
}

const DAYS_OF_WEEK = [
  { key: 'sunday', ar: 'الأحد', he: 'ראשון', en: 'Sunday' },
  { key: 'monday', ar: 'الإثنين', he: 'שני', en: 'Monday' },
  { key: 'tuesday', ar: 'الثلاثاء', he: 'שלישי', en: 'Tuesday' },
  { key: 'wednesday', ar: 'الأربعاء', he: 'רביעי', en: 'Wednesday' },
  { key: 'thursday', ar: 'الخميس', he: 'חמישי', en: 'Thursday' },
  { key: 'friday', ar: 'الجمعة', he: 'שישי', en: 'Friday' },
  { key: 'saturday', ar: 'السبت', he: 'שבת', en: 'Saturday' }
];

const getCurrencyFlag = (code: string): string => {
  const flags: { [key: string]: string } = {
    'USD': '🇺🇸', 'EUR': '🇪🇺', 'GBP': '🇬🇧', 'JPY': '🇯🇵',
    'AUD': '🇦🇺', 'CAD': '🇨🇦', 'CHF': '🇨🇭', 'CNY': '🇨🇳',
    'SEK': '🇸🇪', 'NZD': '🇳🇿', 'JOD': '🇯🇴', 'EGP': '🇪🇬',
    'AED': '🇦🇪', 'SAR': '🇸🇦', 'KWD': '🇰🇼', 'TRY': '🇹🇷',
    'ILS': '🇮🇱',
  };
  return flags[code] || '💱';
};

export default function PricesScreen() {
  const [allCurrencies, setAllCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState<'ar' | 'he' | 'en'>('ar');
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [workingHours, setWorkingHours] = useState<WorkingHours[]>([]);
  const [advertisements, setAdvertisements] = useState<Advertisement[]>([]);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [showCalculator, setShowCalculator] = useState(false);
  const [fromCurrency, setFromCurrency] = useState('ILS');
  const [toCurrency, setToCurrency] = useState('USD');
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [calculationDetails, setCalculationDetails] = useState('');
  const [inputSide, setInputSide] = useState<'left' | 'right'>('left');
  const [inactivityTimer, setInactivityTimer] = useState<NodeJS.Timeout | null>(null);
  const [screenData, setScreenData] = useState(Dimensions.get('window'));
  const [lastUpdateTime, setLastUpdateTime] = useState<string>('');
  const [selectedFirstCurrency, setSelectedFirstCurrency] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const router = useRouter();
  const isScreenFocused = useRef<boolean>(false);
  const appState = useRef(AppState.currentState);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim1 = useRef(new Animated.Value(1)).current;
  const pulseAnim2 = useRef(new Animated.Value(1)).current;

  useAutoUpdateRates();

  useEffect(() => {
    const clockTimer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(clockTimer);
  }, []);

  useEffect(() => {
    const onChange = (result: any) => {
      setScreenData(result.window);
    };
    const subscription = Dimensions.addEventListener('change', onChange);
    loadData();
    loadLanguage();

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active' &&
        isScreenFocused.current
      ) {
        // تحديث تلقائي معطل
      }
      appState.current = nextAppState;
    };

    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
      appStateSubscription?.remove();
    };
  }, []);

  useEffect(() => {
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    );
    pulseAnimation.start();
    return () => pulseAnimation.stop();
  }, [pulseAnim]);

  useEffect(() => {
    const boxesAnimation = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulseAnim1, { toValue: 1.15, duration: 1200, useNativeDriver: true }),
          Animated.timing(pulseAnim1, { toValue: 1, duration: 1200, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(pulseAnim2, { toValue: 0.92, duration: 1200, useNativeDriver: true }),
          Animated.timing(pulseAnim2, { toValue: 1, duration: 1200, useNativeDriver: true }),
        ]),
      ])
    );
    boxesAnimation.start();
    return () => boxesAnimation.stop();
  }, [pulseAnim1, pulseAnim2]);

  useFocusEffect(
    React.useCallback(() => {
      isScreenFocused.current = true;
      setupRealtimeSubscription();
      checkAndUpdateRates();
      return () => {
        isScreenFocused.current = false;
        clearInactivityTimer();
        setSelectedFirstCurrency(null);
      };
    }, [])
  );

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('currencies-updates')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'currencies' },
        (payload) => handleCurrencyUpdate(payload.new)
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  };

  const handleCurrencyUpdate = (updatedCurrency: any) => {
    setAllCurrencies((prev) =>
      prev.map((c) => c.id === updatedCurrency.id ? { ...c, ...updatedCurrency } : c)
        .sort((a, b) => (a.sort_num ?? 999) - (b.sort_num ?? 999))
    );
  };

  useEffect(() => {
    if (advertisements.length > 1) {
      const interval = setInterval(() => {
        setCurrentAdIndex((prev) => (prev + 1) % advertisements.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [advertisements.length]);

  useEffect(() => {
    saveLanguage();
    notifyLanguageChange();
  }, [language]);

  const loadLanguage = async () => {
    try {
      const saved = await AsyncStorage.getItem('selectedLanguage');
      if (saved && ['ar', 'he', 'en'].includes(saved)) {
        setLanguage(saved as 'ar' | 'he' | 'en');
      }
    } catch {}
  };

  const saveLanguage = async () => {
    try {
      await AsyncStorage.setItem('selectedLanguage', language);
      await AsyncStorage.setItem('languageChangeTimestamp', Date.now().toString());
    } catch {}
  };

  const notifyLanguageChange = async () => {
    try {
      await AsyncStorage.setItem('languageChanged', 'true');
    } catch {}
  };

  const checkAndUpdateRates = async () => {
    try {
      if (Platform.OS !== 'web') return;
      const autoUpdateEnabled = await currencyUpdateLogService.getAutoUpdateStatus();
      if (autoUpdateEnabled) {
        const result = await exchangeRateAPI.forceUpdateCurrencyRates();
        if (result.success && result.updatedCount && result.updatedCount > 0) {
          await loadData();
          const updateInfo = await exchangeRateAPI.getLastUpdateInfo();
          if (updateInfo.lastUpdate) setLastUpdateTime(updateInfo.lastUpdate);
        }
      }
    } catch {}
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const currenciesData = await currencyService.getAll();
      const sorted = currenciesData.sort((a, b) => (a.sort_num ?? 999) - (b.sort_num ?? 999));
      setAllCurrencies(sorted);

      const companyData = await companySettingsService.get();
      if (companyData) {
        setCompanyInfo(companyData);
        const whData = await workingHoursService.getByCompanyId(companyData.id);
        setWorkingHours(whData);
      }
      await loadAdvertisements();
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const loadAdvertisements = async () => {
    try {
      const { data, error } = await supabase
        .from('advertisements')
        .select('*')
        .eq('is_active', true)
        .order('created_at');
      if (error) throw error;
      if (data && data.length > 0) {
        setAdvertisements(data);
      } else {
        loadLocalAdvertisements();
      }
    } catch {
      loadLocalAdvertisements();
    }
  };

  const loadLocalAdvertisements = () => {
    setAdvertisements([
      { id: '1', position: 'header', title: 'UPT Money Transfer', description: 'خدمات تحويل الأموال', image_url: require('@/assets/images/1.jpeg'), is_active: true },
      { id: '2', position: 'header', title: 'KoronaPay', description: 'حوالات مالية سريعة', image_url: require('@/assets/images/2.jpeg'), is_active: true },
      { id: '3', position: 'header', title: 'WORLDCOM FINANCE', description: 'خدمات مالية متكاملة', image_url: require('@/assets/images/3.jpeg'), is_active: true },
      { id: '4', position: 'header', title: 'WORLDCOM FINANCE Money Transfer', description: 'إرسال واستقبال الأموال', image_url: require('@/assets/images/4.jpeg'), is_active: true },
      { id: '5', position: 'header', title: 'Ria Money Transfer', description: 'حوالات مالية دولية', image_url: require('@/assets/images/5.jpeg'), is_active: true },
    ]);
  };

  const getWorkingDaysText = () => {
    if (!workingHours || workingHours.length === 0) {
      if (language === 'he') return 'ראשון - חמישי, שבת';
      if (language === 'en') return 'Sunday - Thursday, Saturday';
      return 'الأحد - الخميس، السبت';
    }
    const workingDays = workingHours
      .filter(wh => wh.is_working_day === true || wh.is_working_day === 'true' as any)
      .map(wh => wh.day_of_week);
    if (workingDays.length === 0) {
      if (language === 'he') return 'ראשון - חמישי, שבת';
      if (language === 'en') return 'Sunday - Thursday, Saturday';
      return 'الأحد - الخميس، السبت';
    }
    return DAYS_OF_WEEK
      .filter(day => workingDays.includes(day.key))
      .map(day => language === 'he' ? day.he : language === 'en' ? day.en : day.ar)
      .join(' - ');
  };

  const getWorkingHoursText = () => {
    if (!workingHours || workingHours.length === 0) {
      return { morning: '09:00 - 14:00', evening: '16:00 - 18:00' };
    }
    const first = workingHours.find(wh => wh.is_working_day === true || wh.is_working_day === 'true' as any);
    if (first) {
      return {
        morning: `${first.morning_start} - ${first.morning_end}`,
        evening: `${first.evening_start} - ${first.evening_end}`,
      };
    }
    return { morning: '09:00 - 14:00', evening: '16:00 - 18:00' };
  };

  const calculateConversion = (amount: string, side: 'left' | 'right') => {
    if (!amount || isNaN(parseFloat(amount))) {
      setFromAmount(''); setToAmount(''); setCalculationDetails('');
      return;
    }
    const inputAmount = parseFloat(amount);
    let result = 0;
    let details = '';
    const fromCurrencyData = allCurrencies.find(c => c.code === fromCurrency);
    const toCurrencyData = allCurrencies.find(c => c.code === toCurrency);
    if ((fromCurrency !== 'ILS' && !fromCurrencyData) || (toCurrency !== 'ILS' && !toCurrencyData)) {
      setCalculationDetails('عملة غير موجودة');
      return;
    }
    if (fromCurrency === toCurrency) {
      result = inputAmount;
      details = 'نفس العملة';
    } else if (side === 'right') {
      if (toCurrency === 'ILS') {
        result = inputAmount / fromCurrencyData!.buy_rate;
        details = `${inputAmount.toFixed(2)} شيقل ÷ ${fromCurrencyData!.buy_rate.toFixed(2)} = ${result.toFixed(2)} ${fromCurrency}`;
      } else if (fromCurrency === 'ILS') {
        result = inputAmount * toCurrencyData!.sell_rate;
        details = `${inputAmount.toFixed(2)} ${toCurrency} × ${toCurrencyData!.sell_rate.toFixed(2)} = ${result.toFixed(2)} شيقل`;
      } else {
        const shekelAmount = inputAmount * toCurrencyData!.sell_rate;
        result = shekelAmount / fromCurrencyData!.buy_rate;
        details = `${inputAmount.toFixed(2)} ${toCurrency} × ${toCurrencyData!.sell_rate.toFixed(2)} = ${shekelAmount.toFixed(2)} ÷ ${fromCurrencyData!.buy_rate.toFixed(2)} = ${result.toFixed(2)} ${fromCurrency}`;
      }
    } else {
      if (toCurrency === 'ILS') {
        result = inputAmount * fromCurrencyData!.buy_rate;
        details = `${inputAmount.toFixed(2)} ${fromCurrency} × ${fromCurrencyData!.buy_rate.toFixed(2)} = ${result.toFixed(2)} شيقل`;
      } else if (fromCurrency === 'ILS') {
        result = inputAmount / toCurrencyData!.sell_rate;
        details = `${inputAmount.toFixed(2)} شيقل ÷ ${toCurrencyData!.sell_rate.toFixed(2)} = ${result.toFixed(2)} ${toCurrency}`;
      } else {
        const shekelAmount = inputAmount * fromCurrencyData!.buy_rate;
        result = shekelAmount / toCurrencyData!.sell_rate;
        details = `${inputAmount.toFixed(2)} ${fromCurrency} × ${fromCurrencyData!.buy_rate.toFixed(2)} = ${shekelAmount.toFixed(2)} ÷ ${toCurrencyData!.sell_rate.toFixed(2)} = ${result.toFixed(2)} ${toCurrency}`;
      }
    }
    if (side === 'left') setToAmount(result.toFixed(2));
    else setFromAmount(result.toFixed(2));
    setCalculationDetails(details);
  };

  const handleFromAmountChange = (text: string) => {
    setFromAmount(text);
    setInputSide('left');
    calculateConversion(text, 'left');
    resetInactivityTimer();
  };

  const handleToAmountChange = (text: string) => {
    setToAmount(text);
    setInputSide('right');
    calculateConversion(text, 'right');
    resetInactivityTimer();
  };

  const swapCurrencies = () => {
    const tmp = fromCurrency;
    setFromCurrency(toCurrency);
    setToCurrency(tmp);
    setFromAmount(toAmount);
    setToAmount(fromAmount);
    if (toAmount) calculateConversion(toAmount, 'left');
    resetInactivityTimer();
  };

  const cycleCurrency = (current: string, isFrom: boolean) => {
    const list = [{ code: 'ILS' }, ...allCurrencies.filter(c => c.is_active)];
    const idx = list.findIndex(c => c.code === current);
    const next = list[(idx + 1) % list.length].code;
    if (isFrom) { setFromCurrency(next); if (fromAmount) calculateConversion(fromAmount, 'left'); }
    else { setToCurrency(next); if (fromAmount) calculateConversion(fromAmount, 'left'); }
    resetInactivityTimer();
  };

  const handleCurrencyNameClick = (code: string) => {
    if (!selectedFirstCurrency) {
      setSelectedFirstCurrency(code);
    } else if (selectedFirstCurrency === code) {
      setSelectedFirstCurrency(null);
    } else {
      openCalculatorWithTwoCurrencies(selectedFirstCurrency, code);
      setSelectedFirstCurrency(null);
    }
  };

  const openCalculatorWithTwoCurrencies = async (first: string, second: string) => {
    await AsyncStorage.setItem('calculatorFromCurrency', first);
    await AsyncStorage.setItem('calculatorToCurrency', second);
    router.push('/calculator');
  };

  const openCalculator = async (currencyCode?: string, rateType?: 'buy' | 'sell' | 'current') => {
    if (currencyCode && currencyCode !== 'ILS') {
      if (rateType === 'buy') {
        await AsyncStorage.setItem('calculatorFromCurrency', currencyCode);
        await AsyncStorage.setItem('calculatorToCurrency', 'ILS');
      } else if (rateType === 'sell') {
        await AsyncStorage.setItem('calculatorFromCurrency', 'ILS');
        await AsyncStorage.setItem('calculatorToCurrency', currencyCode);
      } else {
        await AsyncStorage.setItem('calculatorFromCurrency', 'ILS');
        await AsyncStorage.setItem('calculatorToCurrency', currencyCode);
      }
    }
    router.push('/calculator');
  };

  const closeCalculator = () => {
    setShowCalculator(false);
    setFromAmount(''); setToAmount(''); setCalculationDetails('');
    clearInactivityTimer();
  };

  const handleProceedToTransaction = async () => {
    try {
      clearInactivityTimer();
      const data = { fromCurrency, toCurrency, fromAmount, toAmount, calculationDetails, timestamp: new Date().toISOString(), isFromCalculator: true };
      await AsyncStorage.setItem('fromCalculator', 'true');
      await AsyncStorage.setItem('calculatorData', JSON.stringify(data));
      await AsyncStorage.setItem('calculatorTransactionReady', 'true');
      closeCalculator();
      router.push('/(tabs)/customer-info');
    } catch {
      Alert.alert('خطأ', 'حدث خطأ في حفظ البيانات');
    }
  };

  const startInactivityTimer = () => {
    clearInactivityTimer();
    const timer = setTimeout(() => closeCalculator(), 10000);
    setInactivityTimer(timer);
  };

  const clearInactivityTimer = () => {
    if (inactivityTimer) { clearTimeout(inactivityTimer); setInactivityTimer(null); }
  };

  const resetInactivityTimer = () => { if (showCalculator) startInactivityTimer(); };

  useEffect(() => { return () => { clearInactivityTimer(); }; }, []);

  const openMapsOptions = () => {
    const lat = 32.856665;
    const lng = 35.335847;
    Alert.alert(
      language === 'ar' ? 'اختر تطبيق الخرائط' : language === 'he' ? 'בחר אפליקציית מפות' : 'Choose Map App',
      '',
      [
        { text: 'Google Maps', onPress: () => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`) },
        { text: 'Waze', onPress: () => Linking.openURL(`https://waze.com/ul?ll=${lat},${lng}&navigate=yes`) },
        { text: language === 'ar' ? 'إلغاء' : language === 'he' ? 'ביטול' : 'Cancel', style: 'cancel' }
      ]
    );
  };

  const openWhatsApp = async () => {
    const phone = '972526000841';
    const msg = language === 'ar' ? 'مرحباً، أريد التواصل معكم' : language === 'he' ? 'שלום, אני רוצה ליצור קשר' : 'Hello, I would like to contact you';
    const url = `whatsapp://send?phone=${phone}&text=${encodeURIComponent(msg)}`;
    try {
      const can = await Linking.canOpenURL(url);
      if (can) await Linking.openURL(url);
      else Alert.alert('خطأ', 'لا يمكن فتح واتساب');
    } catch {}
  };

  const sendWhatsAppMessage = async (currencyName: string) => {
    const phone = '972526000841';
    const msg = language === 'ar' ? `مرحباً، أرغب في طلب كمية من عملة ${currencyName}.` : language === 'he' ? `שלום, אני רוצה להזמין ${currencyName}.` : `Hello, I'd like to order ${currencyName}.`;
    const url = `whatsapp://send?phone=${phone}&text=${encodeURIComponent(msg)}`;
    try {
      const can = await Linking.canOpenURL(url);
      if (can) await Linking.openURL(url);
    } catch {}
  };

  const navigateToCustomerInfo = async () => {
    try { await AsyncStorage.setItem('selectedLanguage', language); } catch {}
    router.push('/(tabs)/customer-info');
  };

  const navigateToSettings = () => { router.push('/login'); };

  const workingHoursData = getWorkingHoursText();
  const isLargeScreen = screenData.width >= 768;
  const currentAd = advertisements.length > 0 ? advertisements[currentAdIndex] : null;
  const activeCurrencies = allCurrencies.filter(c => c.is_active);
  const trendingCurrencies = activeCurrencies.slice(0, 4);

  const timeStr = currentTime.toLocaleTimeString(
    language === 'ar' ? 'ar-SA' : language === 'he' ? 'he-IL' : 'en-US',
    { hour: '2-digit', minute: '2-digit', hour12: true }
  );
  const dateStr = currentTime.toLocaleDateString(
    language === 'ar' ? 'ar-SA' : language === 'he' ? 'he-IL' : 'en-US',
    { year: 'numeric', month: '2-digit', day: '2-digit' }
  );
  const dayStr = currentTime.toLocaleDateString(
    language === 'ar' ? 'ar-SA' : language === 'he' ? 'he-IL' : 'en-US',
    { weekday: 'long' }
  );

  const companyName = companyInfo
    ? (language === 'ar' ? companyInfo.name_ar : language === 'he' ? companyInfo.name_he : companyInfo.name_en)
    : (language === 'ar' ? 'نعامنة للصرافة' : language === 'he' ? 'נעאמנה להמרות' : 'Naamneh Exchange');

  const companyAddress = companyInfo
    ? (language === 'ar' ? companyInfo.address_ar : language === 'he' ? companyInfo.address_he : companyInfo.address_en)
    : (language === 'ar' ? 'عرابة الشارع الرئيسي' : language === 'he' ? 'ערבה הרחוב הראשי' : 'Arraba Main Street');

  const companyPhone = companyInfo?.phone1 || '0526000841';

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>
          {language === 'ar' ? 'جاري تحميل الأسعار...' : language === 'he' ? 'טוען שערים...' : 'Loading rates...'}
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
      >
        {/* ===== HEADER ===== */}
        <View style={styles.header}>
          {/* Language + Settings */}
          <View style={styles.headerTop}>
            <View style={styles.langRow}>
              {(['ar', 'he', 'en'] as const).map((lang) => (
                <TouchableOpacity
                  key={lang}
                  onPress={() => setLanguage(lang)}
                  style={[styles.langBtn, language === lang && styles.langBtnActive]}
                >
                  <Text style={[styles.langBtnText, language === lang && styles.langBtnTextActive]}>
                    {lang === 'ar' ? 'العربية' : lang === 'he' ? 'עברית' : 'English'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.headerClock}>
              <Text style={styles.clockTime}>{timeStr}</Text>
              <Text style={styles.clockDate}>{dayStr} {dateStr}</Text>
            </View>

            <TouchableOpacity style={styles.logoArea} onPress={navigateToSettings}>
              <View style={styles.logoIcon}>
                <Text style={styles.logoEmoji}>💱</Text>
              </View>
              <View style={styles.logoText}>
                <Text style={styles.companyNameHeader}>{companyName}</Text>
                <Text style={styles.companySubHeader}>
                  {language === 'ar' ? 'لصرافة والتحويلات المالية' : language === 'he' ? 'המרת מטבע והעברות' : 'Exchange & Money Transfer'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* ===== RATES SECTION TITLE ===== */}
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionIcon}>🔄</Text>
          <Text style={styles.sectionTitle}>
            {language === 'ar' ? 'أسعار صرف العملات' : language === 'he' ? 'שערי חליפין' : 'Exchange Rates'}
          </Text>
          <TouchableOpacity style={styles.calcIconBtn} onPress={() => openCalculator()}>
            <Text style={styles.calcIcon}>🧮</Text>
          </TouchableOpacity>
        </View>

        {/* Instruction hint */}
        {selectedFirstCurrency ? (
          <Animated.View style={[styles.hintBar, styles.hintBarSelected, { transform: [{ scale: pulseAnim }] }]}>
            <Text style={styles.hintText}>
              {language === 'ar' ? '✓ اختر عملة ثانية من الجدول' : language === 'he' ? '✓ בחר מטבע שני' : '✓ Select second currency'}
            </Text>
          </Animated.View>
        ) : (
          <View style={styles.hintBar}>
            <Text style={styles.hintText}>
              {language === 'ar' ? '👇 اضغط على سعر بيع أو شراء لفتح الحاسبة' : language === 'he' ? '👇 לחץ על שער לחישוב' : '👇 Tap a rate to open calculator'}
            </Text>
          </View>
        )}

        {/* ===== CURRENCY GRID ===== */}
        <View style={styles.currencyGrid}>
          {allCurrencies.map((currency) => {
            const cardWidth = isLargeScreen
              ? (screenData.width - 60) / 4
              : (screenData.width - 36) / 2;
            return (
            <View
              key={currency.id}
              style={[
                styles.currencyCard,
                { width: cardWidth },
                !currency.is_active && styles.currencyCardUnavailable,
                selectedFirstCurrency === currency.code && styles.currencyCardSelected,
              ]}
            >
              {!currency.is_active && (
                <TouchableOpacity
                  style={styles.unavailableOverlay}
                  onPress={() => {
                    const name = language === 'ar' ? currency.name_ar : language === 'he' ? (currency.name_he || currency.name_ar) : currency.name_en;
                    sendWhatsAppMessage(name);
                  }}
                >
                  <Text style={styles.unavailableOverlayText}>
                    {language === 'ar' ? '⚠️ غير متوفر' : language === 'he' ? '⚠️ לא זמין' : '⚠️ Unavailable'}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Card header: flag + code + name */}
              <TouchableOpacity
                style={styles.cardTop}
                onPress={() => currency.is_active && handleCurrencyNameClick(currency.code)}
                disabled={!currency.is_active}
              >
                <View style={styles.flagCircle}>
                  <Text style={styles.cardFlag}>{getCurrencyFlag(currency.code)}</Text>
                </View>
                <Text style={[styles.cardCode, !currency.is_active && styles.textFaded]}>
                  {currency.code}
                </Text>
                <Text style={[styles.cardName, !currency.is_active && styles.textFaded]}>
                  {language === 'ar' ? currency.name_ar : language === 'he' ? (currency.name_he || currency.name_ar) : currency.name_en}
                </Text>
                {selectedFirstCurrency === currency.code && (
                  <View style={styles.selectedBadge}><Text style={styles.selectedBadgeText}>✓</Text></View>
                )}
              </TouchableOpacity>

              {/* Rates row: buy / sell */}
              <View style={styles.cardRates}>
                <TouchableOpacity
                  style={[styles.rateBox, styles.rateBoxBuy]}
                  onPress={() => currency.is_active && openCalculator(currency.code, 'buy')}
                  disabled={!currency.is_active}
                >
                  <Text style={styles.rateLabel}>
                    {language === 'ar' ? 'شراء' : language === 'he' ? 'קנייה' : 'Buy'}
                  </Text>
                  <Text style={[styles.rateValue, styles.rateValueBuy, !currency.is_active && styles.textFaded]}>
                    {currency.buy_rate?.toFixed(2) ?? 'N/A'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.rateBox, styles.rateBoxSell]}
                  onPress={() => currency.is_active && openCalculator(currency.code, 'sell')}
                  disabled={!currency.is_active}
                >
                  <Text style={styles.rateLabel}>
                    {language === 'ar' ? 'بيع' : language === 'he' ? 'מכירה' : 'Sell'}
                  </Text>
                  <Text style={[styles.rateValue, styles.rateValueSell, !currency.is_active && styles.textFaded]}>
                    {currency.sell_rate?.toFixed(2) ?? 'N/A'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Status dot */}
              <View style={styles.cardFooter}>
                <View style={[styles.statusDot, currency.is_active ? styles.statusDotActive : styles.statusDotInactive]} />
                <Text style={[styles.cardStatusText, currency.is_active ? styles.cardStatusTextActive : styles.cardStatusTextInactive]}>
                  {currency.is_active
                    ? (language === 'ar' ? 'متوفر' : language === 'he' ? 'זמין' : 'Available')
                    : (language === 'ar' ? 'تواصل معنا' : language === 'he' ? 'צור קשר' : 'Contact us')}
                </Text>
              </View>
            </View>
            );
          })}
        </View>

        {/* ===== INFO BAR ===== */}
        <View style={styles.infoBar}>
          <Text style={styles.infoBarIcon}>🔔</Text>
          <Text style={styles.infoBarText}>
            {language === 'ar' ? 'يرجى إبراز الهوية عند العمليات' : language === 'he' ? 'נדרש זיהוי בעת עסקאות' : 'ID required for transactions'}
          </Text>
          {lastUpdateTime ? (
            <Text style={styles.infoBarUpdate}>
              {language === 'ar' ? `آخر تحديث: ${lastUpdateTime}` : language === 'he' ? `עדכון אחרון: ${lastUpdateTime}` : `Last update: ${lastUpdateTime}`}
            </Text>
          ) : null}
        </View>

        {/* ===== SERVICES SECTION ===== */}
        <View style={styles.servicesSection}>
          <View style={styles.sectionDivider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerTitle}>
              {language === 'ar' ? 'خدماتنا' : language === 'he' ? 'השירותים שלנו' : 'Our Services'}
            </Text>
            <View style={styles.dividerLine} />
          </View>
          <View style={styles.servicesGrid}>
            {[
              { icon: '💸', ar: 'تحويل الأموال', he: 'העברת כסף', en: 'Money Transfer' },
              { icon: '🔄', ar: 'صرف العملات', he: 'המרת מטבע', en: 'Currency Exchange' },
              { icon: '🏦', ar: 'حوالات بنكية', he: 'העברות בנקאיות', en: 'Bank Transfers' },
              { icon: '💳', ar: 'بطاقات الدفع', he: 'כרטיסי תשלום', en: 'Payment Cards' },
            ].map((service, i) => (
              <TouchableOpacity key={i} style={styles.serviceCard} onPress={navigateToCustomerInfo}>
                <Text style={styles.serviceIcon}>{service.icon}</Text>
                <Text style={styles.serviceLabel}>
                  {language === 'ar' ? service.ar : language === 'he' ? service.he : service.en}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ===== WORKING HOURS ===== */}
        <View style={styles.workingHoursSection}>
          <View style={styles.sectionDivider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerTitle}>
              {language === 'ar' ? 'ساعات العمل' : language === 'he' ? 'שעות פעילות' : 'Working Hours'}
            </Text>
            <View style={styles.dividerLine} />
          </View>
          <View style={styles.whGrid}>
            <View style={styles.whItem}>
              <Text style={styles.whIcon}>🌅</Text>
              <Text style={styles.whLabel}>{language === 'ar' ? 'صباحاً' : language === 'he' ? 'בוקר' : 'Morning'}</Text>
              <Text style={styles.whValue}>{workingHoursData.morning}</Text>
            </View>
            <View style={styles.whItem}>
              <Text style={styles.whIcon}>🌆</Text>
              <Text style={styles.whLabel}>{language === 'ar' ? 'مساءً' : language === 'he' ? 'ערב' : 'Evening'}</Text>
              <Text style={styles.whValue}>{workingHoursData.evening}</Text>
            </View>
            <View style={styles.whItemFull}>
              <Text style={styles.whIcon}>📅</Text>
              <Text style={styles.whLabel}>{language === 'ar' ? 'أيام العمل' : language === 'he' ? 'ימי עבודה' : 'Working days'}</Text>
              <Text style={styles.whValue}>{getWorkingDaysText()}</Text>
            </View>
          </View>
        </View>

        {/* ===== FOOTER SLOGAN ===== */}
        <View style={styles.footer}>
          <View style={styles.footerDivider} />
          <Text style={styles.footerSlogan}>
            {language === 'ar' ? 'ثقتكم هي عملتنا' : language === 'he' ? 'האמון שלכם הוא המטבע שלנו' : 'Your Trust is Our Currency'}
          </Text>
          <View style={styles.footerDivider} />
        </View>

        {/* Customer Service Button */}
        <TouchableOpacity style={styles.customerBtn} onPress={navigateToCustomerInfo}>
          <Text style={styles.customerBtnText}>
            {language === 'ar' ? '👤 خدمة الزبائن' : language === 'he' ? '👤 שירות לקוחות' : '👤 Customer Service'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ===== CALCULATOR MODAL ===== */}
      <Modal visible={showCalculator} transparent animationType="slide" onRequestClose={closeCalculator}>
        <View style={styles.modalOverlay} onTouchStart={resetInactivityTimer}>
          <View style={styles.calcModal}>
            <View style={styles.calcModalHeader}>
              <Text style={styles.calcModalTitle}>
                {language === 'ar' ? 'آلة حاسبة العملات' : language === 'he' ? 'מחשבון מטבעות' : 'Currency Calculator'}
              </Text>
              <TouchableOpacity style={styles.calcClose} onPress={closeCalculator}>
                <Text style={styles.calcCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator contentContainerStyle={{ paddingBottom: 20 }} onTouchStart={resetInactivityTimer}>
              <View style={styles.calcSection}>
                <Text style={styles.calcSectionLabel}>
                  {language === 'ar' ? 'اختيار العملات' : language === 'he' ? 'בחירת מטבעות' : 'Select Currencies'}
                </Text>
                <View style={styles.calcCurrencyRow}>
                  <TouchableOpacity style={styles.calcCurrencyBtn} onPress={() => { cycleCurrency(fromCurrency, true); resetInactivityTimer(); }}>
                    <Text style={styles.calcCurrencyCode}>{fromCurrency}</Text>
                    <Text style={styles.calcCurrencyName}>
                      {fromCurrency === 'ILS' ? (language === 'ar' ? 'شيقل' : language === 'he' ? 'שקל' : 'Shekel') :
                        (language === 'ar' ? allCurrencies.find(c => c.code === fromCurrency)?.name_ar :
                         language === 'he' ? allCurrencies.find(c => c.code === fromCurrency)?.name_he :
                         allCurrencies.find(c => c.code === fromCurrency)?.name_en) || fromCurrency}
                    </Text>
                    <Text style={styles.calcTapHint}>{language === 'ar' ? 'اضغط للتبديل' : language === 'he' ? 'לחץ להחלפה' : 'Tap to switch'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.calcSwapBtn} onPress={() => { swapCurrencies(); resetInactivityTimer(); }}>
                    <Text style={styles.calcSwapText}>⇅</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.calcCurrencyBtn} onPress={() => { cycleCurrency(toCurrency, false); resetInactivityTimer(); }}>
                    <Text style={styles.calcCurrencyCode}>{toCurrency}</Text>
                    <Text style={styles.calcCurrencyName}>
                      {toCurrency === 'ILS' ? (language === 'ar' ? 'شيقل' : language === 'he' ? 'שקל' : 'Shekel') :
                        (language === 'ar' ? allCurrencies.find(c => c.code === toCurrency)?.name_ar :
                         language === 'he' ? allCurrencies.find(c => c.code === toCurrency)?.name_he :
                         allCurrencies.find(c => c.code === toCurrency)?.name_en) || toCurrency}
                    </Text>
                    <Text style={styles.calcTapHint}>{language === 'ar' ? 'اضغط للتبديل' : language === 'he' ? 'לחץ להחלפה' : 'Tap to switch'}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.calcSection}>
                <Text style={styles.calcSectionLabel}>
                  {language === 'ar' ? 'المبالغ' : language === 'he' ? 'סכומים' : 'Amounts'}
                </Text>
                <View style={styles.calcAmountRow}>
                  <View style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={styles.calcAmountLabel}>{fromCurrency}</Text>
                    <TextInput
                      style={styles.calcAmountInput}
                      value={fromAmount}
                      onChangeText={handleFromAmountChange}
                      onFocus={resetInactivityTimer}
                      placeholder="0.00"
                      keyboardType="decimal-pad"
                    />
                  </View>
                  <View style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={styles.calcAmountLabel}>{toCurrency}</Text>
                    <TextInput
                      style={styles.calcAmountInput}
                      value={toAmount}
                      onChangeText={handleToAmountChange}
                      onFocus={resetInactivityTimer}
                      placeholder="0.00"
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>
              </View>

              {calculationDetails ? (
                <View style={styles.calcDetails}>
                  <Text style={styles.calcDetailsText}>{calculationDetails}</Text>
                </View>
              ) : null}

              {fromAmount && toAmount ? (
                <TouchableOpacity style={styles.calcProceedBtn} onPress={() => { handleProceedToTransaction(); resetInactivityTimer(); }}>
                  <Text style={styles.calcProceedText}>
                    {language === 'ar' ? 'المتابعة للمعاملة' : language === 'he' ? 'המשך לעסקה' : 'Proceed to Transaction'}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const DARK_GREEN = '#0B3D28';
const MID_GREEN = '#165A3C';
const GOLD = '#C9A84C';
const GOLD_LIGHT = '#E8C96A';
const WHITE = '#FFFFFF';
const CARD_SHADOW = { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.18, shadowRadius: 8, elevation: 6 };

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: DARK_GREEN },
  scrollContainer: { flex: 1 },
  loadingContainer: { flex: 1, backgroundColor: DARK_GREEN, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: GOLD, fontSize: 18, fontWeight: '600' },

  /* HEADER */
  header: {
    backgroundColor: DARK_GREEN,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: GOLD + '60',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  langRow: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  langBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: GOLD + '50',
  },
  langBtnActive: {
    backgroundColor: GOLD,
    borderColor: GOLD,
  },
  langBtnText: { color: GOLD + 'CC', fontSize: 11, fontWeight: '600' },
  langBtnTextActive: { color: DARK_GREEN, fontSize: 11, fontWeight: '700' },
  headerClock: { alignItems: 'center' },
  clockTime: { color: WHITE, fontSize: 22, fontWeight: '700', letterSpacing: 1 },
  clockDate: { color: GOLD, fontSize: 12, fontWeight: '500', marginTop: 2 },
  logoArea: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoEmoji: { fontSize: 22 },
  logoText: { alignItems: 'flex-end' },
  companyNameHeader: { color: WHITE, fontSize: 16, fontWeight: '800', textAlign: 'right' },
  companySubHeader: { color: GOLD, fontSize: 10, fontWeight: '500', textAlign: 'right', marginTop: 2 },

  /* TRENDING BAR */
  trendingBar: {
    backgroundColor: MID_GREEN,
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: GOLD + '50',
    ...CARD_SHADOW,
  },
  trendingTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 6, justifyContent: 'center' },
  trendingIcon: { fontSize: 16 },
  trendingTitle: { color: GOLD, fontSize: 14, fontWeight: '700', textAlign: 'center' },
  trendingCurrencies: { flexDirection: 'row', justifyContent: 'space-around' },
  trendingItem: { alignItems: 'center', gap: 2 },
  trendingFlag: { fontSize: 22 },
  trendingCode: { color: WHITE, fontSize: 13, fontWeight: '700' },
  trendingRate: { color: GOLD_LIGHT, fontSize: 12, fontWeight: '600' },

  /* SECTION TITLE */
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    marginHorizontal: 12,
    gap: 8,
  },
  sectionIcon: { fontSize: 18 },
  sectionTitle: { color: GOLD, fontSize: 18, fontWeight: '700', flex: 1, textAlign: 'center' },
  calcIconBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: GOLD,
    alignItems: 'center', justifyContent: 'center',
  },
  calcIcon: { fontSize: 18 },

  /* HINT BAR */
  hintBar: {
    backgroundColor: MID_GREEN + 'AA',
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: GOLD + '30',
  },
  hintBarSelected: { borderColor: GOLD, backgroundColor: GOLD + '20' },
  hintText: { color: GOLD_LIGHT, fontSize: 12, textAlign: 'center', fontWeight: '500' },

  /* CURRENCY GRID */
  currencyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
    paddingTop: 8,
    gap: 8,
    justifyContent: 'flex-start',
  },
  currencyCard: {
    backgroundColor: WHITE,
    borderRadius: 16,
    ...CARD_SHADOW,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  currencyCardUnavailable: { opacity: 0.6 },
  currencyCardSelected: {
    borderColor: GOLD,
    borderWidth: 2,
    backgroundColor: '#FFFBF0',
  },
  unavailableOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    zIndex: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
  },
  unavailableOverlayText: {
    color: WHITE, fontSize: 11, fontWeight: '700', textAlign: 'center', padding: 8,
  },
  cardTop: {
    alignItems: 'center',
    paddingTop: 14,
    paddingBottom: 10,
    paddingHorizontal: 8,
    backgroundColor: '#F4F9F6',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  flagCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: WHITE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardFlag: { fontSize: 32 },
  cardCode: { color: DARK_GREEN, fontSize: 18, fontWeight: '800', letterSpacing: 0.5 },
  cardName: { color: '#6B7280', fontSize: 11, textAlign: 'center', marginTop: 3 },
  selectedBadge: {
    position: 'absolute', top: 6, right: 6,
    backgroundColor: GOLD, borderRadius: 10, width: 20, height: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  selectedBadgeText: { color: WHITE, fontSize: 11, fontWeight: '700' },
  cardRates: {
    flexDirection: 'row',
    paddingHorizontal: 6,
    paddingVertical: 8,
    gap: 4,
  },
  rateBox: {
    flex: 1, alignItems: 'center', borderRadius: 8, paddingVertical: 6,
  },
  rateBoxBuy: { backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#BBF7D0' },
  rateBoxSell: { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA' },
  rateLabel: { fontSize: 10, fontWeight: '600', color: '#6B7280', marginBottom: 2 },
  rateValue: { fontSize: 17, fontWeight: '800' },
  rateValueBuy: { color: '#059669' },
  rateValueSell: { color: '#DC2626' },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingBottom: 8,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusDotActive: { backgroundColor: '#10B981' },
  statusDotInactive: { backgroundColor: '#F59E0B' },
  cardStatusText: { fontSize: 10, fontWeight: '600' },
  cardStatusTextActive: { color: '#059669' },
  cardStatusTextInactive: { color: '#D97706' },
  textFaded: { color: '#9CA3AF' },

  /* INFO BAR */
  infoBar: {
    backgroundColor: GOLD,
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  infoBarIcon: { fontSize: 16 },
  infoBarText: { color: DARK_GREEN, fontSize: 12, fontWeight: '700', flex: 1 },
  infoBarUpdate: { color: DARK_GREEN + 'AA', fontSize: 11, fontWeight: '600', textAlign: 'right' },

  /* ADVERTISEMENT */
  adSection: { marginHorizontal: 12, marginTop: 14, alignItems: 'center' },
  adCard: {
    backgroundColor: WHITE,
    borderRadius: 14,
    width: '100%',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: GOLD + '40',
    ...CARD_SHADOW,
  },
  adImage: { width: '100%', height: 160 },
  adDots: { flexDirection: 'row', gap: 6, marginTop: 8 },
  adDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: GOLD + '40' },
  adDotActive: { backgroundColor: GOLD, width: 20 },

  /* SERVICES */
  servicesSection: { marginTop: 16, paddingHorizontal: 12 },
  sectionDivider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: GOLD + '40' },
  dividerTitle: { color: GOLD, fontSize: 15, fontWeight: '700' },
  servicesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  serviceCard: {
    backgroundColor: MID_GREEN,
    borderRadius: 12,
    width: '22%',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: GOLD + '40',
    ...CARD_SHADOW,
  },
  serviceIcon: { fontSize: 24, marginBottom: 6 },
  serviceLabel: { color: WHITE, fontSize: 10, fontWeight: '600', textAlign: 'center' },

  /* CONTACT */
  contactSection: { marginTop: 16, paddingHorizontal: 12 },
  contactGrid: { flexDirection: 'row', gap: 8 },
  contactCard: {
    backgroundColor: MID_GREEN,
    borderRadius: 12,
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: GOLD + '50',
    ...CARD_SHADOW,
  },
  contactIconWrap: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: DARK_GREEN,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 6,
    borderWidth: 1, borderColor: GOLD + '60',
  },
  contactIcon: { fontSize: 22 },
  contactCardTitle: { color: GOLD, fontSize: 11, fontWeight: '700', textAlign: 'center' },
  contactCardSub: { color: '#A0C4B0', fontSize: 10, textAlign: 'center', marginTop: 2 },
  contactPhone: { color: WHITE, fontSize: 11, fontWeight: '600', marginTop: 4, textAlign: 'center' },

  /* WORKING HOURS */
  workingHoursSection: { marginTop: 16, paddingHorizontal: 12 },
  whGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  whItem: {
    backgroundColor: MID_GREEN, borderRadius: 10, flex: 1,
    alignItems: 'center', paddingVertical: 12, paddingHorizontal: 8,
    borderWidth: 1, borderColor: GOLD + '40',
  },
  whItemFull: {
    backgroundColor: MID_GREEN, borderRadius: 10, width: '100%',
    alignItems: 'center', paddingVertical: 10, paddingHorizontal: 8,
    borderWidth: 1, borderColor: GOLD + '40',
  },
  whIcon: { fontSize: 20, marginBottom: 4 },
  whLabel: { color: GOLD, fontSize: 11, fontWeight: '600', marginBottom: 4 },
  whValue: { color: WHITE, fontSize: 12, fontWeight: '700', textAlign: 'center' },

  /* FOOTER */
  footer: {
    marginTop: 20,
    marginHorizontal: 12,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  footerDivider: { flex: 1, height: 1, backgroundColor: GOLD + '60' },
  footerSlogan: { color: GOLD, fontSize: 15, fontWeight: '700', textAlign: 'center' },

  /* CUSTOMER BUTTON */
  customerBtn: {
    backgroundColor: GOLD,
    marginHorizontal: 12,
    marginTop: 16,
    marginBottom: 24,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    ...CARD_SHADOW,
  },
  customerBtnText: { color: DARK_GREEN, fontSize: 17, fontWeight: '800' },

  /* CALCULATOR MODAL */
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  calcModal: {
    backgroundColor: WHITE,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingTop: 16,
  },
  calcModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  calcModalTitle: { color: DARK_GREEN, fontSize: 18, fontWeight: '800' },
  calcClose: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center',
  },
  calcCloseText: { color: '#374151', fontSize: 16, fontWeight: '700' },
  calcSection: { paddingHorizontal: 20, paddingTop: 16 },
  calcSectionLabel: { color: '#6B7280', fontSize: 13, fontWeight: '600', marginBottom: 10, textAlign: 'center' },
  calcCurrencyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  calcCurrencyBtn: {
    flex: 1, backgroundColor: '#F3F4F6', borderRadius: 12,
    alignItems: 'center', paddingVertical: 12,
  },
  calcCurrencyCode: { color: DARK_GREEN, fontSize: 20, fontWeight: '800' },
  calcCurrencyName: { color: '#6B7280', fontSize: 11, marginTop: 2, textAlign: 'center' },
  calcTapHint: { color: '#9CA3AF', fontSize: 10, marginTop: 4 },
  calcSwapBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: GOLD,
    alignItems: 'center', justifyContent: 'center',
  },
  calcSwapText: { color: WHITE, fontSize: 20, fontWeight: '700' },
  calcAmountRow: { flexDirection: 'row', gap: 12 },
  calcAmountLabel: { color: '#374151', fontSize: 14, fontWeight: '700', marginBottom: 6 },
  calcAmountInput: {
    borderWidth: 2, borderColor: '#D1D5DB', borderRadius: 10,
    padding: 12, fontSize: 22, fontWeight: '700', color: DARK_GREEN,
    textAlign: 'center', width: '100%',
  },
  calcDetails: {
    marginHorizontal: 20, marginTop: 12,
    backgroundColor: '#F3F4F6', borderRadius: 8, padding: 10,
  },
  calcDetailsText: { color: '#374151', fontSize: 12, textAlign: 'center' },
  calcProceedBtn: {
    backgroundColor: DARK_GREEN,
    marginHorizontal: 20, marginTop: 16,
    borderRadius: 14, paddingVertical: 16,
    alignItems: 'center',
  },
  calcProceedText: { color: WHITE, fontSize: 16, fontWeight: '800' },
});
