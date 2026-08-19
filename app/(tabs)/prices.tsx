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
import { TEMPLATES, getTemplate, PriceTemplate } from '@/lib/priceTemplates';

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
  username?: string;
}

const DAYS_OF_WEEK = [
  { key: 'sunday',    ar: 'الأحد',     he: 'ראשון',  en: 'Sunday'    },
  { key: 'monday',    ar: 'الإثنين',   he: 'שני',    en: 'Monday'    },
  { key: 'tuesday',   ar: 'الثلاثاء',  he: 'שלישי',  en: 'Tuesday'   },
  { key: 'wednesday', ar: 'الأربعاء',  he: 'רביעי',  en: 'Wednesday' },
  { key: 'thursday',  ar: 'الخميس',    he: 'חמישי',  en: 'Thursday'  },
  { key: 'friday',    ar: 'الجمعة',    he: 'שישי',   en: 'Friday'    },
  { key: 'saturday',  ar: 'السبت',     he: 'שבת',    en: 'Saturday'  },
];

const FLAG_EMOJI: { [k: string]: string } = {
  USD:'🇺🇸', EUR:'🇪🇺', GBP:'🇬🇧', JPY:'🇯🇵',
  AUD:'🇦🇺', CAD:'🇨🇦', CHF:'🇨🇭', CNY:'🇨🇳',
  SEK:'🇸🇪', NZD:'🇳🇿', JOD:'🇯🇴', EGP:'🇪🇬',
  AED:'🇦🇪', SAR:'🇸🇦', KWD:'🇰🇼', TRY:'🇹🇷',
  ILS:'🇮🇱',
};

const FLAG_CC: { [k: string]: string } = {
  USD:'us', EUR:'eu', GBP:'gb', JPY:'jp',
  AUD:'au', CAD:'ca', CHF:'ch', CNY:'cn',
  SEK:'se', NZD:'nz', JOD:'jo', EGP:'eg',
  AED:'ae', SAR:'sa', KWD:'kw', TRY:'tr',
  ILS:'il',
};

const getFlagUrl = (code: string) =>
  FLAG_CC[code] ? `https://flagcdn.com/w160/${FLAG_CC[code]}.png` : '';

