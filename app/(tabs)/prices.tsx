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
  FLAG_CC[code] ? `https://flagcdn.com/w80/${FLAG_CC[code]}.png` : '';

// ─────────────────────────────────────────────
export default function PricesScreen() {
  const [allCurrencies, setAllCurrencies]   = useState<Currency[]>([]);
  const [loading, setLoading]               = useState(true);
  const [language, setLanguage]             = useState<'ar'|'he'|'en'>('ar');
  const [companyInfo, setCompanyInfo]       = useState<CompanyInfo | null>(null);
  const [workingHours, setWorkingHours]     = useState<WorkingHours[]>([]);
  const [advertisements]                    = useState<Advertisement[]>([]);
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
      const data = await currencyService.getAll();
      setAllCurrencies(data.sort((a, b) => (a.sort_num ?? 999) - (b.sort_num ?? 999)));
      const co = await companySettingsService.get();
      if (co) {
        setCompanyInfo(co);
        setWorkingHours(await workingHoursService.getByCompanyId(co.id));
      }
    } catch {} finally { setLoading(false); }
  };

  const getWorkingDaysText = () => {
    const allExceptFriday = DAYS_OF_WEEK.filter(d => d.key !== 'friday');
    if (!workingHours?.length) {
      return allExceptFriday.map(d => language === 'he' ? d.he : language === 'en' ? d.en : d.ar).join(' - ');
    }
    const activeDays = workingHours.filter(wh => wh.is_working_day === true || (wh.is_working_day as any) === 'true').map(wh => wh.day_of_week);
    const filtered = allExceptFriday.filter(d => activeDays.length === 0 || activeDays.includes(d.key));
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
        result = val / fromD!.buy_rate; details = `${val} شيقل ÷ ${fromD!.buy_rate} = ${result.toFixed(2)} ${fromCurrency}`;
      } else if (fromCurrency === 'ILS') {
        result = val * toD!.sell_rate; details = `${val} ${toCurrency} × ${toD!.sell_rate} = ${result.toFixed(2)} شيقل`;
      } else {
        const s = val * toD!.sell_rate; result = s / fromD!.buy_rate;
        details = `${val} ${toCurrency} × ${toD!.sell_rate} = ${s.toFixed(2)} ÷ ${fromD!.buy_rate} = ${result.toFixed(2)} ${fromCurrency}`;
      }
    } else {
      if (toCurrency === 'ILS') {
        result = val * fromD!.buy_rate; details = `${val} ${fromCurrency} × ${fromD!.buy_rate} = ${result.toFixed(2)} شيقل`;
      } else if (fromCurrency === 'ILS') {
        result = val / toD!.sell_rate; details = `${val} شيقل ÷ ${toD!.sell_rate} = ${result.toFixed(2)} ${toCurrency}`;
      } else {
        const s = val * fromD!.buy_rate; result = s / toD!.sell_rate;
        details = `${val} ${fromCurrency} × ${fromD!.buy_rate} = ${s.toFixed(2)} ÷ ${toD!.sell_rate} = ${result.toFixed(2)} ${toCurrency}`;
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
    openCalcWith(selectedFirstCurrency, code); setSelectedFirstCurrency(null);
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

  const closeCalculator = () => { setShowCalculator(false); setFromAmount(''); setToAmount(''); setCalculationDetails(''); clearInactivityTimer(); };

  const handleProceed = async () => {
    try {
      clearInactivityTimer();
      await AsyncStorage.setItem('fromCalculator', 'true');
      await AsyncStorage.setItem('calculatorData', JSON.stringify({ fromCurrency, toCurrency, fromAmount, toAmount, calculationDetails, timestamp: new Date().toISOString(), isFromCalculator: true }));
      await AsyncStorage.setItem('calculatorTransactionReady', 'true');
      closeCalculator(); router.push('/(tabs)/customer-info');
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

  // ── Render helpers ─────────────────────────────────────
  const isLargeScreen = screenData.width >= 768;
  const wh = getWorkingHoursText();

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

  const companyName = companyInfo
    ? (language === 'ar' ? companyInfo.name_ar : language === 'he' ? companyInfo.name_he : companyInfo.name_en)
    : (language === 'ar' ? 'نعامنة للصرافة' : language === 'he' ? 'נעאמנה להמרות' : 'Naamneh Exchange');

  const companyPhone = companyInfo?.phone1 || '0526000841';

  const cardWidth = isLargeScreen
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
            <TouchableOpacity style={[s.logoCircle, isLargeScreen && s.logoCircleLarge]} onPress={() => router.push('/login')}>
              <Text style={[s.logoSymbol, isLargeScreen && s.logoSymbolLarge]}>€$</Text>
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

        {/* ════════════════════════════════
            RATES TITLE — small screens only
        ════════════════════════════════ */}
        {!isLargeScreen && (
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
        <View style={s.infoBar}>
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
        {selectedFirstCurrency ? (
          <Animated.View style={[s.hintBar, s.hintBarActive, { transform: [{ scale: pulseAnim }] }]}>
            <Text style={s.hintTextBig}>
              {language === 'ar' ? '✓ اختر عملة ثانية للمقارنة' : language === 'he' ? '✓ בחר מטבע שני' : '✓ Select 2nd currency'}
            </Text>
          </Animated.View>
        ) : (
          <View style={s.hintBar}>
            <Text style={s.hintTextBig}>
              {language === 'ar' ? '👆 اضغط على أي سعر لفتح الحاسبة' : language === 'he' ? '👆 לחץ על שער לחשב' : '👆 Tap any rate to open calculator'}
            </Text>
          </View>
        )}

        {/* ════════════════════════════════
            CURRENCY GRID
        ════════════════════════════════ */}
        <View style={s.grid}>
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
              {/* Unavailable overlay */}
              {!currency.is_active && (
                <View style={s.unavailOverlay}>
                  <Text style={[s.unavailText, isLargeScreen && { fontSize: 32, lineHeight: 42 }]}>
                    {language === 'ar' ? '⚠️ غير متوفر' : language === 'he' ? '⚠️ לא זמין' : '⚠️ Unavailable'}
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
                      style={s.flagImg} resizeMode="cover" />
                  ) : (
                    <Text style={[s.flagEmoji, isLargeScreen && s.flagEmojiLg]}>{FLAG_EMOJI[currency.code] || '💱'}</Text>
                  )}
                </View>
                <Text style={[s.cardCode, !currency.is_active && s.dimText, isLargeScreen && s.cardCodeLg]}>
                  {currency.code}
                </Text>
                <Text style={[s.cardName, !currency.is_active && s.dimText, isLargeScreen && s.cardNameLg]}>
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
                  <Text style={[s.buyVal, !currency.is_active && s.dimText, isLargeScreen && s.buyValLg]}>
                    {currency.buy_rate?.toFixed(2) ?? '—'}
                  </Text>
                </TouchableOpacity>

                <View style={[s.rateVLine, isLargeScreen && s.rateVLineLg]} />

                <View style={[s.rateHalf, isLargeScreen && s.rateHalfLg, { gap: 2 }]}>
                  <Text style={[s.currentLbl, isLargeScreen && s.currentLblLg]}>
                    {language === 'ar' ? 'الحالي' : language === 'he' ? 'נוכחי' : 'Rate'}
                  </Text>
                  <Text style={[s.currentVal, !currency.is_active && s.dimText, isLargeScreen && s.currentValLg]}>
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
                  <Text style={[s.sellVal, !currency.is_active && s.dimText, isLargeScreen && s.sellValLg]}>
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
        <View style={s.section}>
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
        </View>

        {/* ════════════════════════════════
            WORKING HOURS — small screens only
        ════════════════════════════════ */}
        {!isLargeScreen && (
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
                <TouchableOpacity style={s.proceedBtn} onPress={handleProceed}>
                  <Text style={s.proceedTxt}>
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

// ═══════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════
const BG      = '#0B3B24';   // deep forest green (matches image)
const BG2     = '#0F4A2E';   // slightly lighter green
const GOLD    = '#C9A84C';   // gold accent
const GOLD2   = '#E8C96A';   // lighter gold
const WHITE   = '#FFFFFF';
const RED     = '#D0302F';
const GREEN   = '#1A9A52';
const DARK    = '#1A2730';
const GRAY    = '#8A9BB0';
const SHADOW  = { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 6 };

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: BG },
  loadingContainer: { flex: 1, backgroundColor: BG, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: GOLD, fontSize: 18, fontWeight: '600' },

  /* ── HEADER ── */
  header: {
    backgroundColor: BG,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: GOLD + '50',
  },
  headerLeft: { flex: 1, alignItems: 'flex-start', gap: 2 },
  clockRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  clockIcon: { fontSize: 13, opacity: 0.8 },
  clockTime: { color: WHITE, fontSize: 16, fontWeight: '700' },
  clockDate: { color: GOLD, fontSize: 11, fontWeight: '500' },

  headerCenter: { flex: 2, alignItems: 'center', gap: 6 },
  companyBigName: { color: WHITE, fontSize: 22, fontWeight: '900', textAlign: 'center', letterSpacing: 0.5 },
  sloganRow: { flexDirection: 'row', alignItems: 'center', gap: 8, width: '100%' },
  sloganLine: { flex: 1, height: 1, backgroundColor: GOLD },
  sloganText: { color: GOLD, fontSize: 11, fontWeight: '600', textAlign: 'center' },

  headerRight: { flex: 1, alignItems: 'flex-end', gap: 8 },
  logoCircle: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: GOLD, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: GOLD2,
    ...SHADOW,
  },
  logoSymbol: { color: BG, fontSize: 15, fontWeight: '900' },
  langRow: { flexDirection: 'row', gap: 3 },
  langBtn: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 8, borderWidth: 1, borderColor: GOLD + '50' },
  langBtnActive: { backgroundColor: GOLD },
  langBtnText: { color: GOLD, fontSize: 10, fontWeight: '600' },
  langBtnTextActive: { color: BG, fontWeight: '700' },

  /* Large screen header overrides */
  headerLarge: { paddingHorizontal: 28, paddingTop: 20, paddingBottom: 22 },
  headerLeftLarge: { gap: 4 },
  clockIconLarge: { fontSize: 18 },
  clockTimeLarge: { fontSize: 24, fontWeight: '800' },
  clockDateLarge: { fontSize: 14, fontWeight: '600' },
  headerCenterLarge: { gap: 8 },
  companyBigNameLarge: { fontSize: 32 },
  sloganTextLarge: { fontSize: 14 },
  headerRightLarge: { gap: 12 },
  logoCircleLarge: { width: 62, height: 62, borderRadius: 31 },
  logoSymbolLarge: { fontSize: 22 },
  langRowLarge: { gap: 6 },
  langBtnLarge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  langBtnTextLarge: { fontSize: 13 },

  /* Working hours compact */
  whCompact: { alignItems: 'center', paddingHorizontal: 12 },
  whCompactCard: {
    backgroundColor: BG2,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: GOLD + '40',
    paddingVertical: 14,
    paddingHorizontal: 16,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  whCompactRow: { flexDirection: 'row', alignItems: 'center' },
  whCompactItem: { flex: 1, alignItems: 'center', gap: 4 },
  whCompactSep: { width: 1, height: 40, backgroundColor: GOLD + '50', marginHorizontal: 8 },
  whCompactIcon: { fontSize: 18 },
  whCompactLabel: { color: GOLD, fontSize: 10, fontWeight: '600' },
  whCompactVal: { color: WHITE, fontSize: 13, fontWeight: '700', textAlign: 'center' },
  whCompactDivider: { height: 1, backgroundColor: GOLD + '30', marginVertical: 10 },
  whDaysRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, flexWrap: 'wrap' },

  /* Working hours in header (large screens) */
  whInHeader: {
    marginTop: 10,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: GOLD + '50',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  whInHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, flexWrap: 'wrap', marginTop: 6 },
  whInHeaderDaysLine: { color: WHITE, fontSize: 26, fontWeight: '800', textAlign: 'center' },
  whInHeaderItem: { color: GOLD2, fontSize: 26, fontWeight: '600' },
  whInHeaderVal: { color: WHITE, fontWeight: '800', fontSize: 26 },
  whInHeaderSep: { width: 1, height: 28, backgroundColor: GOLD + '60' },
  ratesTitleBar: {
    backgroundColor: BG,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 8,
  },
  goldHLine: { height: 1, backgroundColor: GOLD + '60', width: '100%' },
  ratesTitleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  ratesTitleText: { color: WHITE, fontSize: 18, fontWeight: '800', textAlign: 'center' },
  calcHint: { fontSize: 20 },

  /* ── HINT BAR ── */
  hintBar: {
    marginHorizontal: 12, marginBottom: 8,
    backgroundColor: BG2,
    borderRadius: 8, paddingVertical: 7, paddingHorizontal: 12,
    alignItems: 'center',
    borderWidth: 1, borderColor: GOLD + '30',
  },
  hintBarActive: { borderColor: GOLD, backgroundColor: GOLD + '15' },
  hintText: { color: GOLD2, fontSize: 11, fontWeight: '500', textAlign: 'center' },
  hintTextBig: { color: GOLD2, fontSize: 13, fontWeight: '700', textAlign: 'center' },

  /* ── CURRENCY GRID ── */
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
    paddingBottom: 8,
    gap: 8,
  },
  card: {
    backgroundColor: WHITE,
    borderRadius: 14,
    overflow: 'hidden',
    ...SHADOW,
    borderWidth: 1,
    borderColor: '#E2EBF0',
  },
  cardSelected: { borderWidth: 2, borderColor: GOLD },
  cardInactive: {},

  unavailOverlay: {
    position: 'absolute', inset: 0, zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.88)',
    justifyContent: 'center', alignItems: 'center',
    borderRadius: 14,
  },
  unavailText: { color: '#CC2222', fontSize: 16, fontWeight: '900', textAlign: 'center', lineHeight: 22, letterSpacing: 0.5 },

  cardFlagArea: {
    alignItems: 'center',
    paddingTop: 14, paddingBottom: 10, paddingHorizontal: 6,
    backgroundColor: WHITE,
  },
  checkBadge: {
    position: 'absolute', top: 6, right: 6,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: GOLD, alignItems: 'center', justifyContent: 'center',
  },
  checkText: { color: WHITE, fontSize: 11, fontWeight: '800' },
  flagRing: {
    width: 52, height: 52, borderRadius: 26,
    overflow: 'hidden',
    borderWidth: 2, borderColor: '#DCE8F0',
    marginBottom: 7,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 4, elevation: 3,
  },
  flagRingActive: { borderColor: GOLD + '80' },
  flagImg: { width: '100%', height: '100%' },
  flagEmoji: { fontSize: 30, lineHeight: 52, textAlign: 'center' },
  cardCode: { color: DARK, fontSize: 16, fontWeight: '800', letterSpacing: 0.3 },
  cardName: { color: GRAY, fontSize: 10, textAlign: 'center', marginTop: 2 },
  dimText: { color: '#C0CBD5' },

  /* Large screen card name overrides */
  cardCodeLg: { fontSize: 32, letterSpacing: 0.5 },
  cardNameLg: { fontSize: 20, marginTop: 4 },
  cardFlagAreaLg: { paddingTop: 22, paddingBottom: 16 },
  flagRingLg: { width: 80, height: 80, borderRadius: 40 },
  flagEmojiLg: { fontSize: 48, lineHeight: 80 },

  cardGoldLine: { height: 1.5, backgroundColor: GOLD + '50', marginHorizontal: 8 },

  cardRatesRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, paddingHorizontal: 6,
    backgroundColor: WHITE,
  },
  rateHalf: { flex: 1, alignItems: 'center', gap: 3, paddingVertical: 4, borderRadius: 8 },
  rateHalfActive: { backgroundColor: '#F5F8FA' },
  rateVLine: { width: 1, height: 32, backgroundColor: '#E2EBF0', marginHorizontal: 4 },
  rateLbl: { fontSize: 10, color: GRAY, fontWeight: '600' },
  rateLblActive: { color: '#4A6572', fontWeight: '700' },
  rateLblBuy:  { color: RED },
  rateLblSell: { color: GREEN },
  buyVal:  { fontSize: 17, fontWeight: '700', color: RED },
  sellVal: { fontSize: 18, fontWeight: '800', color: GREEN },
  currentVal: { fontSize: 13, fontWeight: '700', color: DARK },
  currentLbl: { fontSize: 9, color: GRAY, fontWeight: '600' },

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
    backgroundColor: BG2,
    marginTop: 0,
    borderTopWidth: 1.5,
    borderBottomWidth: 1.5,
    borderColor: GOLD + '60',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  infoBarInner: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  infoSegment: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, minWidth: 110 },
  infoSep: { width: 1.5, height: 24, backgroundColor: GOLD + '70' },
  infoIcon: { fontSize: 15 },
  infoText: { color: WHITE, fontSize: 12, fontWeight: '700', flex: 1, opacity: 0.95 },

  /* ── SECTIONS ── */
  section: { paddingHorizontal: 12, paddingTop: 16, paddingBottom: 4 },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  sectionTitleText: { color: GOLD, fontSize: 15, fontWeight: '800' },

  /* Services */
  servicesRow: { flexDirection: 'row', gap: 8 },
  serviceCard: {
    flex: 1, alignItems: 'center',
    backgroundColor: BG2, borderRadius: 12, paddingVertical: 28,
    borderWidth: 1, borderColor: GOLD + '40',
    ...SHADOW,
  },
  serviceIconWrap: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: WHITE + '15',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  serviceIcon: { fontSize: 44 },
  serviceLabel: { color: WHITE, fontSize: 20, fontWeight: '600', textAlign: 'center' },

  /* Working hours */
  whRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  whCard: {
    flex: 1, minWidth: 80,
    backgroundColor: BG2, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 8,
    alignItems: 'center', borderWidth: 1, borderColor: GOLD + '40',
  },
  whCardFull: { width: '100%', flex: 0 },
  whIcon: { fontSize: 18, marginBottom: 4 },
  whLabel: { color: GOLD, fontSize: 10, fontWeight: '600', marginBottom: 3 },
  whVal: { color: WHITE, fontSize: 12, fontWeight: '700', textAlign: 'center' },

  /* Footer */
  footer: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 12, marginTop: 18, gap: 10,
  },
  footerSlogan: { color: GOLD, fontSize: 14, fontWeight: '800' },

  /* Customer button */
  custBtn: {
    backgroundColor: GOLD,
    marginHorizontal: 12, marginTop: 14, marginBottom: 24,
    borderRadius: 14, paddingVertical: 16, alignItems: 'center',
    ...SHADOW,
  },
  custBtnText: { color: BG, fontSize: 16, fontWeight: '900' },

  /* ── CALCULATOR MODAL ── */
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  calcModal: {
    backgroundColor: WHITE, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '85%', paddingTop: 16,
  },
  calcHead: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  calcTitle: { color: DARK, fontSize: 17, fontWeight: '800' },
  calcCloseBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  calcCloseX: { color: '#374151', fontSize: 15, fontWeight: '700' },
  calcSection: { paddingHorizontal: 20, paddingTop: 16 },
  calcSectionLbl: { color: GRAY, fontSize: 12, fontWeight: '600', marginBottom: 10, textAlign: 'center' },
  calcCurrRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  calcCurrBtn: { flex: 1, backgroundColor: '#F3F4F6', borderRadius: 12, alignItems: 'center', paddingVertical: 12 },
  calcCurrCode: { color: DARK, fontSize: 20, fontWeight: '800' },
  calcCurrName: { color: GRAY, fontSize: 11, marginTop: 2, textAlign: 'center' },
  calcTap: { color: '#9CA3AF', fontSize: 10, marginTop: 4 },
  calcSwapBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: GOLD, alignItems: 'center', justifyContent: 'center' },
  calcSwapTxt: { color: WHITE, fontSize: 20, fontWeight: '700' },
  calcAmtRow: { flexDirection: 'row', gap: 12 },
  calcAmtLbl: { color: DARK, fontSize: 13, fontWeight: '700', marginBottom: 6 },
  calcInput: {
    borderWidth: 2, borderColor: '#D1D5DB', borderRadius: 10,
    padding: 12, fontSize: 22, fontWeight: '700', color: DARK,
    textAlign: 'center', width: '100%',
  },
  calcDetailsBox: {
    marginHorizontal: 20, marginTop: 10,
    backgroundColor: '#F3F4F6', borderRadius: 8, padding: 10,
  },
  calcDetailsTxt: { color: '#374151', fontSize: 11, textAlign: 'center' },
  proceedBtn: {
    backgroundColor: BG, marginHorizontal: 20, marginTop: 16,
    borderRadius: 14, paddingVertical: 16, alignItems: 'center',
  },
  proceedTxt: { color: WHITE, fontSize: 15, fontWeight: '800' },
});
