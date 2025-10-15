import { useEffect, useRef } from 'react';
import { Platform, Dimensions } from 'react-native';
import { exchangeRateAPI } from '@/lib/exchangeRateAPI';
import { currencyUpdateLogService } from '@/lib/supabase';

export function useAutoUpdateRates() {
  const hasRunUpdate = useRef(false);

  useEffect(() => {
    const checkAndUpdate = async () => {
      if (hasRunUpdate.current) {
        console.log('⏭️ التحديث تم تنفيذه مسبقاً في هذه الجلسة');
        return;
      }

      if (Platform.OS !== 'web') {
        console.log('⏭️ التحديث التلقائي متاح فقط على الويب');
        return;
      }

      const { width } = Dimensions.get('window');
      const isLargeScreen = width >= 768;

      if (!isLargeScreen) {
        console.log('⏭️ الشاشة صغيرة، لن يتم التحديث التلقائي');
        return;
      }

      const autoUpdateEnabled = await currencyUpdateLogService.getAutoUpdateStatus();
      if (!autoUpdateEnabled) {
        console.log('⏭️ القراءة التلقائية للأسعار معطلة من قاعدة البيانات');
        return;
      }

      console.log('🖥️ تم اكتشاف شاشة كبيرة - سيتم تحديث العملات تلقائياً');

      try {
        hasRunUpdate.current = true;

        const result = await exchangeRateAPI.updateCurrencyRatesInDatabase();

        if (result.success) {
          console.log(`✅ تم تحديث ${result.updatedCount} عملة بنجاح`);
        } else {
          console.error('❌ فشل تحديث العملات:', result.error);
        }
      } catch (error) {
        console.error('❌ خطأ في التحديث التلقائي للعملات:', error);
      }
    };

    checkAndUpdate();
  }, []);
}
