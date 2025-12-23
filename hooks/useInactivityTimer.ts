import { useEffect, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'expo-router';
import { AppState, AppStateStatus } from 'react-native';

const INACTIVITY_TIMEOUT = 10000;

// الصفحات التي تعود للصفحة الرئيسية بعد عدم النشاط
const PAGES_WITH_TIMER = [
  '/calculator',
  '/(tabs)/customer-info',
  '/customer-info'
];

export function useInactivityTimer() {
  const router = useRouter();
  const pathname = usePathname();
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const appState = useRef(AppState.currentState);
  const routerRef = useRef(router);
  const pathnameRef = useRef(pathname);

  routerRef.current = router;
  pathnameRef.current = pathname;

  const shouldUseTimer = PAGES_WITH_TIMER.includes(pathname);

  console.log('🔍 useInactivityTimer - المسار الحالي:', pathname);
  console.log('🔍 هل المؤقت مفعل؟', shouldUseTimer);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const resetTimer = useCallback(() => {
    const currentPathname = pathnameRef.current;
    const currentRouter = routerRef.current;
    const isTimerEnabled = PAGES_WITH_TIMER.includes(currentPathname);

    if (!isTimerEnabled) {
      console.log('⚠️ المؤقت غير مفعل لهذه الصفحة:', currentPathname);
      return;
    }

    console.log('⏱️ إعادة تعيين مؤقت الخمول - 10 ثوانٍ');
    clearTimer();

    timerRef.current = setTimeout(() => {
      console.log('⏰ انتهى وقت النشاط - العودة للصفحة الرئيسية');
      currentRouter.replace('/(tabs)/prices');
    }, INACTIVITY_TIMEOUT);
  }, [clearTimer]);

  useEffect(() => {
    console.log('🔧 useEffect - shouldUseTimer:', shouldUseTimer, 'pathname:', pathname);

    if (!shouldUseTimer) {
      console.log('❌ المؤقت غير مفعل - إيقاف المؤقت');
      clearTimer();
      return;
    }

    console.log('✅ المؤقت مفعل - بدء المؤقت تلقائياً');
    resetTimer();

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      const isTimerEnabled = PAGES_WITH_TIMER.includes(pathnameRef.current);

      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active' &&
        isTimerEnabled
      ) {
        console.log('📱 التطبيق عاد للواجهة - إعادة تشغيل المؤقت');
        resetTimer();
      } else if (nextAppState.match(/inactive|background/)) {
        console.log('📱 التطبيق في الخلفية - إيقاف المؤقت');
        clearTimer();
      }
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      console.log('🧹 تنظيف المؤقت عند إلغاء تحميل الصفحة');
      clearTimer();
      subscription?.remove();
    };
  }, [pathname, shouldUseTimer, clearTimer, resetTimer]);

  return { resetTimer };
}
