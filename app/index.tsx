import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { exchangeShopService } from '@/lib/supabase';

export default function IndexScreen() {
  const [ready, setReady] = useState(false);
  const [goTo, setGoTo] = useState<string>('/login');

  useEffect(() => {
    (async () => {
      try {
        const savedUsername = await AsyncStorage.getItem('savedShopUsername');
        const savedPassword = await AsyncStorage.getItem('savedShopPassword');

        if (savedUsername && savedPassword) {
          const result = await exchangeShopService.login(savedUsername, savedPassword);
          if (result.success && result.shop) {
            await AsyncStorage.setItem('isLoggedIn', 'true');
            await AsyncStorage.setItem('loginTime', new Date().toISOString());
            await AsyncStorage.setItem('shopUsername', result.shop.username);
            await AsyncStorage.setItem('shopId', result.shop.id);
            await AsyncStorage.setItem('shopNameAr', result.shop.shop_name_ar || '');
            await AsyncStorage.setItem('shopNameHe', result.shop.shop_name_he || '');
            await AsyncStorage.setItem('shopNameEn', result.shop.shop_name_en || '');
            if (result.isSuperAdmin) {
              await AsyncStorage.setItem('isSuperAdmin', 'true');
              setGoTo('/super-admin');
            } else {
              await AsyncStorage.setItem('isSuperAdmin', 'false');
              setGoTo('/(tabs)/prices');
            }
            return;
          }
        }

        const isLoggedIn = await AsyncStorage.getItem('isLoggedIn');
        if (isLoggedIn === 'true') {
          setGoTo('/(tabs)/prices');
          return;
        }

        setGoTo('/login');
      } catch {
        setGoTo('/login');
      } finally {
        setReady(true);
      }
    })();
  }, []);

  if (!ready) return null;
  return <Redirect href={goTo as any} />;
}
