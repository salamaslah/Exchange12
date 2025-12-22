import { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'expo-router';
import { AppState, AppStateStatus } from 'react-native';

const INACTIVITY_TIMEOUT = 10000;

// الصفحات التي تعود للصفحة الرئيسية بعد عدم النشاط
const PAGES_WITH_TIMER = [
  '/calculator',
  '/(tabs)/customer-info'
];

export function useInactivityTimer() {
  const router = useRouter();
  const pathname = usePathname();
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const appState = useRef(AppState.currentState);

  const shouldUseTimer = PAGES_WITH_TIMER.includes(pathname);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const resetTimer = () => {
    if (!shouldUseTimer) {
      return;
    }

    clearTimer();

    timerRef.current = setTimeout(() => {
      console.log('⏰ انتهى وقت النشاط - العودة للصفحة الرئيسية');
      router.replace('/(tabs)/prices');
    }, INACTIVITY_TIMEOUT);
  };

  useEffect(() => {
    if (!shouldUseTimer) {
      clearTimer();
      return;
    }

    resetTimer();

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        resetTimer();
      } else if (nextAppState.match(/inactive|background/)) {
        clearTimer();
      }
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      clearTimer();
      subscription?.remove();
    };
  }, [pathname, shouldUseTimer]);

  return { resetTimer };
}
