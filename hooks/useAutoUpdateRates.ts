import { useEffect, useRef } from 'react';
import { Platform, Dimensions } from 'react-native';
import { exchangeRateAPI } from '@/lib/exchangeRateAPI';
import { currencyUpdateLogService } from '@/lib/supabase';

export function useAutoUpdateRates() {
  const hasRunUpdate = useRef(false);

  useEffect(() => {
    const checkAndUpdate = async () => {
      console.log('=== بدء فحص التحديث التلقائي للعملات ===');

      if (hasRunUpdate.current) {
        console.log('⏭️ التحديث تم تنفيذه مسبقاً في هذه الجلسة');
        return;
      }

      console.log(`📱 المنصة الحالية: ${Platform.OS}`);
      if (Platform.OS !== 'web') {
        console.log('⏭️ التحديث التلقائي متاح فقط على الويب');
        return;
      }

      const { width } = Dimensions.get('window');
      const isLargeScreen = width >= 768;
      console.log(`📐 عرض الشاشة: ${width}px | شاشة كبيرة: ${isLargeScreen ? 'نعم' : 'لا'}`);

      if (!isLargeScreen) {
        console.log('⏭️ الشاشة صغيرة، لن يتم التحديث التلقائي');
        return;
      }

      console.log('🔍 فحص حالة التحديث التلقائي من قاعدة البيانات...');
      const autoUpdateEnabled = await currencyUpdateLogService.getAutoUpdateStatus();
      console.log(`📊 نتيجة الفحص: ${autoUpdateEnabled ? '✅ مفعّل' : '❌ معطّل'}`);

      if (!autoUpdateEnabled) {
        console.log('⏭️ التحديث التلقائي معطّل من قاعدة البيانات');
        console.log('💡 لتفعيل التحديث التلقائي: اذهب إلى إعدادات الشركة');
        return;
      }

      console.log('🖥️ ✅ جميع الشروط متحققة - سيتم تحديث العملات تلقائياً');

      try {
        hasRunUpdate.current = true;
        console.log('🚀 بدء التحديث التلقائي للعملات...');

        const result = await exchangeRateAPI.updateCurrencyRatesInDatabase();

        if (result.success) {
          console.log(`✅✅✅ نجح التحديث! تم تحديث ${result.updatedCount} عملة بنجاح`);
        } else {
          console.error('❌ فشل تحديث العملات:', result.error);
        }
      } catch (error) {
        console.error('❌ خطأ في التحديث التلقائي للعملات:', error);
      }

      console.log('=== انتهى فحص التحديث التلقائي ===');
    };

    checkAndUpdate();
  }, []);
}
