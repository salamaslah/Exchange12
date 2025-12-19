import { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'expo-router';
import { AppState, AppStateStatus } from 'react-native';

const INACTIVITY_TIMEOUT = 10000;

const ADMIN_PAGES = [
  '/(tabs)/staff',
  '/(tabs)/accounting',
  '/(tabs)/company-settings',
  '/(tabs)/currency-management',
  '/(tabs)/transactions-management',
  '/(tabs)/treasury',
  '/(tabs)/ads-management',
  '/login',
  '/treasury-management'
];

export function useInactivityTimer() {
  const router = useRouter();
  const pathname = usePathname();
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const appState = useRef(AppState.currentState);

  const isHomePage = pathname === '/(tabs)/prices' || pathname === '/';
  const isAdminPage = ADMIN_PAGES.includes(pathname);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const resetTimer = () => {
    if (isHomePage || isAdminPage) {
      return;
    }

    clearTimer();

    timerRef.current = setTimeout(() => {
      console.log('⏰ انتهى وقت النشاط - العودة للصفحة الرئيسية');
      router.replace('/(tabs)/prices');
    }, INACTIVITY_TIMEOUT);
  };

  useEffect(() => {
    if (isHomePage || isAdminPage) {
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
  }, [pathname, isHomePage, isAdminPage]);

  return { resetTimer };
}
