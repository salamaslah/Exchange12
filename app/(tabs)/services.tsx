import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, SafeAreaView } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';

interface Service {
  id: string;
  service_number: number;
  service_name: string;
  service_name_he?: string;
  service_name_en?: string;
}

export default function ServicesScreen() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState<'ar' | 'he' | 'en'>('ar');
  const router = useRouter();

  useEffect(() => {
    loadServices();
  }, []);

  // مراقبة تغيير اللغة عند تفعيل الصفحة
  useFocusEffect(
    React.useCallback(() => {
      console.log('🔄 تم تفعيل صفحة الخدمات - فحص اللغة...');
      clearPreviousServiceData();
      loadLanguage();
      // إعادة تحميل الخدمات عند تغيير اللغة
      loadServices();
    }, [])
  );

  const clearPreviousServiceData = async () => {
    try {
      console.log('🧹 مسح بيانات الخدمة والزبون السابقة...');
      
      // مسح بيانات الخدمة المختارة
      await AsyncStorage.removeItem('selectedServiceNumber');
      await AsyncStorage.removeItem('selectedServiceName');
      await AsyncStorage.removeItem('selectedServiceNameHe');
      await AsyncStorage.removeItem('selectedServiceNameEn');
      
      // مسح بيانات الزبون الحالي
      await AsyncStorage.removeItem('currentCustomerId');
      await AsyncStorage.removeItem('currentCustomerName');
      await AsyncStorage.removeItem('currentCustomerPhone');
      await AsyncStorage.removeItem('currentCustomerBirthDate');
      await AsyncStorage.removeItem('currentCustomerImage1');
      await AsyncStorage.removeItem('currentCustomerImage2');
      
      // مسح بيانات الآلة الحاسبة إذا كانت موجودة
      await AsyncStorage.removeItem('fromCalculator');
      await AsyncStorage.removeItem('calculatorData');
      
      console.log('✅ تم مسح جميع البيانات السابقة - البدء من جديد');
    } catch (error) {
      console.error('❌ خطأ في مسح البيانات السابقة:', error);
    }
  };

  const loadLanguage = async () => {
    try {
      const savedLanguage = await AsyncStorage.getItem('selectedLanguage');
      const languageChanged = await AsyncStorage.getItem('languageChanged');
      
      console.log('🔍 فحص اللغة المحفوظة في صفحة الخدمات:', savedLanguage);
      console.log('🔔 فحص إشعار تغيير اللغة:', languageChanged);
      
      if (savedLanguage && ['ar', 'he', 'en'].includes(savedLanguage)) {
        if (savedLanguage !== language) {
          console.log(`✅ تحديث اللغة في صفحة الخدمات من ${language} إلى ${savedLanguage}`);
          setLanguage(savedLanguage as 'ar' | 'he' | 'en');
        }
      }
      
      // إزالة إشعار تغيير اللغة بعد المعالجة
      if (languageChanged === 'true') {
        await AsyncStorage.removeItem('languageChanged');
        console.log('🔔 تم معالجة إشعار تغيير اللغة');
      }
    } catch (error) {
      console.log('خطأ في تحميل اللغة:', error);
    }
  };

  const loadServices = async () => {
    try {
      console.log('🔄 جلب جميع الخدمات من جدول services في قاعدة البيانات...');

      const { data, error } = await supabase
        .from('services')
        .select('*')
        .neq('service_number', 8) // إخفاء خدمة صرافة أموال (رقم 8)
        .order('service_number');

      if (error) {
        console.error('❌ خطأ في جلب الخدمات من قاعدة البيانات:', error);
        throw error;
      }

      console.log(`✅ تم جلب ${data?.length || 0} خدمة من جدول services (بدون صرافة أموال)`);
      console.log('📊 الخدمات المُحملة:', data);

      setServices(data || []);
    } catch (error) {
      console.error('❌ خطأ في تحميل الخدمات:', error);
      
      // في حالة الخطأ، استخدم الخدمات الافتراضية (بدون صرافة الأموال)
      const defaultServices = [
        { id: '1', service_number: 1, service_name: 'إنشاء فيزا', service_name_he: 'יצירת כרטיס', service_name_en: 'Create Card' },
        { id: '2', service_number: 2, service_name: 'تحويل للخارج', service_name_he: 'העברה לחו"ל', service_name_en: 'International Transfer' },
        { id: '3', service_number: 3, service_name: 'سحب حوالة', service_name_he: 'משיכת העברה', service_name_en: 'Receive Transfer' },
        { id: '4', service_number: 4, service_name: 'صرافة شيكات', service_name_he: 'פדיון צ\'קים', service_name_en: 'Check Cashing' },
        { id: '5', service_number: 5, service_name: 'تحويل لحساب بنك صاحب المحل', service_name_he: 'העברה לחשבון הבנק', service_name_en: 'Bank Account Transfer' },
        { id: '6', service_number: 6, service_name: 'سحب من الفيزا', service_name_he: 'משיכה מכרטיס', service_name_en: 'Card Withdrawal' },
        { id: '7', service_number: 7, service_name: 'إيداع في الفيزا', service_name_he: 'הפקדה בכרטיס', service_name_en: 'Card Deposit' }
      ];
      
      console.log('📱 استخدام الخدمات الافتراضية كبديل');
      setServices(defaultServices);
    } finally {
      setLoading(false);
    }
  };

  const getServiceIcon = (serviceNumber: number) => {
    const icons: { [key: number]: string } = {
      1: '💳', // إنشاء فيزا
      2: '🌍', // تحويل للخارج
      3: '📨', // سحب حوالة
      4: '📝', // صرافة شيكات
      5: '🏦', // تحويل لحساب بنك
      6: '💳', // سحب من الفيزا
      7: '💰'  // إيداع في الفيزا
    };
    return icons[serviceNumber] || '🔧';
  };

  const getServiceRoute = (serviceNumber: number) => {
    const routes: { [key: number]: string } = {
      1: '/services/visa-creation',
      2: '/services/transfer',
      3: '/services/remittance',
      4: '/services/check',
      5: '/services/bank',
      6: '/services/withdraw',
      7: '/services/deposit'
    };
    return routes[serviceNumber] || '/services/exchange';
  };

  const getServiceNameInLanguage = (serviceNumber: number, lang: 'ar' | 'he' | 'en'): string => {
    const serviceNames = {
      1: { ar: 'إنشاء فيزا', he: 'יצירת כרטיס', en: 'Create Card' },
      2: { ar: 'تحويل للخارج', he: 'העברה לחו"ל', en: 'International Transfer' },
      3: { ar: 'سحب حوالة', he: 'משיכת העברה', en: 'Receive Transfer' },
      4: { ar: 'صرافة شيكات', he: 'פדיון צ\'קים', en: 'Check Cashing' },
      5: { ar: 'تحويل لحساب بنك صاحب المحل', he: 'העברה לחשבון הבנק', en: 'Bank Account Transfer' },
      6: { ar: 'سحب من الفيزا', he: 'משיכה מכרטיס', en: 'Card Withdrawal' },
      7: { ar: 'إيداع في الفيزا', he: 'הפקדה בכרטיס', en: 'Card Deposit' },
      8: { ar: 'صرافة أموال', he: 'החלפת כספים', en: 'Money Exchange' }
    };

    return serviceNames[serviceNumber as keyof typeof serviceNames]?.[lang] || 'خدمة غير معروفة';
  };

  const getServiceName = (service: Service) => {
    console.log(`🔤 عرض اسم الخدمة ${service.service_number} باللغة ${language}`);
    console.log('📊 بيانات الخدمة:', {
      ar: service.service_name,
      he: service.service_name_he,
      en: service.service_name_en
    });
    
    switch (language) {
      case 'he':
        const heName = service.service_name_he || service.service_name;
        console.log(`✅ عرض الاسم العبري: ${heName}`);
        return heName;
      case 'en':
        const enName = service.service_name_en || service.service_name;
        console.log(`✅ عرض الاسم الإنجليزي: ${enName}`);
        return enName;
      default:
        console.log(`✅ عرض الاسم العربي: ${service.service_name}`);
        return service.service_name;
    }
  };

  const handleServiceSelect = async (service: Service) => {
    const serviceName = getServiceName(service);
    console.log(`🔄 اختيار الخدمة: ${serviceName} (رقم ${service.service_number})`);
    
    // الانتقال لصفحة معلومات الزبون مع حفظ الخدمة المختارة
    await AsyncStorage.setItem('selectedServiceNumber', service.service_number.toString());
    await AsyncStorage.setItem('selectedServiceName', service.service_name);
    await AsyncStorage.setItem('selectedServiceNameHe', service.service_name_he || '');
    await AsyncStorage.setItem('selectedServiceNameEn', service.service_name_en || '');
    await AsyncStorage.setItem('selectedLanguage', language);
    
    // إزالة بيانات الآلة الحاسبة إذا كانت موجودة
    await AsyncStorage.removeItem('fromCalculator');
    await AsyncStorage.removeItem('calculatorData');
    
    console.log('💾 تم حفظ بيانات الخدمة المختارة:');
    console.log('- رقم الخدمة:', service.service_number);
    console.log('- اسم الخدمة (عربي):', service.service_name);
    console.log('- اسم الخدمة (عبري):', service.service_name_he);
    console.log('- اسم الخدمة (إنجليزي):', service.service_name_en);
    
    console.log(`📋 الانتقال لصفحة معلومات الزبون مع الخدمة المختارة: ${service.service_name}`);
    router.push('/(tabs)/customer-info');
  };

  const handleBackToPrices = () => {
    router.replace('/(tabs)/prices');
  };

  const getTextAlign = () => {
    return language === 'en' ? 'left' : 'right';
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.container, styles.centerContent]}>
          <Text style={styles.loadingText}>
            {language === 'ar' && 'جاري تحميل الخدمات من قاعدة البيانات...'}
            {language === 'he' && 'טוען שירותים ממסד הנתונים...'}
            {language === 'en' && 'Loading services from database...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { textAlign: getTextAlign() }]}>
            {language === 'ar' && 'الخدمات المتاحة'}
            {language === 'he' && 'שירותים זמינים'}
            {language === 'en' && 'Available Services'}
          </Text>
          <TouchableOpacity style={styles.backToPricesButton} onPress={handleBackToPrices}>
            <Text style={styles.backToPricesButtonText}>
              {language === 'ar' && 'العودة للأسعار'}
              {language === 'he' && 'חזרה למחירים'}
              {language === 'en' && 'Back to Prices'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.servicesContainer}>
          <Text style={[styles.servicesTitle, { textAlign: getTextAlign() }]}>
            {language === 'ar' && `الخدمات المتاحة (${services.length})`}
            {language === 'he' && `שירותים זמינים (${services.length})`}
            {language === 'en' && `Available Services (${services.length})`}
          </Text>

          {services.length === 0 ? (
            <View style={styles.noServicesContainer}>
              <Text style={[styles.noServicesText, { textAlign: getTextAlign() }]}>
                {language === 'ar' && 'لا توجد خدمات متاحة حالياً'}
                {language === 'he' && 'אין שירותים זמינים כרגע'}
                {language === 'en' && 'No services available currently'}
              </Text>
            </View>
          ) : (
            services.map((service) => (
              <TouchableOpacity
                key={service.id}
                style={styles.serviceCard}
                onPress={() => handleServiceSelect(service)}
              >
                <View style={styles.serviceContent}>
                  <Text style={styles.serviceIcon}>{getServiceIcon(service.service_number)}</Text>
                  <View style={styles.serviceTextContainer}>
                    <Text style={[styles.serviceTitle, { textAlign: getTextAlign() }]}>
                      {getServiceName(service)}
                    </Text>
                    <Text style={[styles.serviceNumber, { textAlign: getTextAlign() }]}>
                      {language === 'ar' && `خدمة رقم ${service.service_number}`}
                      {language === 'he' && `שירות מספר ${service.service_number}`}
                      {language === 'en' && `Service #${service.service_number}`}
                    </Text>
                  </View>
                  <Text style={styles.arrow}>
                    {language === 'en' ? '→' : '←'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* معلومات إضافية */}
        <View style={styles.infoContainer}>
          <Text style={[styles.infoTitle, { textAlign: getTextAlign() }]}>
            {language === 'ar' && 'ℹ️ معلومات:'}
            {language === 'he' && 'ℹ️ מידע:'}
            {language === 'en' && 'ℹ️ Information:'}
          </Text>
          <Text style={[styles.infoText, { textAlign: getTextAlign() }]}>
            {language === 'ar' && `• تم تحميل ${services.length} خدمة من قاعدة البيانات`}
            {language === 'he' && `• נטענו ${services.length} שירותים ממסד הנתונים`}
            {language === 'en' && `• Loaded ${services.length} services from database`}
          </Text>
          <Text style={[styles.infoText, { textAlign: getTextAlign() }]}>
            {language === 'ar' && '• اختر الخدمة المطلوبة لإدخال بيانات الزبون'}
            {language === 'he' && '• בחר את השירות הנדרש להכנסת פרטי הלקוח'}
            {language === 'en' && '• Select the required service to enter customer details'}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FEF7FF',
  },
  scrollContainer: {
    flex: 1,
    padding: 20,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#7C3AED',
    flex: 1,
  },
  backToPricesButton: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
  },
  backToPricesButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  servicesContainer: {
    marginBottom: 20,
  },
  servicesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 15,
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
  },
  noServicesContainer: {
    backgroundColor: '#FEF3C7',
    padding: 30,
    borderRadius: 12,
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  noServicesText: {
    fontSize: 16,
    color: '#92400E',
    fontWeight: '600',
  },
  serviceCard: {
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    borderLeftWidth: 4,
    borderLeftColor: '#7C3AED',
  },
  serviceContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  serviceIcon: {
    fontSize: 24,
    marginRight: 15,
    marginLeft: 15,
  },
  serviceTextContainer: {
    flex: 1,
  },
  serviceTitle: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '600',
    marginBottom: 4,
  },
  serviceNumber: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  arrow: {
    fontSize: 18,
    color: '#7C3AED',
    fontWeight: 'bold',
  },
  infoContainer: {
    backgroundColor: '#EFF6FF',
    padding: 20,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E40AF',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#1E40AF',
    marginBottom: 8,
    lineHeight: 20,
  },
});