// ─────────────────────────────────────────────
export default function PricesScreen() {
  const [allCurrencies, setAllCurrencies]   = useState<Currency[]>([]);
  const [loading, setLoading]               = useState(true);
  const [language, setLanguage]             = useState<'ar'|'he'|'en'>('ar');
  const [companyInfo, setCompanyInfo]       = useState<CompanyInfo | null>(null);
  const [workingHours, setWorkingHours]     = useState<WorkingHours[]>([]);
  const [advertisements, setAdvertisements] = useState<Advertisement[]>([]);
  const [adOffset, setAdOffset] = useState(0);
  const [showCalculator, setShowCalculator] = useState(false);
  const [fromCurrency, setFromCurrency]     = useState('ILS');
  const [toCurrency, setToCurrency]         = useState('USD');
  const [fromAmount, setFromAmount]         = useState('');
  const [toAmount, setToAmount]             = useState('');
  const [calculationDetails, setCalculationDetails] = useState('');
  const [inactivityTimer, setInactivityTimer] = useState<NodeJS.Timeout | null>(null);
  const [screenData, setScreenData]         = useState(Dimensions.get('window'));
  const [lastUpdateTime, setLastUpdateTime] = useState<string>('');
  const [selectedFirstCurrency, setSelectedFirstCurrency] = useState<string | null>(null);
  const [currentTime, setCurrentTime]       = useState(new Date());
  const [shopName, setShopName]             = useState<{ar: string; he: string; en: string} | null>(null);
  const [templateId, setTemplateId]         = useState<number>(1);
  const tpl: PriceTemplate = getTemplate(templateId);

  const router          = useRouter();
  const isScreenFocused = useRef<boolean>(false);
  const appState        = useRef(AppState.currentState);
  const pulseAnim       = useRef(new Animated.Value(1)).current;

  useAutoUpdateRates();

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const sub = Dimensions.addEventListener('change', (r) => setScreenData(r.window));
    loadData();
    loadLanguage();
    const appSub = AppState.addEventListener('change', (next: AppStateStatus) => {
      appState.current = next;
    });
    return () => { sub?.remove(); appSub?.remove(); };
  }, []);

  // Pulse animation for selected currency hint
  useEffect(() => {
    const anim = Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.12, duration: 800, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1,    duration: 800, useNativeDriver: true }),
    ]));
    anim.start();
    return () => anim.stop();
  }, [pulseAnim]);

  // Rotate ads in empty grid slots every 5 seconds
  useEffect(() => {
    if (templateId !== 3 || !advertisements.length) return;
    const t = setInterval(() => setAdOffset(o => o + 1), 5000);
    return () => clearInterval(t);
  }, [templateId, advertisements.length]);

  useFocusEffect(React.useCallback(() => {
    isScreenFocused.current = true;
    const unsub = setupRealtimeSubscription();
    checkAndUpdateRates();
    return () => {
      isScreenFocused.current = false;
      clearInactivityTimer();
      setSelectedFirstCurrency(null);
      unsub?.();
    };
  }, []));

  const setupRealtimeSubscription = () => {
    const ch = supabase.channel('currencies-updates')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'currencies' },
        (p) => {
          setAllCurrencies(prev =>
            prev.map(c => c.id === p.new.id ? { ...c, ...p.new } : c)
              .sort((a, b) => (a.sort_num ?? 999) - (b.sort_num ?? 999))
          );
        }
      ).subscribe();
    return () => { supabase.removeChannel(ch); };
  };

  useEffect(() => {
    saveLanguage();
    try { AsyncStorage.setItem('languageChanged', 'true'); } catch {}
  }, [language]);

  const loadLanguage = async () => {
    try {
      const s = await AsyncStorage.getItem('selectedLanguage');
      if (s && ['ar','he','en'].includes(s)) setLanguage(s as any);
    } catch {}
  };

  const saveLanguage = async () => {
    try {
      await AsyncStorage.setItem('selectedLanguage', language);
      await AsyncStorage.setItem('languageChangeTimestamp', Date.now().toString());
    } catch {}
  };

  const checkAndUpdateRates = async () => {
    try {
      if (Platform.OS !== 'web') return;
      const enabled = await currencyUpdateLogService.getAutoUpdateStatus();
      if (!enabled) return;
      const res = await exchangeRateAPI.forceUpdateCurrencyRates();
      if (res.success && res.updatedCount && res.updatedCount > 0) {
        await loadData();
        const info = await exchangeRateAPI.getLastUpdateInfo();
        if (info.lastUpdate) setLastUpdateTime(info.lastUpdate);
      }
    } catch {}
  };

  const loadData = async () => {
    try {
      setLoading(true);
      let shopUsername = await AsyncStorage.getItem('shopUsername') || undefined;
      let shopId = await AsyncStorage.getItem('shopId') || undefined;
      const shopAr = await AsyncStorage.getItem('shopNameAr') || '';
      const shopHe = await AsyncStorage.getItem('shopNameHe') || '';
      const shopEn = await AsyncStorage.getItem('shopNameEn') || '';
      if (shopAr || shopHe || shopEn) {
        setShopName({ ar: shopAr, he: shopHe, en: shopEn });
      }
      const cachedTpl = await AsyncStorage.getItem('templateId');
      if (cachedTpl) setTemplateId(parseInt(cachedTpl, 10) || 1);

      // إذا لم يكن shopId مخزّناً، جلبه من قاعدة البيانات باستخدام اسم المستخدم
      if (!shopId && shopUsername && shopUsername !== 'admin') {
        try {
          const shop = await companySettingsService.getByUsername(shopUsername);
          if (shop?.id) {
            shopId = shop.id;
            await AsyncStorage.setItem('shopId', shopId);
          }
        } catch (e) {
          console.error('خطأ في جلب shopId:', e);
        }
      }

      // إذا لم يوجد اسم مستخدم أو رقم محل، إعادة توجيه لتسجيل الدخول
      if (!shopUsername || !shopId) {
        router.replace('/login');
        return;
      }

      const data = await currencyService.getAll(shopUsername, shopId);
      setAllCurrencies(data.sort((a: any, b: any) => (a.sort_num ?? 999) - (b.sort_num ?? 999)));
      const { data: activeAds } = await supabase
        .from('advertisements')
        .select('id, position, title, description, image_url, is_active, username')
        .eq('is_active', true)
        .eq('username', shopUsername)
        .order('created_at', { ascending: true });
      setAdvertisements((activeAds ?? []) as Advertisement[]);
      const co = await companySettingsService.get(shopUsername);
      if (co) {
        setCompanyInfo(co);
        setWorkingHours(await workingHoursService.getByCompanyId(co.id));
        if (co.template_id) {
          setTemplateId(co.template_id);
          await AsyncStorage.setItem('templateId', String(co.template_id));
        }
      }
    } catch {} finally { setLoading(false); }
  };

  const getWorkingDaysText = () => {
    const allDays = DAYS_OF_WEEK;
    if (!workingHours?.length) {
      const allExceptFriday = allDays.filter(d => d.key !== 'friday');
      return allExceptFriday.map(d => language === 'he' ? d.he : language === 'en' ? d.en : d.ar).join(' - ');
    }
    const activeDays = workingHours.filter(wh => wh.is_working_day === true || (wh.is_working_day as any) === 'true').map(wh => wh.day_of_week);
    const filtered = allDays.filter(d => activeDays.length === 0 || activeDays.includes(d.key));
    return filtered.map(d => language === 'he' ? d.he : language === 'en' ? d.en : d.ar).join(' - ');
  };

  const getRestDaysText = () => {
    if (!workingHours?.length) return '';
    const restDays = workingHours
      .filter(wh => wh.is_working_day === false || (wh.is_working_day as any) === 'false')
      .map(wh => wh.day_of_week);
    if (restDays.length === 0) return '';
    const filtered = DAYS_OF_WEEK.filter(d => restDays.includes(d.key));
    return filtered.map(d => language === 'he' ? d.he : language === 'en' ? d.en : d.ar).join(' - ');
  };

  const getWorkingHoursText = () => {
    const first = workingHours.find(wh => wh.is_working_day === true || (wh.is_working_day as any) === 'true');
    return first
      ? { morning: `${first.morning_start} - ${first.morning_end}`, evening: `${first.evening_start} - ${first.evening_end}` }
      : { morning: '09:00 - 14:00', evening: '16:00 - 18:00' };
  };

  // ── Calculator logic ──────────────────────────────────
  const calculateConversion = (amount: string, side: 'left'|'right') => {
    if (!amount || isNaN(parseFloat(amount))) {
      setFromAmount(''); setToAmount(''); setCalculationDetails(''); return;
    }
    const val = parseFloat(amount);
    const fromD = allCurrencies.find(c => c.code === fromCurrency);
    const toD   = allCurrencies.find(c => c.code === toCurrency);
    if ((fromCurrency !== 'ILS' && !fromD) || (toCurrency !== 'ILS' && !toD)) {
      setCalculationDetails('عملة غير موجودة'); return;
    }
    let result = 0, details = '';
    if (fromCurrency === toCurrency) {
      result = val; details = 'نفس العملة';
    } else if (side === 'right') {
      if (toCurrency === 'ILS') {
        result = val / fromD!.sell_rate; details = `${val} شيقل ÷ ${fromD!.sell_rate} = ${result.toFixed(2)} ${fromCurrency}`;
      } else if (fromCurrency === 'ILS') {
        result = val * toD!.buy_rate; details = `${val} ${toCurrency} × ${toD!.buy_rate} = ${result.toFixed(2)} شيقل`;
      } else {
        const s = val * toD!.buy_rate; result = s / fromD!.sell_rate;
        details = `${val} ${toCurrency} × ${toD!.buy_rate} = ${s.toFixed(2)} ÷ ${fromD!.sell_rate} = ${result.toFixed(2)} ${fromCurrency}`;
      }
    } else {
      if (toCurrency === 'ILS') {
        result = val * fromD!.sell_rate; details = `${val} ${fromCurrency} × ${fromD!.sell_rate} = ${result.toFixed(2)} شيقل`;
      } else if (fromCurrency === 'ILS') {
        result = val / toD!.buy_rate; details = `${val} شيقل ÷ ${toD!.buy_rate} = ${result.toFixed(2)} ${toCurrency}`;
      } else {
        const s = val * fromD!.sell_rate; result = s / toD!.buy_rate;
        details = `${val} ${fromCurrency} × ${fromD!.sell_rate} = ${s.toFixed(2)} ÷ ${toD!.buy_rate} = ${result.toFixed(2)} ${toCurrency}`;
      }
    }
    if (side === 'left') setToAmount(result.toFixed(2)); else setFromAmount(result.toFixed(2));
    setCalculationDetails(details);
  };

  const handleFromChange = (t: string) => { setFromAmount(t); calculateConversion(t, 'left'); resetTimer(); };
  const handleToChange   = (t: string) => { setToAmount(t);   calculateConversion(t, 'right'); resetTimer(); };

  const swapCurrencies = () => {
    const tmp = fromCurrency;
    setFromCurrency(toCurrency); setToCurrency(tmp);
    setFromAmount(toAmount); setToAmount(fromAmount);
    if (toAmount) calculateConversion(toAmount, 'left');
    resetTimer();
  };

  const cycleCurrency = (current: string, isFrom: boolean) => {
    const list = [{ code: 'ILS' }, ...allCurrencies.filter(c => c.is_active)];
    const next = list[(list.findIndex(c => c.code === current) + 1) % list.length].code;
    if (isFrom) { setFromCurrency(next); if (fromAmount) calculateConversion(fromAmount, 'left'); }
    else        { setToCurrency(next);   if (fromAmount) calculateConversion(fromAmount, 'left'); }
    resetTimer();
  };

  const handleCurrencyNameClick = (code: string) => {
    if (!selectedFirstCurrency) { setSelectedFirstCurrency(code); return; }
    if (selectedFirstCurrency === code) { setSelectedFirstCurrency(null); return; }
    if (templateId === 3) {
      setFromCurrency(selectedFirstCurrency);
      setToCurrency(code);
      setFromAmount(''); setToAmount(''); setCalculationDetails('');
    } else {
      openCalcWith(selectedFirstCurrency, code);
    }
    setSelectedFirstCurrency(null);
  };

  const openCalcWith = async (a: string, b: string) => {
    await AsyncStorage.setItem('calculatorFromCurrency', a);
    await AsyncStorage.setItem('calculatorToCurrency',   b);
    router.push('/calculator');
  };

  const openCalculator = async (code?: string, type?: 'buy'|'sell'|'current') => {
    if (code && code !== 'ILS') {
      await AsyncStorage.setItem('calculatorFromCurrency', type === 'buy' ? code : 'ILS');
      await AsyncStorage.setItem('calculatorToCurrency',   type === 'buy' ? 'ILS' : code);
    }
    router.push('/calculator');
  };

  // Inline calculator for template 3 — sets currencies without navigating away
  const inlineCalcSet = (code: string, type: 'buy'|'sell') => {
    if (type === 'sell') { setFromCurrency(code); setToCurrency('ILS'); }
    else                 { setFromCurrency('ILS'); setToCurrency(code); }
    setFromAmount(''); setToAmount(''); setCalculationDetails('');
  };

  const closeCalculator = () => { setShowCalculator(false); setFromAmount(''); setToAmount(''); setCalculationDetails(''); clearInactivityTimer(); };

  const handleProceed = async () => {
    try {
      clearInactivityTimer();
      await AsyncStorage.setItem('fromCalculator', 'true');
      await AsyncStorage.setItem('calculatorData', JSON.stringify({ fromCurrency, toCurrency, fromAmount, toAmount, calculationDetails, timestamp: new Date().toISOString(), isFromCalculator: true }));
      await AsyncStorage.setItem('calculatorTransactionReady', 'true');
      setShowCalculator(false);
      setFromAmount(''); setToAmount(''); setCalculationDetails('');
      router.push('/(tabs)/customer-info');
    } catch { Alert.alert('خطأ', 'حدث خطأ في حفظ البيانات'); }
  };

  const clearInactivityTimer = () => { if (inactivityTimer) { clearTimeout(inactivityTimer); setInactivityTimer(null); } };
  const startTimer = () => { clearInactivityTimer(); setInactivityTimer(setTimeout(closeCalculator, 10000)); };
  const resetTimer = () => { if (showCalculator) startTimer(); };
  useEffect(() => () => { clearInactivityTimer(); }, []);

  const openMaps = () => {
    const lat = 32.856665, lng = 35.335847;
    Alert.alert(
      language === 'ar' ? 'اختر تطبيق الخرائط' : 'Choose Map App', '',
      [
        { text: 'Google Maps', onPress: () => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`) },
        { text: 'Waze',        onPress: () => Linking.openURL(`https://waze.com/ul?ll=${lat},${lng}&navigate=yes`) },
        { text: language === 'ar' ? 'إلغاء' : 'Cancel', style: 'cancel' },
      ]
    );
  };

  const openWhatsApp = async () => {
    const phone = '972526000841';
    const msg = language === 'ar' ? 'مرحباً، أريد التواصل معكم' : language === 'he' ? 'שלום, אני רוצה ליצור קשר' : 'Hello, I would like to contact you';
    try {
      const url = `whatsapp://send?phone=${phone}&text=${encodeURIComponent(msg)}`;
      if (await Linking.canOpenURL(url)) await Linking.openURL(url);
    } catch {}
  };

  const sendWhatsAppMessage = async (name: string) => {
    const phone = '972526000841';
    const msg = language === 'ar' ? `مرحباً، أرغب في طلب ${name}.` : `Hello, I'd like to order ${name}.`;
    try {
      const url = `whatsapp://send?phone=${phone}&text=${encodeURIComponent(msg)}`;
      if (await Linking.canOpenURL(url)) await Linking.openURL(url);
    } catch {}
  };

  const navigateToCustomerInfo = async () => {
    try { await AsyncStorage.setItem('selectedLanguage', language); } catch {}
    router.push('/(tabs)/customer-info');
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.multiRemove([
        'isLoggedIn',
        'loginTime',
        'shopUsername',
        'shopId',
        'shopNameAr',
        'shopNameHe',
        'shopNameEn',
        'savedShopUsername',
        'savedShopPassword',
        'isSuperAdmin',
        'isAdminLoggedIn',
        'adminLoginTime',
        'adminUsername',
        'savedAdminUsername',
        'savedAdminPassword',
        'companyInfo',
      ]);
      router.replace('/login');
    } catch (e) {
      router.replace('/login');
    }
  };

  // ── Render helpers ─────────────────────────────────────
  const isLargeScreen = screenData.width >= 768;
  const wh = getWorkingHoursText();
  const template3Currencies = [
    ...allCurrencies.filter(c => c.is_active),
    ...allCurrencies.filter(c => !c.is_active),
  ];
  const template3AdCount = template3Currencies.length % 3 === 0
    ? 0
    : 3 - (template3Currencies.length % 3);

  const timeStr = currentTime.toLocaleTimeString(
    language === 'ar' ? 'ar-SA' : language === 'he' ? 'he-IL' : 'en-US',
    { hour: '2-digit', minute: '2-digit', hour12: true }
  );
  const dateStr = currentTime.toLocaleDateString(
    language === 'ar' ? 'ar-SA' : language === 'he' ? 'he-IL' : 'en-US',
    { year: 'numeric', month: 'long', day: 'numeric' }
  );
  const dayStr = currentTime.toLocaleDateString(
    language === 'ar' ? 'ar-SA' : language === 'he' ? 'he-IL' : 'en-US',
    { weekday: 'long' }
  );

  const companyName = shopName
    ? (language === 'ar' ? shopName.ar : language === 'he' ? shopName.he : shopName.en)
    : companyInfo
    ? (language === 'ar' ? companyInfo.name_ar : language === 'he' ? companyInfo.name_he : companyInfo.name_en)
    : (language === 'ar' ? 'نعامنة للصرافة' : language === 'he' ? 'נעאמנה להמרות' : 'Naamneh Exchange');

  const companyPhone = companyInfo?.phone1 || '0526000841';

  const s = getStyles(templateId);
  const isListLayout = tpl.layout === 'list';
  const isCompactLayout = tpl.layout === 'compact';
  const cardWidth = isListLayout
    ? screenData.width - 16
    : isCompactLayout
    ? isLargeScreen
      ? (screenData.width - 64) / 6
      : (screenData.width - 24) / 3
    : isLargeScreen
    ? (screenData.width - 56) / 4
    : (screenData.width - 32) / 2;

  if (loading) {
    return (
      <View style={s.loadingContainer}>
        <Text style={s.loadingText}>
          {language === 'ar' ? 'جاري تحميل الأسعار...' : language === 'he' ? 'טוען...' : 'Loading...'}
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={s.page}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ════════════════════════════════
            HEADER
        ════════════════════════════════ */}
        {templateId === 2 ? (
          <View style={[s.alArzHeader, isLargeScreen && s.alArzHeaderLg]}>
            <View style={s.alArzHeaderTop}>
              <View style={s.alArzBrand}>
                <TouchableOpacity style={[s.alArzLogoMark, isLargeScreen && s.alArzLogoMarkLg]} onPress={() => router.push('/admin-login')}>
                  <Text style={[s.alArzLogoTree, isLargeScreen && s.alArzLogoTreeLg]}>✦</Text>
                  <Text style={[s.alArzLogoCoin, isLargeScreen && s.alArzLogoCoinLg]}>€</Text>
                </TouchableOpacity>
                <Text style={[s.alArzCompanyName, isLargeScreen && s.alArzCompanyNameLg]}>{companyName}</Text>
              </View>
              <View style={s.alArzContact}>
                <View style={s.alArzContactRow}>
                  <Text style={[s.alArzContactText, isLargeScreen && s.alArzContactTextLg]}>☎ {companyPhone}</Text>
                  {companyInfo?.phone2 ? <Text style={[s.alArzContactText, isLargeScreen && s.alArzContactTextLg]}>◉ {companyInfo.phone2}</Text> : null}
                </View>
                <View style={s.alArzLanguageRow}>
                  {(['ar', 'he', 'en'] as const).map(l => (
                    <TouchableOpacity key={l} onPress={() => setLanguage(l)} style={[s.alArzLangBtn, language === l && s.alArzLangBtnActive]}>
                      <Text style={[s.alArzLangBtnText, language === l && s.alArzLangBtnTextActive]}>{l === 'ar' ? 'ع' : l === 'he' ? 'ע' : 'EN'}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
            <View style={[s.alArzWHBar, isLargeScreen && s.alArzWHBarLg]}>
              <View style={s.alArzWHDaysItem}>
                <Text style={[s.alArzWHBarIcon, isLargeScreen && s.alArzWHBarIconLg]}>📅</Text>
                <Text style={[s.alArzWHBarText, isLargeScreen && s.alArzWHBarTextLg]}>{getWorkingDaysText()}</Text>
                {getRestDaysText() ? (
                  <Text style={[s.alArzWHBarText, isLargeScreen && s.alArzWHBarTextLg, s.alArzWHBarRest]}>  🏖️ {getRestDaysText()}</Text>
                ) : null}
              </View>
              <View style={[s.alArzWHBarSep, isLargeScreen && s.alArzWHBarSepLg]} />
              <View style={s.alArzWHTimesItem}>
                <Text style={[s.alArzWHBarIcon, isLargeScreen && s.alArzWHBarIconLg]}>🌅</Text>
                <Text style={[s.alArzWHBarText, isLargeScreen && s.alArzWHBarTextLg]}>{wh.morning}</Text>
                <View style={[s.alArzWHBarSep, isLargeScreen && s.alArzWHBarSepLg]} />
                <Text style={[s.alArzWHBarIcon, isLargeScreen && s.alArzWHBarIconLg]}>🌆</Text>
                <Text style={[s.alArzWHBarText, isLargeScreen && s.alArzWHBarTextLg]}>{wh.evening}</Text>
              </View>
            </View>
          </View>
        ) : (
        <View style={[s.header, isLargeScreen && s.headerLarge]}>
          {/* Left: Clock + Date */}
          <View style={[s.headerLeft, isLargeScreen && s.headerLeftLarge]}>
            <View style={s.clockRow}>
              <Text style={[s.clockIcon, isLargeScreen && s.clockIconLarge]}>🕐</Text>
              <Text style={[s.clockTime, isLargeScreen && s.clockTimeLarge]}>{timeStr}</Text>
            </View>
            <Text style={[s.clockDate, isLargeScreen && s.clockDateLarge]}>{dayStr}</Text>
            <Text style={[s.clockDate, isLargeScreen && s.clockDateLarge]}>{dateStr}</Text>
          </View>

          {/* Center: Company name + Slogan + (large: working hours) */}
          <View style={[s.headerCenter, isLargeScreen && s.headerCenterLarge]}>
            <Text style={[s.companyBigName, isLargeScreen && s.companyBigNameLarge]}>{companyName}</Text>
            <View style={s.sloganRow}>
              <View style={s.sloganLine} />
              <Text style={[s.sloganText, isLargeScreen && s.sloganTextLarge]}>
                {language === 'ar' ? 'ثقتكم هي عملتنا' : language === 'he' ? 'האמון שלכם הוא המטבע שלנו' : 'Your Trust Is Our Currency'}
              </Text>
              <View style={s.sloganLine} />
            </View>
            {isLargeScreen && (
              <View style={s.whInHeader}>
                <Text style={s.whInHeaderDaysLine}>
                  📅 {getWorkingDaysText()}
                </Text>
                {getRestDaysText() ? (
                  <Text style={s.whInHeaderRestLine}>
                    🏖️ {language === 'ar' ? 'أيام العطل: ' : language === 'he' ? 'ימי מנוחה: ' : 'Rest days: '}{getRestDaysText()}
                  </Text>
                ) : null}
                <View style={s.whInHeaderRow}>
                  <Text style={s.whInHeaderItem}>🌅 {language === 'ar' ? 'صباحاً' : language === 'he' ? 'בוקר' : 'Morning'}: <Text style={s.whInHeaderVal}>{wh.morning}</Text></Text>
                  <View style={s.whInHeaderSep} />
                  <Text style={s.whInHeaderItem}>🌆 {language === 'ar' ? 'مساءً' : language === 'he' ? 'ערב' : 'Evening'}: <Text style={s.whInHeaderVal}>{wh.evening}</Text></Text>
                </View>
              </View>
            )}
          </View>

          {/* Right: Logo + Lang switcher */}
          <View style={[s.headerRight, isLargeScreen && s.headerRightLarge]}>
            <TouchableOpacity style={[s.logoCircle, isLargeScreen && s.logoCircleLarge]} onPress={() => router.push('/admin-login')}>
              <Text style={[s.logoSymbol, isLargeScreen && s.logoSymbolLarge]}>€$</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.logoutBtn, isLargeScreen && s.logoutBtnLarge]} onPress={handleLogout}>
              <Text style={[s.logoutBtnText, isLargeScreen && s.logoutBtnTextLarge]}>
                {language === 'ar' ? 'خروج' : language === 'he' ? 'יציאה' : 'Logout'}
              </Text>
            </TouchableOpacity>
            <View style={[s.langRow, isLargeScreen && s.langRowLarge]}>
              {(['ar','he','en'] as const).map(l => (
                <TouchableOpacity key={l} onPress={() => setLanguage(l)}
                  style={[s.langBtn, language === l && s.langBtnActive, isLargeScreen && s.langBtnLarge]}>
                  <Text style={[s.langBtnText, language === l && s.langBtnTextActive, isLargeScreen && s.langBtnTextLarge]}>
                    {l === 'ar' ? 'ع' : l === 'he' ? 'ע' : 'EN'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
        )}

        {/* ════════════════════════════════
            RATES TITLE — small screens only
        ════════════════════════════════ */}
        {!isLargeScreen && templateId !== 2 && (
          <View style={s.ratesTitleBar}>
            <View style={s.goldHLine} />
            <TouchableOpacity style={s.ratesTitleContent} onPress={() => openCalculator()}>
              <Text style={s.ratesTitleText}>
                {language === 'ar' ? 'أسعار صرف العملات' : language === 'he' ? 'שערי חליפין' : 'Exchange Rates'}
              </Text>
              <Text style={s.calcHint}>🧮</Text>
            </TouchableOpacity>
            <View style={s.goldHLine} />
          </View>
        )}

        {/* ════════════════════════════════
            INFO BAR (above grid)
        ════════════════════════════════ */}
        <View style={[s.infoBar, (templateId === 2 || templateId === 3) && { display: 'none' }]}>
          <View style={s.infoBarInner}>
            {lastUpdateTime ? (
              <>
                <View style={s.infoSegment}>
                  <Text style={s.infoIcon}>🕐</Text>
                  <Text style={s.infoText}>
                    {language === 'ar' ? `آخر تحديث: ${lastUpdateTime}` : `Last update: ${lastUpdateTime}`}
                  </Text>
                </View>
                <View style={s.infoSep} />
              </>
            ) : null}
            <View style={s.infoSegment}>
              <Text style={s.infoIcon}>🔄</Text>
              <Text style={s.infoText}>
                {language === 'ar' ? 'الأسعار قابلة للتغيير طوال اليوم' : language === 'he' ? 'השערים עשויים להשתנות' : 'Rates may change during the day'}
              </Text>
            </View>
            <View style={s.infoSep} />
            <View style={s.infoSegment}>
              <Text style={s.infoIcon}>🔔</Text>
              <Text style={s.infoText}>
                {language === 'ar' ? 'يرجى إبراز الهوية عند إجراء أي عملية' : language === 'he' ? 'נדרש זיהוי בעת עסקאות' : 'ID required for transactions'}
              </Text>
            </View>
          </View>
        </View>

        {/* Selection hint */}
        {templateId !== 2 && templateId !== 3 && selectedFirstCurrency ? (
          <Animated.View style={[s.hintBar, s.hintBarActive, { transform: [{ scale: pulseAnim }] }]}>
            <Text style={s.hintTextBig}>
              {language === 'ar' ? '✓ اختر عملة ثانية للمقارنة' : language === 'he' ? '✓ בחר מטבע שני' : '✓ Select 2nd currency'}
            </Text>
          </Animated.View>
        ) : (
          <View style={[s.hintBar, templateId === 3 && { display: 'none' }]}>
            <Text style={s.hintTextBig}>
              {language === 'ar' ? '👆 اضغط على أي سعر لفتح الحاسبة' : language === 'he' ? '👆 לחץ על שער לחשב' : '👆 Tap any rate to open calculator'}
            </Text>
          </View>
        )}

        {/* ════════════════════════════════
            TEMPLATE 2 — AL-ARZ PRICE TABLE
        ════════════════════════════════ */}
        {templateId === 2 && (
          <View style={s.tableCard}>
            <Text style={[s.tableTitle, isLargeScreen && s.tableTitleLg]}>
              {language === 'ar' ? 'أسعار العملات مباشرة' : language === 'he' ? 'שערי מטבע ישירים' : 'Live Currency Rates'}
            </Text>
            <Text style={[s.tableUpdated, isLargeScreen && s.tableUpdatedLg]}>
              {language === 'ar' ? `آخر تحديث: ${timeStr} - ${dateStr}` : `${dateStr} - ${timeStr}`}
            </Text>
            <View style={[s.tableHeader, { flexDirection: language === 'en' ? 'row' : 'row-reverse' }]}>
              <Text style={[s.tableHeaderCell, s.tableCurrencyHeader, isLargeScreen && s.tableHeaderCellLg]}>{language === 'ar' ? 'العملة' : language === 'he' ? 'מטבע' : 'Currency'}</Text>
              <Text style={[s.tableHeaderCell, s.tableCurrentHeader, isLargeScreen && s.tableHeaderCellLg]}>{language === 'ar' ? 'السعر الحالي' : language === 'he' ? 'שער נוכחי' : 'Current Rate'}</Text>
              <Text style={[s.tableHeaderCell, s.tableSellHeader, isLargeScreen && s.tableHeaderCellLg]}>{language === 'ar' ? 'سعر البيع' : language === 'he' ? 'שער מכירה' : 'Sell Rate'}</Text>
              <Text style={[s.tableHeaderCell, s.tableBuyHeader, isLargeScreen && s.tableHeaderCellLg]}>{language === 'ar' ? 'سعر الشراء' : language === 'he' ? 'שער קנייה' : 'Buy Rate'}</Text>
            </View>
            {[...allCurrencies.filter(c => c.is_active), ...allCurrencies.filter(c => !c.is_active)].map(currency => (
              <TouchableOpacity
                key={`table-${currency.id}`}
                style={[s.tableRow, { flexDirection: language === 'en' ? 'row' : 'row-reverse' }]}
                activeOpacity={currency.is_active ? 0.75 : 1}
                onPress={() => currency.is_active && handleCurrencyNameClick(currency.code)}
              >
                <View style={[s.tableCell, s.tableCurrencyCell, isLargeScreen && s.tableCurrencyCellLg]}>
                  <View style={[s.tableFlagWrap, isLargeScreen && s.tableFlagWrapLg]}>
                    {getFlagUrl(currency.code) ? (
                      <Image source={{ uri: getFlagUrl(currency.code) }} style={[s.tableFlag, isLargeScreen && s.tableFlagLg]} resizeMode="contain" />
                    ) : (
                      <Text style={[s.tableFlagEmoji, isLargeScreen && s.tableFlagEmojiLg]}>{FLAG_EMOJI[currency.code] || '💱'}</Text>
                    )}
                  </View>
                  <View style={s.tableCurrencyInfo}>
                    <Text style={[s.tableCurrencyCode, isLargeScreen && s.tableCurrencyCodeLg]}>{currency.code}</Text>
                    <Text style={[s.tableCurrencyName, isLargeScreen && s.tableCurrencyNameLg]} numberOfLines={2}>
                      {language === 'ar' ? currency.name_ar : language === 'he' ? (currency.name_he || currency.name_ar) : currency.name_en}
                    </Text>
                    {isLargeScreen && (
                      <Text style={s.tableCurrencyNameEn} numberOfLines={1}>
                        {currency.name_en}
                      </Text>
                    )}
                  </View>
                </View>
                <Text style={[s.tableCell, s.tableCurrentCell, isLargeScreen && s.tableCellLg]}>{currency.current_rate?.toFixed(2) ?? '—'}</Text>
                <Text style={[s.tableCell, s.tableSellCell, isLargeScreen && s.tableCellLg]}>{currency.sell_rate?.toFixed(2) ?? '—'}</Text>
                <Text style={[s.tableCell, s.tableBuyCell, isLargeScreen && s.tableCellLg]}>{currency.buy_rate?.toFixed(2) ?? '—'}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ════════════════════════════════
            TEMPLATE 3 — GRID + INLINE CALCULATOR
        ════════════════════════════════ */}
        {templateId === 3 && (
          <View style={[s.tpl3Wrap, isLargeScreen && s.tpl3WrapLg]}>
            <View style={[s.grid, { flex: 1 }]}>
              {template3Currencies.map(currency => (
                <TouchableOpacity
                  key={`t3-${currency.id}`}
                  activeOpacity={currency.is_active ? 0.75 : 1}
                  onPress={() => currency.is_active && handleCurrencyNameClick(currency.code)}
                  style={[
                    s.card,
                    { width: isLargeScreen ? (screenData.width * 0.58 - 48) / 3 : (screenData.width - 40) / 2 },
                    selectedFirstCurrency === currency.code && s.cardSelected,
                    !currency.is_active && s.cardInactive,
                  ]}
                >
                  {!currency.is_active && (
                    <View style={s.unavailBadge}>
                      <Text style={[s.unavailText, isLargeScreen && { fontSize: 20, paddingHorizontal: 14, paddingVertical: 5 }]}>
                        {language === 'ar' ? 'غير متوفر' : language === 'he' ? 'לא זמין' : 'Unavailable'}
                      </Text>
                    </View>
                  )}
                  <View style={[s.cardFlagArea, isLargeScreen && s.cardFlagAreaLg]}>
                    {selectedFirstCurrency === currency.code && (
                      <View style={s.checkBadge}><Text style={s.checkText}>✓</Text></View>
                    )}
                    <View style={[s.flagRing, currency.is_active && s.flagRingActive, isLargeScreen && s.flagRingLg]}>
                      {getFlagUrl(currency.code) ? (
                        <Image source={{ uri: getFlagUrl(currency.code) }} style={s.flagImg} resizeMode="contain" />
                      ) : (
                        <Text style={[s.flagEmoji, isLargeScreen && s.flagEmojiLg]}>{FLAG_EMOJI[currency.code] || '💱'}</Text>
                      )}
                    </View>
                    <Text style={[s.cardCode, isLargeScreen && s.cardCodeLg]}>{currency.code}</Text>
                    <Text style={[s.cardName, isLargeScreen && s.cardNameLg]}>
                      {language === 'ar' ? currency.name_ar : language === 'he' ? (currency.name_he || currency.name_ar) : currency.name_en}
                    </Text>
                  </View>
                  <View style={s.cardGoldLine} />
                  <View style={[s.cardRatesRow, isLargeScreen && s.cardRatesRowLg]}>
                    <TouchableOpacity style={[s.rateHalf, currency.is_active && s.rateHalfActive, isLargeScreen && s.rateHalfLg]}
                      onPress={(e) => { e.stopPropagation?.(); currency.is_active && inlineCalcSet(currency.code, 'buy'); }}
                      disabled={!currency.is_active} activeOpacity={0.65}>
                      <Text style={[s.rateLbl, s.rateLblBuy, isLargeScreen && s.rateLblLg]}>
                        {language === 'ar' ? 'شراء' : language === 'he' ? 'קנייה' : 'Buy'}
                      </Text>
                      <Text style={[s.buyVal, isLargeScreen && s.buyValLg]}>{currency.buy_rate?.toFixed(2) ?? '—'}</Text>
                    </TouchableOpacity>
                    <View style={[s.rateVLine, isLargeScreen && s.rateVLineLg]} />
                    <View style={[s.rateHalf, isLargeScreen && s.rateHalfLg, { gap: 2 }]}>
                      <Text style={[s.currentLbl, isLargeScreen && s.currentLblLg]}>
                        {language === 'ar' ? 'الحالي' : language === 'he' ? 'נוכחי' : 'Rate'}
                      </Text>
                      <Text style={[s.currentVal, isLargeScreen && s.currentValLg]}>{currency.current_rate?.toFixed(2) ?? '—'}</Text>
                    </View>
                    <View style={[s.rateVLine, isLargeScreen && s.rateVLineLg]} />
                    <TouchableOpacity style={[s.rateHalf, currency.is_active && s.rateHalfActive, isLargeScreen && s.rateHalfLg]}
                      onPress={(e) => { e.stopPropagation?.(); currency.is_active && inlineCalcSet(currency.code, 'sell'); }}
                      disabled={!currency.is_active} activeOpacity={0.65}>
                      <Text style={[s.rateLbl, s.rateLblSell, isLargeScreen && s.rateLblLg]}>
                        {language === 'ar' ? 'بيع' : language === 'he' ? 'מכירה' : 'Sell'}
                      </Text>
                      <Text style={[s.sellVal, isLargeScreen && s.sellValLg]}>{currency.sell_rate?.toFixed(2) ?? '—'}</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))}
              {advertisements.length > 0 && Array.from({ length: template3AdCount }).map((_, i) => {
                const ad = advertisements[(i + adOffset) % advertisements.length];
                return (
                  <View key={`t3-ad-${i}-${ad.id}`} style={[s.tpl3AdCard, { width: isLargeScreen ? (screenData.width * 0.58 - 48) / 3 : (screenData.width - 40) / 2 }]}>
                    {ad.image_url ? (
                      <Image source={{ uri: String(ad.image_url) }} style={s.tpl3AdImage} resizeMode="cover" />
                    ) : null}
                  </View>
                );
              })}
            </View>

            {/* Inline calculator panel */}
            <View style={[s.tpl3Calc, isLargeScreen && s.tpl3CalcLg]}>
              <Text style={[s.tpl3CalcTitle, isLargeScreen && s.tpl3CalcTitleLg]}>
                {language === 'ar' ? 'آلة حاسبة' : language === 'he' ? 'מחשבון' : 'Calculator'}
              </Text>
              <View style={s.calcCurrRow}>
                <TouchableOpacity style={s.calcCurrBtn} onPress={() => cycleCurrency(fromCurrency, true)}>
                  <Text style={s.calcCurrCode}>{fromCurrency}</Text>
                  <Text style={s.calcCurrName}>
                    {fromCurrency === 'ILS' ? (language === 'ar' ? 'شيقل' : 'Shekel')
                      : (language === 'ar' ? allCurrencies.find(c=>c.code===fromCurrency)?.name_ar
                        : language === 'he' ? allCurrencies.find(c=>c.code===fromCurrency)?.name_he
                        : allCurrencies.find(c=>c.code===fromCurrency)?.name_en) || fromCurrency}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.calcSwapBtn} onPress={swapCurrencies}>
                  <Text style={s.calcSwapTxt}>⇅</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.calcCurrBtn} onPress={() => cycleCurrency(toCurrency, false)}>
                  <Text style={s.calcCurrCode}>{toCurrency}</Text>
                  <Text style={s.calcCurrName}>
                    {toCurrency === 'ILS' ? (language === 'ar' ? 'شيقل' : 'Shekel')
                      : (language === 'ar' ? allCurrencies.find(c=>c.code===toCurrency)?.name_ar
                        : language === 'he' ? allCurrencies.find(c=>c.code===toCurrency)?.name_he
                        : allCurrencies.find(c=>c.code===toCurrency)?.name_en) || toCurrency}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={s.calcAmtRow}>
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={s.calcAmtLbl}>{fromCurrency}</Text>
                  <TextInput style={s.tpl3CalcInput} value={fromAmount} onChangeText={handleFromChange}
                    placeholder="0.00" keyboardType="decimal-pad" />
                </View>
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={s.calcAmtLbl}>{toCurrency}</Text>
                  <TextInput style={s.tpl3CalcInput} value={toAmount} onChangeText={handleToChange}
                    placeholder="0.00" keyboardType="decimal-pad" />
                </View>
              </View>
              {calculationDetails ? (
                <View style={s.tpl3CalcDetails}>
                  <Text style={s.tpl3CalcDetailsTxt}>{calculationDetails}</Text>
                </View>
              ) : null}
              {fromAmount && toAmount ? (
                <TouchableOpacity style={[s.proceedBtn, { opacity: 0.5 }]} disabled>
                  <Text style={s.proceedTxt}>
                    {language === 'ar' ? 'متابعة المعاملة' : language === 'he' ? 'המשך עסקה' : 'Proceed'}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        )}

        {/* ════════════════════════════════
            CURRENCY GRID (templates 1, 4, 5)
        ════════════════════════════════ */}
        <View style={[s.grid, (templateId === 2 || templateId === 3) && { display: 'none' }]}>
          {[...allCurrencies.filter(c => c.is_active), ...allCurrencies.filter(c => !c.is_active)].map(currency => (
            <TouchableOpacity
              key={currency.id}
              activeOpacity={currency.is_active ? 0.75 : 1}
              onPress={() => currency.is_active && handleCurrencyNameClick(currency.code)}
              style={[
                s.card,
                { width: cardWidth },
                selectedFirstCurrency === currency.code && s.cardSelected,
                !currency.is_active && s.cardInactive,
              ]}
            >
              {/* Unavailable badge */}
              {!currency.is_active && (
                <View style={s.unavailBadge}>
                  <Text style={[s.unavailText, isLargeScreen && { fontSize: 20, paddingHorizontal: 14, paddingVertical: 5 }]}>
                    {language === 'ar' ? 'غير متوفر' : language === 'he' ? 'לא זמין' : 'Unavailable'}
                  </Text>
                </View>
              )}

              {/* Flag */}
              <View style={[s.cardFlagArea, isLargeScreen && s.cardFlagAreaLg]}>
                {selectedFirstCurrency === currency.code && (
                  <View style={s.checkBadge}><Text style={s.checkText}>✓</Text></View>
                )}
                <View style={[s.flagRing, currency.is_active && s.flagRingActive, isLargeScreen && s.flagRingLg]}>
                  {getFlagUrl(currency.code) ? (
                    <Image source={{ uri: getFlagUrl(currency.code) }}
                      style={s.flagImg} resizeMode="contain" />
                  ) : (
                    <Text style={[s.flagEmoji, isLargeScreen && s.flagEmojiLg]}>{FLAG_EMOJI[currency.code] || '💱'}</Text>
                  )}
                </View>
                <Text style={[s.cardCode, isLargeScreen && s.cardCodeLg]}>
                  {currency.code}
                </Text>
                <Text style={[s.cardName, isLargeScreen && s.cardNameLg]}>
                  {language === 'ar' ? currency.name_ar : language === 'he' ? (currency.name_he || currency.name_ar) : currency.name_en}
                </Text>
              </View>

              {/* Gold divider */}
              <View style={s.cardGoldLine} />

              {/* Rates */}
              <View style={[s.cardRatesRow, isLargeScreen && s.cardRatesRowLg]}>
                <TouchableOpacity style={[s.rateHalf, currency.is_active && s.rateHalfActive, isLargeScreen && s.rateHalfLg]}
                  onPress={(e) => { e.stopPropagation?.(); currency.is_active && openCalculator(currency.code, 'buy'); }}
                  disabled={!currency.is_active} activeOpacity={0.65}>
                  <Text style={[s.rateLbl, s.rateLblBuy, isLargeScreen && s.rateLblLg]}>
                    {language === 'ar' ? 'شراء' : language === 'he' ? 'קנייה' : 'Buy'}
                  </Text>
                  <Text style={[s.buyVal, isLargeScreen && s.buyValLg]}>
                    {currency.buy_rate?.toFixed(2) ?? '—'}
                  </Text>
                </TouchableOpacity>

                <View style={[s.rateVLine, isLargeScreen && s.rateVLineLg]} />

                <View style={[s.rateHalf, isLargeScreen && s.rateHalfLg, { gap: 2 }]}>
                  <Text style={[s.currentLbl, isLargeScreen && s.currentLblLg]}>
                    {language === 'ar' ? 'الحالي' : language === 'he' ? 'נוכחי' : 'Rate'}
                  </Text>
                  <Text style={[s.currentVal, isLargeScreen && s.currentValLg]}>
                    {currency.current_rate?.toFixed(2) ?? '—'}
                  </Text>
                </View>

                <View style={[s.rateVLine, isLargeScreen && s.rateVLineLg]} />

                <TouchableOpacity style={[s.rateHalf, currency.is_active && s.rateHalfActive, isLargeScreen && s.rateHalfLg]}
                  onPress={(e) => { e.stopPropagation?.(); currency.is_active && openCalculator(currency.code, 'sell'); }}
                  disabled={!currency.is_active} activeOpacity={0.65}>
                  <Text style={[s.rateLbl, s.rateLblSell, isLargeScreen && s.rateLblLg]}>
                    {language === 'ar' ? 'بيع' : language === 'he' ? 'מכירה' : 'Sell'}
                  </Text>
                  <Text style={[s.sellVal, isLargeScreen && s.sellValLg]}>
                    {currency.sell_rate?.toFixed(2) ?? '—'}
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* ════════════════════════════════
            SERVICES
        ════════════════════════════════ */}
        {templateId !== 3 && <View style={s.section}>
          <View style={s.sectionTitle}>
            <View style={s.goldHLine} />
            <Text style={s.sectionTitleText}>
              {language === 'ar' ? 'خدماتنا' : language === 'he' ? 'השירותים שלנו' : 'Our Services'}
            </Text>
            <View style={s.goldHLine} />
          </View>
          <View style={s.servicesRow}>
            {[
              { icon: '💸', ar: 'تحويل الأموال', he: 'העברת כסף',    en: 'Money Transfer'   },
              { icon: '🔄', ar: 'صرف العملات',   he: 'המרת מטבע',   en: 'Currency Exchange' },
              { icon: '🏦', ar: 'حوالات بنكية',  he: 'העברות בנקאיות', en: 'Bank Transfers'  },
              { icon: '💳', ar: 'بطاقات الدفع',  he: 'כרטיסי תשלום', en: 'Payment Cards'    },
            ].map((sv, i) => (
              <TouchableOpacity key={i} style={s.serviceCard} onPress={navigateToCustomerInfo}>
                <View style={s.serviceIconWrap}>
                  <Text style={s.serviceIcon}>{sv.icon}</Text>
                </View>
                <Text style={s.serviceLabel}>
                  {language === 'ar' ? sv.ar : language === 'he' ? sv.he : sv.en}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>}

        {/* ════════════════════════════════
            WORKING HOURS — small screens only
        ════════════════════════════════ */}
        {!isLargeScreen && templateId !== 3 && (
        <View style={s.section}>
          <View style={s.sectionTitle}>
            <View style={s.goldHLine} />
            <Text style={s.sectionTitleText}>
              {language === 'ar' ? 'ساعات العمل' : language === 'he' ? 'שעות פעילות' : 'Working Hours'}
            </Text>
            <View style={s.goldHLine} />
          </View>
          <View style={s.whCompact}>
            <View style={s.whCompactCard}>
              <View style={s.whDaysRow}>
                <Text style={s.whCompactIcon}>📅</Text>
                <Text style={s.whCompactLabel}>{language === 'ar' ? 'أيام العمل: ' : language === 'he' ? 'ימי עבודה: ' : 'Days: '}</Text>
                <Text style={s.whCompactVal}>{getWorkingDaysText()}</Text>
              </View>
              {getRestDaysText() ? (
                <>
                  <View style={s.whCompactDivider} />
                  <View style={s.whDaysRow}>
                    <Text style={s.whCompactIcon}>🏖️</Text>
                    <Text style={s.whCompactLabel}>{language === 'ar' ? 'أيام العطل: ' : language === 'he' ? 'ימי מנוחה: ' : 'Rest days: '}</Text>
                    <Text style={s.whCompactVal}>{getRestDaysText()}</Text>
                  </View>
                </>
              ) : null}
              <View style={s.whCompactDivider} />
              <View style={s.whCompactRow}>
                <View style={s.whCompactItem}>
                  <Text style={s.whCompactIcon}>🌅</Text>
                  <Text style={s.whCompactLabel}>{language === 'ar' ? 'صباحاً' : language === 'he' ? 'בוקר' : 'Morning'}</Text>
                  <Text style={s.whCompactVal}>{wh.morning}</Text>
                </View>
                <View style={s.whCompactSep} />
                <View style={s.whCompactItem}>
                  <Text style={s.whCompactIcon}>🌆</Text>
                  <Text style={s.whCompactLabel}>{language === 'ar' ? 'مساءً' : language === 'he' ? 'ערב' : 'Evening'}</Text>
                  <Text style={s.whCompactVal}>{wh.evening}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
        )}

        {/* ════════════════════════════════
            FOOTER
        ════════════════════════════════ */}
        <View style={s.footer}>
          <View style={s.goldHLine} />
          <Text style={s.footerSlogan}>
            {language === 'ar' ? 'ثقتكم هي عملتنا' : language === 'he' ? 'האמון שלכם הוא המטבע שלנו' : 'Your Trust Is Our Currency'}
          </Text>
          <View style={s.goldHLine} />
        </View>

      </ScrollView>

      {/* ════════════════════════════════
          CALCULATOR MODAL
      ════════════════════════════════ */}
      <Modal visible={showCalculator} transparent animationType="slide" onRequestClose={closeCalculator}>
        <View style={s.modalBg} onTouchStart={resetTimer}>
          <View style={s.calcModal}>
            <View style={s.calcHead}>
              <Text style={s.calcTitle}>
                {language === 'ar' ? 'آلة حاسبة العملات' : language === 'he' ? 'מחשבון מטבעות' : 'Currency Calculator'}
              </Text>
              <TouchableOpacity style={s.calcCloseBtn} onPress={closeCalculator}>
                <Text style={s.calcCloseX}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }} onTouchStart={resetTimer}>
              <View style={s.calcSection}>
                <Text style={s.calcSectionLbl}>
                  {language === 'ar' ? 'اختيار العملات' : language === 'he' ? 'בחירת מטבעות' : 'Select Currencies'}
                </Text>
                <View style={s.calcCurrRow}>
                  <TouchableOpacity style={s.calcCurrBtn} onPress={() => { cycleCurrency(fromCurrency, true); resetTimer(); }}>
                    <Text style={s.calcCurrCode}>{fromCurrency}</Text>
                    <Text style={s.calcCurrName}>
                      {fromCurrency === 'ILS' ? (language === 'ar' ? 'شيقل' : 'Shekel')
                        : (language === 'ar' ? allCurrencies.find(c=>c.code===fromCurrency)?.name_ar
                          : language === 'he' ? allCurrencies.find(c=>c.code===fromCurrency)?.name_he
                          : allCurrencies.find(c=>c.code===fromCurrency)?.name_en) || fromCurrency}
                    </Text>
                    <Text style={s.calcTap}>{language === 'ar' ? 'اضغط للتبديل' : 'Tap to switch'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.calcSwapBtn} onPress={() => { swapCurrencies(); resetTimer(); }}>
                    <Text style={s.calcSwapTxt}>⇅</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.calcCurrBtn} onPress={() => { cycleCurrency(toCurrency, false); resetTimer(); }}>
                    <Text style={s.calcCurrCode}>{toCurrency}</Text>
                    <Text style={s.calcCurrName}>
                      {toCurrency === 'ILS' ? (language === 'ar' ? 'شيقل' : 'Shekel')
                        : (language === 'ar' ? allCurrencies.find(c=>c.code===toCurrency)?.name_ar
                          : language === 'he' ? allCurrencies.find(c=>c.code===toCurrency)?.name_he
                          : allCurrencies.find(c=>c.code===toCurrency)?.name_en) || toCurrency}
                    </Text>
                    <Text style={s.calcTap}>{language === 'ar' ? 'اضغط للتبديل' : 'Tap to switch'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={s.calcSection}>
                <Text style={s.calcSectionLbl}>
                  {language === 'ar' ? 'المبالغ' : language === 'he' ? 'סכומים' : 'Amounts'}
                </Text>
                <View style={s.calcAmtRow}>
                  <View style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={s.calcAmtLbl}>{fromCurrency}</Text>
                    <TextInput style={s.calcInput} value={fromAmount} onChangeText={handleFromChange}
                      placeholder="0.00" keyboardType="decimal-pad" onFocus={resetTimer} />
                  </View>
                  <View style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={s.calcAmtLbl}>{toCurrency}</Text>
                    <TextInput style={s.calcInput} value={toAmount} onChangeText={handleToChange}
                      placeholder="0.00" keyboardType="decimal-pad" onFocus={resetTimer} />
                  </View>
                </View>
              </View>
              {calculationDetails ? (
                <View style={s.calcDetailsBox}>
                  <Text style={s.calcDetailsTxt}>{calculationDetails}</Text>
                </View>
              ) : null}
              {fromAmount && toAmount ? (
                <TouchableOpacity style={[s.proceedBtn, { opacity: 0.5 }]} disabled>
                  <Text style={s.proceedTxt}>
                    {language === 'ar' ? 'متابعة المعاملة' : language === 'he' ? 'המשך עסקה' : 'Proceed to Transaction'}
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

// ═══════════════════════════════════════════════════════════
// DYNAMIC STYLES (based on selected template)
// ═══════════════════════════════════════════════════════════
const SHADOW  = { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 6 };

function makeStyles(t: PriceTemplate) {
  const isDarkCard = t.cardBg !== '#FFFFFF' && t.cardBg !== '#FFF8F0';
  const cardText = t.cardText;
  const cardSubText = t.cardSubText;

  return StyleSheet.create({
    page: { flex: 1, backgroundColor: t.bg },
    loadingContainer: { flex: 1, backgroundColor: t.bg, justifyContent: 'center', alignItems: 'center' },
    loadingText: { color: t.accent, fontSize: 18, fontWeight: '600' },

    /* ── HEADER ── */
    header: {
      backgroundColor: t.bg,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      paddingTop: 14,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: t.accent + '50',
    },
    headerLeft: { flex: 1, alignItems: 'flex-start', gap: 2 },
    clockRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    clockIcon: { fontSize: 13, opacity: 0.8 },
    clockTime: { color: t.white, fontSize: 16, fontWeight: '700' },
    clockDate: { color: t.accent, fontSize: 11, fontWeight: '500' },

    headerCenter: { flex: 2, alignItems: 'center', gap: 6 },
    companyBigName: { color: t.accent2, fontSize: 28, fontWeight: '900', textAlign: 'center', letterSpacing: 0.5, textShadowColor: t.accent, textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6 },
    sloganRow: { flexDirection: 'row', alignItems: 'center', gap: 8, width: '100%' },
    sloganLine: { flex: 1, height: 1, backgroundColor: t.accent },
    sloganText: { color: t.accent, fontSize: 11, fontWeight: '600', textAlign: 'center' },

    headerRight: { flex: 1, alignItems: 'flex-end', gap: 8 },
    logoCircle: {
      width: 46, height: 46, borderRadius: 23,
      backgroundColor: t.accent, alignItems: 'center', justifyContent: 'center',
      borderWidth: 2, borderColor: t.accent2,
      ...SHADOW,
    },
    logoSymbol: { color: t.bg, fontSize: 15, fontWeight: '900' },
    langRow: { flexDirection: 'row', gap: 3 },
    langBtn: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 8, borderWidth: 1, borderColor: t.accent + '50' },
    langBtnActive: { backgroundColor: t.accent },
    langBtnText: { color: t.accent, fontSize: 10, fontWeight: '600' },
    langBtnTextActive: { color: t.bg, fontWeight: '700' },

    /* Large screen header overrides */
    headerLarge: { paddingHorizontal: 28, paddingTop: 20, paddingBottom: 22 },
    headerLeftLarge: { gap: 4 },
    clockIconLarge: { fontSize: 18 },
    clockTimeLarge: { fontSize: 24, fontWeight: '800' },
    clockDateLarge: { fontSize: 14, fontWeight: '600' },
    headerCenterLarge: { gap: 8 },
    companyBigNameLarge: { fontSize: 44 },
    sloganTextLarge: { fontSize: 14 },
    headerRightLarge: { gap: 12 },
    logoCircleLarge: { width: 62, height: 62, borderRadius: 31 },
    logoSymbolLarge: { fontSize: 22 },
    langRowLarge: { gap: 6 },
    langBtnLarge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
    logoutBtn: {
      marginTop: 6,
      backgroundColor: t.red,
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: t.red,
    },
    logoutBtnLarge: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 10 },
    logoutBtnText: { color: t.white, fontSize: 11, fontWeight: '700' },
    logoutBtnTextLarge: { fontSize: 14 },
    langBtnTextLarge: { fontSize: 13 },

    /* Working hours compact */
    whCompact: { alignItems: 'center', paddingHorizontal: 12 },
    whCompactCard: {
      backgroundColor: t.bg2,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: t.accent + '40',
      paddingVertical: 14,
      paddingHorizontal: 16,
      width: '100%',
      maxWidth: 480,
      alignSelf: 'center',
    },
    whCompactRow: { flexDirection: 'row', alignItems: 'center' },
    whCompactItem: { flex: 1, alignItems: 'center', gap: 4 },
    whCompactSep: { width: 1, height: 40, backgroundColor: t.accent + '50', marginHorizontal: 8 },
    whCompactIcon: { fontSize: 18 },
    whCompactLabel: { color: t.accent, fontSize: 10, fontWeight: '600' },
    whCompactVal: { color: t.white, fontSize: 13, fontWeight: '700', textAlign: 'center' },
    whCompactDivider: { height: 1, backgroundColor: t.accent + '30', marginVertical: 10 },
    whDaysRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, flexWrap: 'wrap' },

    /* Working hours in header (large screens) */
    whInHeader: {
      marginTop: 10,
      backgroundColor: 'rgba(0,0,0,0.25)',
      borderRadius: 10,
      borderWidth: 1,
      borderColor: t.accent + '50',
      paddingVertical: 8,
      paddingHorizontal: 16,
    },
    whInHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, flexWrap: 'wrap', marginTop: 6 },
    whInHeaderDaysLine: { color: t.white, fontSize: 26, fontWeight: '800', textAlign: 'center' },
    whInHeaderRestLine: { color: t.accent2, fontSize: 14, fontWeight: '600', textAlign: 'center', marginTop: 4 },
    whInHeaderItem: { color: t.accent2, fontSize: 26, fontWeight: '600' },
    whInHeaderVal: { color: t.white, fontWeight: '800', fontSize: 26 },
    whInHeaderSep: { width: 1, height: 28, backgroundColor: t.accent + '60' },
    ratesTitleBar: {
      backgroundColor: t.bg,
      paddingVertical: 14,
      paddingHorizontal: 16,
      alignItems: 'center',
      gap: 8,
    },
    goldHLine: { height: 1, backgroundColor: t.accent + '60', width: '100%' },
    ratesTitleContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    ratesTitleText: { color: t.white, fontSize: 18, fontWeight: '800', textAlign: 'center' },
    calcHint: { fontSize: 20 },

    /* ── HINT BAR ── */
    hintBar: {
      marginHorizontal: 12, marginBottom: 8,
      backgroundColor: t.bg2,
      borderRadius: 8, paddingVertical: 7, paddingHorizontal: 12,
      alignItems: 'center',
      borderWidth: 1, borderColor: t.accent + '30',
    },
    hintBarActive: { borderColor: t.accent, backgroundColor: t.accent + '15' },
    hintText: { color: t.accent2, fontSize: 11, fontWeight: '500', textAlign: 'center' },
    hintTextBig: { color: t.accent2, fontSize: 13, fontWeight: '700', textAlign: 'center' },

    /* ── TEMPLATE 2: AL-ARZ TABLE ── */
    alArzHeader: {
      backgroundColor: t.accent,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      paddingVertical: 14,
      gap: 8,
    },
    alArzHeaderLg: { paddingHorizontal: 40, paddingVertical: 28 },
    alArzHeaderTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' },
    alArzBrand: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
    alArzLogoMark: {
      width: 46, height: 46, borderRadius: 23,
      backgroundColor: '#FFFFFF',
      alignItems: 'center', justifyContent: 'center',
      flexDirection: 'row',
    },
    alArzLogoMarkLg: { width: 72, height: 72, borderRadius: 36 },
    alArzLogoTree: { fontSize: 18, color: t.accent, fontWeight: '900', position: 'absolute', top: 2 },
    alArzLogoTreeLg: { fontSize: 28, top: 4 },
    alArzLogoCoin: { fontSize: 20, color: '#C9A84C', fontWeight: '900' },
    alArzLogoCoinLg: { fontSize: 32 },
    alArzCompanyName: { color: '#FFFFFF', fontSize: 18, fontWeight: '900' },
    alArzCompanyNameLg: { fontSize: 32 },
    alArzContact: { alignItems: 'flex-end', gap: 4 },
    alArzContactRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' },
    alArzContactText: { color: '#FFFFFF', fontSize: 11, fontWeight: '600' },
    alArzContactTextLg: { fontSize: 18 },
    alArzLanguageRow: { flexDirection: 'row', gap: 4, marginTop: 4 },
    alArzLangBtn: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1.5, borderColor: '#FFFFFF', backgroundColor: 'rgba(255,255,255,0.15)' },
    alArzLangBtnActive: { backgroundColor: '#FFFFFF' },
    alArzLangBtnText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
    alArzLangBtnTextActive: { color: t.accent, fontWeight: '900' },

    /* Template 2 working hours bar (inside header) */
    alArzWHBar: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      marginTop: 12, paddingTop: 10, paddingBottom: 2,
      borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.25)',
      gap: 8, flexWrap: 'wrap',
    },
    alArzWHBarLg: { marginTop: 20, paddingTop: 16, gap: 16 },
    alArzWHDaysItem: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
    alArzWHTimesItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    alArzWHBarIcon: { fontSize: 14 },
    alArzWHBarIconLg: { fontSize: 22 },
    alArzWHBarText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
    alArzWHBarTextLg: { fontSize: 20 },
    alArzWHBarRest: { color: '#AFC2D8' },
    alArzWHBarSep: { width: 1, height: 16, backgroundColor: 'rgba(255,255,255,0.3)', marginHorizontal: 4 },
    alArzWHBarSepLg: { height: 24, marginHorizontal: 8 },

    /* ── TEMPLATE 3: GRID + INLINE CALCULATOR ── */
    tpl3Wrap: { paddingHorizontal: 8, paddingBottom: 8 },
    tpl3WrapLg: { flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 12, paddingHorizontal: 16 },
    tpl3Calc: {
      marginTop: 12,
      marginHorizontal: 4,
      backgroundColor: 'rgba(15, 47, 80, 0.85)',
      borderRadius: 14,
      borderWidth: 1,
      borderColor: 'rgba(127, 196, 255, 0.3)',
      paddingVertical: 16,
      paddingHorizontal: 14,
      ...SHADOW,
    },
    tpl3CalcLg: { flex: 0.38, maxWidth: 380, marginTop: 0, position: 'sticky', top: 12 },
    tpl3CalcTitle: { color: '#7FC4FF', fontSize: 16, fontWeight: '800', textAlign: 'center', marginBottom: 12 },
    tpl3CalcTitleLg: { fontSize: 22, marginBottom: 16 },
    tpl3CalcInput: {
      borderWidth: 2, borderColor: 'rgba(127, 196, 255, 0.3)', borderRadius: 10,
      padding: 10, fontSize: 20, fontWeight: '700', color: '#FFFFFF',
      textAlign: 'center', width: '100%',
      backgroundColor: 'rgba(10, 37, 64, 0.6)',
    },
    tpl3CalcDetails: {
      marginTop: 10,
      backgroundColor: 'rgba(10, 37, 64, 0.5)', borderRadius: 8, padding: 10,
    },
    tpl3CalcDetailsTxt: { color: '#A5C8E8', fontSize: 11, textAlign: 'center' },
    tpl3AdCard: {
      backgroundColor: '#123D4D',
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: '#D8B65A',
      overflow: 'hidden',
      minHeight: 190,
    },
    tpl3AdImage: { width: '100%', height: '100%', backgroundColor: '#0B2D40' }, 

    tableCard: {
      backgroundColor: t.cardBg,
      marginHorizontal: 12,
      marginTop: 12,
      borderRadius: 12,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: t.cardBorder,
      ...SHADOW,
    },
    tableTitle: {
      fontSize: 22,
      fontWeight: '800',
      color: t.dark,
      textAlign: 'center',
      paddingTop: 16,
      paddingHorizontal: 16,
    },
    tableTitleLg: { fontSize: 36, paddingTop: 28 },
    tableUpdated: {
      fontSize: 12,
      color: t.gray,
      textAlign: 'center',
      paddingBottom: 12,
      paddingHorizontal: 16,
    },
    tableUpdatedLg: { fontSize: 18, paddingBottom: 20 },
    tableHeader: {
      flexDirection: 'row',
      backgroundColor: t.accent,
      paddingHorizontal: 0,
    },
    tableHeaderCell: {
      color: t.dark,
      fontSize: 12,
      fontWeight: '800',
      textAlign: 'center',
      flex: 1,
      paddingVertical: 11,
      paddingHorizontal: 4,
    },
    tableHeaderCellLg: { fontSize: 22, paddingVertical: 18 },
    tableCurrencyHeader: { flex: 1.7, backgroundColor: '#AFC2D8' },
    tableCurrentHeader: { flex: 1, backgroundColor: '#9ED9D8' },
    tableSellHeader: { flex: 1.15, backgroundColor: '#E5C5DF' },
    tableBuyHeader: { flex: 1.15, backgroundColor: '#F0DFAE' },
    tableRow: {
      flexDirection: 'row',
      alignItems: 'stretch',
      minHeight: 58,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: t.cardBorder,
    },
    tableCell: {
      fontSize: 14,
      fontWeight: '700',
      color: t.cardText,
      textAlign: 'center',
      paddingVertical: 16,
      paddingHorizontal: 4,
      textAlignVertical: 'center',
    },
    tableCellLg: { fontSize: 26, paddingVertical: 24, fontWeight: '800' },
    tableCurrencyCell: {
      flex: 1.7,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 8,
      backgroundColor: '#D9E2EC',
      overflow: 'hidden',
    },
    tableCurrencyCellLg: { gap: 14, paddingHorizontal: 16 },
    tableCurrencyInfo: { flex: 1, flexDirection: 'column', flexShrink: 1, overflow: 'hidden' },
    tableFlagWrap: {
      width: 32,
      height: 32,
      borderRadius: 16,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: t.cardBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tableFlagWrapLg: { width: 56, height: 56, borderRadius: 28 },
    tableFlag: { width: 28, height: 28, borderRadius: 14 },
    tableFlagLg: { width: 50, height: 50, borderRadius: 25 },
    tableFlagEmoji: { fontSize: 18 },
    tableFlagEmojiLg: { fontSize: 32 },
    tableCurrencyInfo: { flex: 1, flexDirection: 'column' },
    tableCurrencyCode: {
      fontSize: 15,
      fontWeight: '800',
      color: t.dark,
    },
    tableCurrencyCodeLg: { fontSize: 26 },
    tableCurrencyName: {
      fontSize: 11,
      color: t.gray,
    },
    tableCurrencyNameLg: { fontSize: 16, marginTop: 2 },
    tableCurrencyNameEn: { fontSize: 13, color: '#9AABBE', marginTop: 1 },
    tableCurrentCell: { color: t.dark, backgroundColor: '#E8F5F4', flex: 1 },
    tableBuyCell: { color: t.red, backgroundColor: '#FBF5E3', flex: 1.15 },
    tableSellCell: { color: t.green, backgroundColor: '#F5E9F2', flex: 1.15 },
    tableChangeCell: { color: t.green, fontSize: 13 },
    tableMuted: { color: t.gray },

    /* ── CURRENCY GRID ── */
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: 8,
      paddingBottom: 8,
      gap: 8,
    },
    card: {
      backgroundColor: t.cardBg,
      borderRadius: t.cardRadius,
      overflow: 'hidden',
      ...SHADOW,
      borderWidth: 1,
      borderColor: t.cardBorder,
    },
    cardSelected: { borderWidth: 2, borderColor: t.accent },
    cardInactive: {},

    unavailBadge: {
      position: 'absolute',
      alignSelf: 'center',
      top: '55%',
      zIndex: 10,
      backgroundColor: '#6B7280',
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    unavailText: { color: t.white, fontSize: 13, fontWeight: '800', textAlign: 'center' },

    cardFlagArea: {
      alignItems: 'center',
      paddingTop: 14, paddingBottom: 10, paddingHorizontal: 6,
      backgroundColor: t.cardBg,
    },
    checkBadge: {
      position: 'absolute', top: 6, right: 6,
      width: 20, height: 20, borderRadius: 10,
      backgroundColor: t.accent, alignItems: 'center', justifyContent: 'center',
    },
    checkText: { color: t.white, fontSize: 11, fontWeight: '800' },
    flagRing: {
      width: 52, height: 52, borderRadius: 26,
      overflow: 'hidden',
      borderWidth: 2, borderColor: t.flagRingColor,
      marginBottom: 7,
      alignItems: 'center', justifyContent: 'center',
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 4, elevation: 3,
    },
    flagRingActive: { borderColor: t.accent + '80' },
    flagImg: { width: '100%', height: '100%', borderRadius: 24 },
    flagEmoji: { fontSize: 30, lineHeight: 52, textAlign: 'center' },
    cardCode: { color: cardText, fontSize: 16, fontWeight: '800', letterSpacing: 0.3 },
    cardName: { color: cardSubText, fontSize: 10, textAlign: 'center', marginTop: 2 },
    dimText: { color: cardSubText },

    /* Large screen card name overrides */
    cardCodeLg: { fontSize: 32, letterSpacing: 0.5 },
    cardNameLg: { fontSize: 20, marginTop: 4 },
    cardFlagAreaLg: { paddingTop: 22, paddingBottom: 16 },
    flagRingLg: { width: 80, height: 80, borderRadius: 40 },
    flagEmojiLg: { fontSize: 48, lineHeight: 80 },

    cardGoldLine: { height: 1.5, backgroundColor: t.dividerColor + '50', marginHorizontal: 8 },

    cardRatesRow: {
      flexDirection: 'row', alignItems: 'center',
      paddingVertical: 10, paddingHorizontal: 6,
      backgroundColor: t.cardBg,
    },
    rateHalf: { flex: 1, alignItems: 'center', gap: 3, paddingVertical: 4, borderRadius: 8 },
    rateHalfActive: { backgroundColor: isDarkCard ? 'rgba(255,255,255,0.05)' : '#F5F8FA' },
    rateVLine: { width: 1, height: 32, backgroundColor: t.cardBorder, marginHorizontal: 4 },
    rateLbl: { fontSize: 10, color: cardSubText, fontWeight: '600' },
    rateLblActive: { color: cardText, fontWeight: '700' },
    rateLblBuy:  { color: t.red },
    rateLblSell: { color: t.green },
    buyVal:  { fontSize: 17, fontWeight: '700', color: t.red },
    sellVal: { fontSize: 18, fontWeight: '800', color: t.green },
    currentVal: { fontSize: 13, fontWeight: '700', color: cardText },
    currentLbl: { fontSize: 9, color: cardSubText, fontWeight: '600' },

    /* Large screen rate overrides */
    rateLblLg: { fontSize: 22, fontWeight: '700' },
    buyValLg:  { fontSize: 44, fontWeight: '800', letterSpacing: -0.5 },
    sellValLg: { fontSize: 46, fontWeight: '900', letterSpacing: -0.5 },
    currentValLg: { fontSize: 26, fontWeight: '700' },
    currentLblLg: { fontSize: 18, fontWeight: '700' },
    rateHalfLg: { paddingVertical: 10 },
    rateVLineLg: { height: 72 },
    cardRatesRowLg: { paddingVertical: 18, paddingHorizontal: 10 },

    /* ── INFO BAR ── */
    infoBar: {
      backgroundColor: t.bg2,
      marginTop: 0,
      borderTopWidth: 1.5,
      borderBottomWidth: 1.5,
      borderColor: t.accent + '60',
      paddingVertical: 12,
      paddingHorizontal: 14,
    },
    infoBarInner: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
    infoSegment: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, minWidth: 110 },
    infoSep: { width: 1.5, height: 24, backgroundColor: t.accent + '70' },
    infoIcon: { fontSize: 15 },
    infoText: { color: t.white, fontSize: 12, fontWeight: '700', flex: 1, opacity: 0.95 },

    /* ── SECTIONS ── */
    section: { paddingHorizontal: 12, paddingTop: 16, paddingBottom: 4 },
    sectionTitle: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
    sectionTitleText: { color: t.accent, fontSize: 15, fontWeight: '800' },

    /* Services */
    servicesRow: { flexDirection: 'row', gap: 8 },
    serviceCard: {
      flex: 1, alignItems: 'center',
      backgroundColor: t.bg2, borderRadius: 12, paddingVertical: 28,
      borderWidth: 1, borderColor: t.accent + '40',
      ...SHADOW,
    },
    serviceIconWrap: {
      width: 88, height: 88, borderRadius: 44,
      backgroundColor: t.white + '15',
      alignItems: 'center', justifyContent: 'center',
      marginBottom: 12,
    },
    serviceIcon: { fontSize: 44 },
    serviceLabel: { color: t.white, fontSize: 20, fontWeight: '600', textAlign: 'center' },

    /* Working hours */
    whRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    whCard: {
      flex: 1, minWidth: 80,
      backgroundColor: t.bg2, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 8,
      alignItems: 'center', borderWidth: 1, borderColor: t.accent + '40',
    },
    whCardFull: { width: '100%', flex: 0 },
    whIcon: { fontSize: 18, marginBottom: 4 },
    whLabel: { color: t.accent, fontSize: 10, fontWeight: '600', marginBottom: 3 },
    whVal: { color: t.white, fontSize: 12, fontWeight: '700', textAlign: 'center' },

    /* Footer */
    footer: {
      flexDirection: 'row', alignItems: 'center',
      marginHorizontal: 12, marginTop: 18, gap: 10,
    },
    footerSlogan: { color: t.accent, fontSize: 14, fontWeight: '800' },

    /* Customer button */
    custBtn: {
      backgroundColor: t.accent,
      marginHorizontal: 12, marginTop: 14, marginBottom: 24,
      borderRadius: 14, paddingVertical: 16, alignItems: 'center',
      ...SHADOW,
    },
    custBtnText: { color: t.bg, fontSize: 16, fontWeight: '900' },

    /* ── CALCULATOR MODAL ── */
    modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
    calcModal: {
      backgroundColor: t.cardBg, borderTopLeftRadius: 24, borderTopRightRadius: 24,
      maxHeight: '85%', paddingTop: 16,
    },
    calcHead: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 20, paddingBottom: 12,
      borderBottomWidth: 1, borderBottomColor: t.cardBorder,
    },
    calcTitle: { color: cardText, fontSize: 17, fontWeight: '800' },
    calcCloseBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: isDarkCard ? 'rgba(255,255,255,0.08)' : '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
    calcCloseX: { color: cardText, fontSize: 15, fontWeight: '700' },
    calcSection: { paddingHorizontal: 20, paddingTop: 16 },
    calcSectionLbl: { color: cardSubText, fontSize: 12, fontWeight: '600', marginBottom: 10, textAlign: 'center' },
    calcCurrRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    calcCurrBtn: { flex: 1, backgroundColor: isDarkCard ? 'rgba(255,255,255,0.05)' : '#F3F4F6', borderRadius: 12, alignItems: 'center', paddingVertical: 12 },
    calcCurrCode: { color: cardText, fontSize: 20, fontWeight: '800' },
    calcCurrName: { color: cardSubText, fontSize: 11, marginTop: 2, textAlign: 'center' },
    calcTap: { color: cardSubText, fontSize: 10, marginTop: 4 },
    calcSwapBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: t.accent, alignItems: 'center', justifyContent: 'center' },
    calcSwapTxt: { color: t.white, fontSize: 20, fontWeight: '700' },
    calcAmtRow: { flexDirection: 'row', gap: 12 },
    calcAmtLbl: { color: cardText, fontSize: 13, fontWeight: '700', marginBottom: 6 },
    calcInput: {
      borderWidth: 2, borderColor: t.cardBorder, borderRadius: 10,
      padding: 12, fontSize: 22, fontWeight: '700', color: cardText,
      textAlign: 'center', width: '100%',
      backgroundColor: isDarkCard ? 'rgba(255,255,255,0.03)' : '#F9FAFB',
    },
    calcDetailsBox: {
      marginHorizontal: 20, marginTop: 10,
      backgroundColor: isDarkCard ? 'rgba(255,255,255,0.05)' : '#F3F4F6', borderRadius: 8, padding: 10,
    },
    calcDetailsTxt: { color: cardText, fontSize: 11, textAlign: 'center' },
    proceedBtn: {
      backgroundColor: t.bg, marginHorizontal: 20, marginTop: 16,
      borderRadius: 14, paddingVertical: 16, alignItems: 'center',
    },
    proceedTxt: { color: t.white, fontSize: 15, fontWeight: '800' },
  });
}

// Memoize styles per template id to avoid recreating on every render
const styleCache: { [id: number]: ReturnType<typeof makeStyles> } = {};
function getStyles(templateId: number) {
  if (!styleCache[templateId]) styleCache[templateId] = makeStyles(getTemplate(templateId));
  return styleCache[templateId];
}
