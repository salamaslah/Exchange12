import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function WaitingScreen() {
  const [language, setLanguage] = useState<'ar' | 'he' | 'en'>('ar');
  const [countdown, setCountdown] = useState(10);
  const router = useRouter();

  // تحميل اللغة مرة واحدة فقط
  useEffect(() => {
    loadLanguage();
  }, []);

  // العد التنازلي والانتقال - منفصل تماماً
  useEffect(() => {
    console.log('🚀 بدء العد التنازلي من 10 ثواني');

    const interval = setInterval(() => {
      setCountdown((prevCount) => {
        const newCount = prevCount - 1;
        console.log(`⏱️ العد التنازلي: ${newCount}`);
        return newCount;
      });
    }, 1000);

    // مؤقت منفصل للانتقال بعد 10 ثواني
    const navigationTimer = setTimeout(() => {
      console.log('✅ انتهى العد التنازلي - العودة لصفحة الأسعار');
      router.replace('/(tabs)/prices');
    }, 10000);

    return () => {
      console.log('🧹 تنظيف المؤقتات');
      clearInterval(interval);
      clearTimeout(navigationTimer);
    };
  }, []);

  const loadLanguage = async () => {
    try {
      const savedLanguage = await AsyncStorage.getItem('selectedLanguage');
      if (savedLanguage && ['ar', 'he', 'en'].includes(savedLanguage)) {
        setLanguage(savedLanguage as 'ar' | 'he' | 'en');
      }
    } catch (error) {
      console.error('Error loading language:', error);
    }
  };

  const getText = () => {
    switch (language) {
      case 'ar':
        return {
          title: 'انتظر دورك',
          message: 'انتقل للشباك لتلقي الخدمة المطلوبة',
          thankYou: 'شكراً لك'
        };
      case 'he':
        return {
          title: 'המתן לתורך',
          message: 'עבור לדלפק לקבלת השירות המבוקש',
          thankYou: 'תודה לך'
        };
      case 'en':
        return {
          title: 'Wait Your Turn',
          message: 'Go to the counter to receive the requested service',
          thankYou: 'Thank You'
        };
    }
  };

  const text = getText();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* أيقونة ساعة الانتظار */}
        <View style={styles.iconContainer}>
          <View style={styles.clockCircle}>
            <Text style={styles.clockText}>⏰</Text>
          </View>
        </View>

        {/* النص الرئيسي */}
        <Text style={[
          styles.title,
          language === 'ar' ? styles.rtl : styles.ltr
        ]}>
          {text.title}
        </Text>

        <Text style={[
          styles.message,
          language === 'ar' ? styles.rtl : styles.ltr
        ]}>
          {text.message}
        </Text>

        {/* شكراً لك */}
        <Text style={[
          styles.thankYou,
          language === 'ar' ? styles.rtl : styles.ltr
        ]}>
          {text.thankYou}
        </Text>

        {/* العد التنازلي */}
        <View style={styles.countdownContainer}>
          <Text style={styles.countdownText}>{countdown}</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e'
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20
  },
  iconContainer: {
    marginBottom: 40
  },
  clockCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#16213e',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#0f3460'
  },
  clockText: {
    fontSize: 60
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 20,
    textAlign: 'center'
  },
  message: {
    fontSize: 24,
    color: '#e94560',
    marginBottom: 40,
    textAlign: 'center',
    lineHeight: 36
  },
  thankYou: {
    fontSize: 28,
    color: '#4ecca3',
    marginBottom: 40,
    textAlign: 'center',
    fontWeight: '600'
  },
  countdownContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#0f3460',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e94560'
  },
  countdownText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#ffffff'
  },
  rtl: {
    textAlign: 'right'
  },
  ltr: {
    textAlign: 'left'
  }
});
