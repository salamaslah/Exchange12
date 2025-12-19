import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { currencyService } from '@/lib/supabase';

export default function CalculatorScreen() {
  const [allCurrencies, setAllCurrencies] = useState<any[]>([]);
  const [fromCurrency, setFromCurrency] = useState('ILS');
  const [toCurrency, setToCurrency] = useState('USD');
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [calculationDetails, setCalculationDetails] = useState('');
  const [language, setLanguage] = useState<'ar' | 'he' | 'en'>('ar');
  const [loading, setLoading] = useState(true);
  const [inactivityTimer, setInactivityTimer] = useState<NodeJS.Timeout | null>(null);
  const router = useRouter();

  useEffect(() => {
    loadLanguage();
    loadCurrencies();
    loadPreselectedCurrencies();
    startInactivityTimer();

    return () => {
      clearInactivityTimer();
    };
  }, []);

  const loadLanguage = async () => {
    try {
      const savedLanguage = await AsyncStorage.getItem('selectedLanguage');
      if (savedLanguage && ['ar', 'he', 'en'].includes(savedLanguage)) {
        setLanguage(savedLanguage as 'ar' | 'he' | 'en');
      }
    } catch (error) {
      console.log('خطأ في تحميل اللغة:', error);
    }
  };

  const loadCurrencies = async () => {
    try {
      setLoading(true);
      const currencies = await currencyService.getAll();
      setAllCurrencies(currencies);
    } catch (error) {
      console.error('خطأ في تحميل العملات:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPreselectedCurrencies = async () => {
    try {
      const savedFromCurrency = await AsyncStorage.getItem('calculatorFromCurrency');
      const savedToCurrency = await AsyncStorage.getItem('calculatorToCurrency');

      if (savedFromCurrency) {
        setFromCurrency(savedFromCurrency);
        await AsyncStorage.removeItem('calculatorFromCurrency');
      }

      if (savedToCurrency) {
        setToCurrency(savedToCurrency);
        await AsyncStorage.removeItem('calculatorToCurrency');
      }
    } catch (error) {
      console.log('خطأ في تحميل العملات المحفوظة:', error);
    }
  };

  const startInactivityTimer = () => {
    clearInactivityTimer();

    const timer = setTimeout(() => {
      console.log('⏰ إغلاق آلة الحاسبة تلقائياً بعد 15 ثانية من عدم الاستخدام');
      router.back();
    }, 15000);

    setInactivityTimer(timer);
  };

  const clearInactivityTimer = () => {
    if (inactivityTimer) {
      clearTimeout(inactivityTimer);
      setInactivityTimer(null);
    }
  };

  const resetInactivityTimer = () => {
    startInactivityTimer();
  };

  const calculateConversion = (amount: string, side: 'left' | 'right') => {
    if (!amount || isNaN(parseFloat(amount))) {
      setFromAmount('');
      setToAmount('');
      setCalculationDetails('');
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
    } else {
      let targetCurrency, sourceCurrency, targetCurrencyData, sourceCurrencyData;

      if (side === 'right') {
        targetCurrency = toCurrency;
        sourceCurrency = fromCurrency;
        targetCurrencyData = toCurrencyData;
        sourceCurrencyData = fromCurrencyData;
      } else {
        targetCurrency = toCurrency;
        sourceCurrency = fromCurrency;
        targetCurrencyData = toCurrencyData;
        sourceCurrencyData = fromCurrencyData;
      }

      if (side === 'right') {
        if (targetCurrency === 'ILS') {
          result = inputAmount / sourceCurrencyData!.buy_rate;
          details = `${inputAmount.toFixed(2)} شيقل ÷ ${sourceCurrencyData!.buy_rate.toFixed(2)} (سعر الشراء) = ${result.toFixed(2)} ${sourceCurrency}`;
        } else if (sourceCurrency === 'ILS') {
          result = inputAmount * targetCurrencyData!.sell_rate;
          details = `${inputAmount.toFixed(2)} ${targetCurrency} × ${targetCurrencyData!.sell_rate.toFixed(2)} (سعر البيع) = ${result.toFixed(2)} شيقل`;
        } else {
          const shekelAmount = inputAmount * targetCurrencyData!.sell_rate;
          result = shekelAmount / sourceCurrencyData!.buy_rate;
          details = `${inputAmount.toFixed(2)} ${targetCurrency} × ${targetCurrencyData!.sell_rate.toFixed(2)} = ${shekelAmount.toFixed(2)} شيقل ÷ ${sourceCurrencyData!.buy_rate.toFixed(2)} = ${result.toFixed(2)} ${sourceCurrency}`;
        }
      } else {
        if (targetCurrency === 'ILS') {
          result = inputAmount * sourceCurrencyData!.buy_rate;
          details = `${inputAmount.toFixed(2)} ${sourceCurrency} × ${sourceCurrencyData!.buy_rate.toFixed(2)} (سعر الشراء) = ${result.toFixed(2)} شيقل`;
        } else if (sourceCurrency === 'ILS') {
          result = inputAmount / targetCurrencyData!.sell_rate;
          details = `${inputAmount.toFixed(2)} شيقل ÷ ${targetCurrencyData!.sell_rate.toFixed(2)} (سعر البيع) = ${result.toFixed(2)} ${targetCurrency}`;
        } else {
          const shekelAmount = inputAmount * sourceCurrencyData!.buy_rate;
          result = shekelAmount / targetCurrencyData!.sell_rate;
          details = `${inputAmount.toFixed(2)} ${sourceCurrency} × ${sourceCurrencyData!.buy_rate.toFixed(2)} = ${shekelAmount.toFixed(2)} شيقل ÷ ${targetCurrencyData!.sell_rate.toFixed(2)} = ${result.toFixed(2)} ${targetCurrency}`;
        }
      }
    }

    if (side === 'left') {
      setToAmount(result.toFixed(2));
    } else {
      setFromAmount(result.toFixed(2));
    }

    setCalculationDetails(details);
  };

  const handleFromAmountChange = (text: string) => {
    setFromAmount(text);
    calculateConversion(text, 'left');
    resetInactivityTimer();
  };

  const handleToAmountChange = (text: string) => {
    setToAmount(text);
    calculateConversion(text, 'right');
    resetInactivityTimer();
  };

  const cycleCurrency = (currentCurrency: string, isFromCurrency: boolean) => {
    const allCurrenciesWithILS = [
      { code: 'ILS', name_ar: 'شيقل إسرائيلي' },
      ...allCurrencies.filter(c => c.is_active)
    ];

    const currentIndex = allCurrenciesWithILS.findIndex(c => c.code === currentCurrency);
    const nextIndex = (currentIndex + 1) % allCurrenciesWithILS.length;
    const nextCurrency = allCurrenciesWithILS[nextIndex].code;

    if (isFromCurrency) {
      setFromCurrency(nextCurrency);
      if (fromAmount) {
        calculateConversion(fromAmount, 'left');
      }
    } else {
      setToCurrency(nextCurrency);
      if (fromAmount) {
        calculateConversion(fromAmount, 'left');
      }
    }
    resetInactivityTimer();
  };

  const swapCurrencies = () => {
    const tempCurrency = fromCurrency;
    const tempAmount = fromAmount;

    setFromCurrency(toCurrency);
    setToCurrency(tempCurrency);
    setFromAmount(toAmount);
    setToAmount(tempAmount);

    if (toAmount) {
      calculateConversion(toAmount, 'left');
    }
    resetInactivityTimer();
  };

  const handleProceedToTransaction = async () => {
    try {
      console.log('🔄 بدء عملية المتابعة للمعاملة...');
      console.log('📊 بيانات الآلة الحاسبة:', { fromCurrency, toCurrency, fromAmount, toAmount });

      // إلغاء مؤقت الخمول قبل الانتقال
      clearInactivityTimer();

      const calculatorTransactionData = {
        fromCurrency,
        toCurrency,
        fromAmount,
        toAmount,
        calculationDetails,
        timestamp: new Date().toISOString(),
        isFromCalculator: true
      };

      await AsyncStorage.setItem('fromCalculator', 'true');
      await AsyncStorage.setItem('calculatorData', JSON.stringify(calculatorTransactionData));
      await AsyncStorage.setItem('calculatorTransactionReady', 'true');

      console.log('✅ تم حفظ بيانات الآلة الحاسبة:', calculatorTransactionData);

      // استخدام replace بدلاً من push لإزالة الآلة الحاسبة من الـ stack
      router.replace('/(tabs)/customer-info');
    } catch (error) {
      console.error('❌ خطأ في حفظ بيانات الآلة الحاسبة:', error);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.loadingText}>
            {language === 'ar' && 'جاري التحميل...'}
            {language === 'he' && 'טוען...'}
            {language === 'en' && 'Loading...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.title}>
          {language === 'ar' && 'آلة حاسبة العملات'}
          {language === 'he' && 'מחשבון מטבעות'}
          {language === 'en' && 'Currency Calculator'}
        </Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={true}
        contentContainerStyle={{ paddingBottom: 20 }}
        onTouchStart={resetInactivityTimer}
        onScroll={resetInactivityTimer}
        scrollEventThrottle={400}
      >
        <View style={styles.currencySection}>
          <Text style={styles.sectionLabel}>
            {language === 'ar' && 'اختيار العملات'}
            {language === 'he' && 'בחירת מטבעות'}
            {language === 'en' && 'Select Currencies'}
          </Text>
          <View style={styles.currencySelectionRow}>
            <TouchableOpacity
              style={styles.currencyButton}
              onPress={() => cycleCurrency(fromCurrency, true)}
            >
              <Text style={styles.currencyLabel}>
                {language === 'ar' && 'تدفع بعملة'}
                {language === 'he' && 'אתה משלם'}
                {language === 'en' && 'You pay'}
              </Text>
              <Text style={styles.currencyButtonCode}>{fromCurrency}</Text>
              <Text style={styles.currencyButtonName}>
                {fromCurrency === 'ILS' ? (
                  language === 'ar' ? 'شيقل إسرائيلي' :
                  language === 'he' ? 'שקל ישראלי' :
                  'Israeli Shekel'
                ) : (
                  language === 'ar' ? allCurrencies.find(c => c.code === fromCurrency)?.name_ar :
                  language === 'he' ? allCurrencies.find(c => c.code === fromCurrency)?.name_he :
                  allCurrencies.find(c => c.code === fromCurrency)?.name_en
                ) || fromCurrency}
              </Text>
              <View style={styles.tapHintContainer}>
                <Text style={styles.tapHintEmoji}>👆</Text>
                <Text style={styles.tapHint}>
                  {language === 'ar' && 'اضغط لتبديل العملة'}
                  {language === 'he' && 'לחץ להחלפת מטבע'}
                  {language === 'en' && 'Tap to switch currency'}
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.swapButton}
              onPress={swapCurrencies}
            >
              <Text style={styles.swapButtonText}>⇄</Text>
              <Text style={styles.swapButtonLabel}>
                {language === 'ar' && 'تبديل'}
                {language === 'he' && 'החלף'}
                {language === 'en' && 'Swap'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.currencyButton}
              onPress={() => cycleCurrency(toCurrency, false)}
            >
              <Text style={styles.currencyLabel}>
                {language === 'ar' && 'تأخذ العملة'}
                {language === 'he' && 'אתה מקבל'}
                {language === 'en' && 'You receive'}
              </Text>
              <Text style={styles.currencyButtonCode}>{toCurrency}</Text>
              <Text style={styles.currencyButtonName}>
                {toCurrency === 'ILS' ? (
                  language === 'ar' ? 'شيقل إسرائيلي' :
                  language === 'he' ? 'שקל ישראלי' :
                  'Israeli Shekel'
                ) : (
                  language === 'ar' ? allCurrencies.find(c => c.code === toCurrency)?.name_ar :
                  language === 'he' ? allCurrencies.find(c => c.code === toCurrency)?.name_he :
                  allCurrencies.find(c => c.code === toCurrency)?.name_en
                ) || toCurrency}
              </Text>
              <View style={styles.tapHintContainer}>
                <Text style={styles.tapHintEmoji}>👆</Text>
                <Text style={styles.tapHint}>
                  {language === 'ar' && 'اضغط لتبديل العملة'}
                  {language === 'he' && 'לחץ להחלפת מטבע'}
                  {language === 'en' && 'Tap to switch currency'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.currencySection}>
          <Text style={styles.sectionLabel}>
            {language === 'ar' && 'المبالغ'}
            {language === 'he' && 'סכומים'}
            {language === 'en' && 'Amounts'}
          </Text>
          <View style={styles.amountInputRow}>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={styles.currencyLabel}>{fromCurrency}</Text>
              <TextInput
                style={styles.amountInput}
                value={fromAmount}
                onChangeText={handleFromAmountChange}
                onFocus={resetInactivityTimer}
                onKeyPress={resetInactivityTimer}
                placeholder="0.00"
                keyboardType="decimal-pad"
                placeholderTextColor="#9CA3AF"
              />
            </View>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={styles.currencyLabel}>{toCurrency}</Text>
              <TextInput
                style={styles.amountInput}
                value={toAmount}
                onChangeText={handleToAmountChange}
                onFocus={resetInactivityTimer}
                onKeyPress={resetInactivityTimer}
                placeholder="0.00"
                keyboardType="decimal-pad"
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>
        </View>

        {calculationDetails && (
          <View style={styles.calculationDetails}>
            <Text style={styles.calculationText}>{calculationDetails}</Text>
          </View>
        )}

        <View style={styles.ratesInfo}>
          {fromCurrency !== 'ILS' && (
            <Text style={styles.rateInfoText}>
              {fromCurrency}: {language === 'ar' ? 'شراء' : language === 'he' ? 'קנייה' : 'Buy'} {allCurrencies.find(c => c.code === fromCurrency)?.buy_rate?.toFixed(2) || 'N/A'} |
              <Text>{language === 'ar' ? 'بيع' : language === 'he' ? 'מכירה' : 'Sell'} {allCurrencies.find(c => c.code === fromCurrency)?.sell_rate?.toFixed(2) || 'N/A'}</Text>
            </Text>
          )}
          {toCurrency !== 'ILS' && (
            <Text style={styles.rateInfoText}>
              {toCurrency}: {language === 'ar' ? 'شراء' : language === 'he' ? 'קנייה' : 'Buy'} {allCurrencies.find(c => c.code === toCurrency)?.buy_rate?.toFixed(2) || 'N/A'} |
              <Text>{language === 'ar' ? 'بيع' : language === 'he' ? 'מכירה' : 'Sell'} {allCurrencies.find(c => c.code === toCurrency)?.sell_rate?.toFixed(2) || 'N/A'}</Text>
            </Text>
          )}
        </View>

        {fromAmount && toAmount && (
          <TouchableOpacity
            style={styles.proceedButton}
            onPress={handleProceedToTransaction}
          >
            <Text style={styles.proceedButtonText}>
              {language === 'ar' && 'المتابعة للمعاملة'}
              {language === 'he' && 'המשך לעסקה'}
              {language === 'en' && 'Proceed to Transaction'}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0369A1',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  backButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  placeholder: {
    width: 30,
  },
  scrollContainer: {
    flex: 1,
    padding: 15,
  },
  currencySection: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 10,
    textAlign: 'center',
  },
  currencySelectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  currencyButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    minHeight: 100,
    justifyContent: 'center',
  },
  currencyButtonCode: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0369A1',
    marginBottom: 5,
  },
  currencyButtonName: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 5,
  },
  currencyLabel: {
    fontSize: 11,
    color: '#0369A1',
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tapHintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 8,
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
  },
  tapHintEmoji: {
    fontSize: 14,
  },
  tapHint: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0369A1',
    textAlign: 'center',
  },
  swapButton: {
    minWidth: 65,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: '#0369A1',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  swapButtonText: {
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginBottom: 2,
  },
  swapButtonLabel: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 2,
  },
  amountInputRow: {
    flexDirection: 'row',
    gap: 15,
  },
  currencyLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#6B7280',
    marginBottom: 5,
  },
  amountInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    width: '100%',
    color: '#1F2937',
  },
  calculationDetails: {
    backgroundColor: '#EFF6FF',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  calculationText: {
    fontSize: 12,
    color: '#1E40AF',
    textAlign: 'center',
    lineHeight: 18,
  },
  ratesInfo: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
  },
  rateInfoText: {
    fontSize: 12,
    color: '#4B5563',
    marginBottom: 5,
    textAlign: 'center',
  },
  proceedButton: {
    backgroundColor: '#059669',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  proceedButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
