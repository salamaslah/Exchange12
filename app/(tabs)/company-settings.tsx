import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, SafeAreaView, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { companySettingsService, workingHoursService } from '@/lib/supabase';

interface CompanyInfo {
  name_ar: string;
  name_he: string;
  name_en: string;
  address_ar: string;
  address_he: string;
  address_en: string;
  phone1: string;
  phone2: string;
  phone3: string;
  morning_start: string;
  morning_end: string;
  evening_start: string;
  evening_end: string;
  work_days: string[];
}

const DAYS_OF_WEEK = [
  { key: 'sunday', ar: 'الأحد', he: 'ראשון', en: 'Sunday' },
  { key: 'monday', ar: 'الإثنين', he: 'שני', en: 'Monday' },
  { key: 'tuesday', ar: 'الثلاثاء', he: 'שלישי', en: 'Tuesday' },
  { key: 'wednesday', ar: 'الأربعاء', he: 'רביעי', en: 'Wednesday' },
  { key: 'thursday', ar: 'الخميس', he: 'חמישי', en: 'Thursday' },
  { key: 'friday', ar: 'الجمعة', he: 'שישי', en: 'Friday' },
  { key: 'saturday', ar: 'السبت', he: 'שבת', en: 'Saturday' }
];

export default function CompanySettingsScreen() {
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
    name_ar: 'نعامنة للصرافة',
    name_he: 'נעאמנה להמרות',
    name_en: 'Naamneh Exchange',
    address_ar: 'عرابة الشارع الرئيسي',
    address_he: 'ערבה הרחוב הראשי',
    address_en: 'Arraba Main Street',
    phone1: '05260000841',
    phone2: '',
    phone3: '',
    morning_start: '09:00',
    morning_end: '14:00',
    evening_start: '16:00',
    evening_end: '18:00',
    work_days: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'saturday']
  });

  const [screenData, setScreenData] = useState(Dimensions.get('window'));
  const router = useRouter();

  useEffect(() => {
    const onChange = (result: any) => {
      setScreenData(result.window);
    };

    const subscription = Dimensions.addEventListener('change', onChange);
    loadCompanyInfo();

    return () => subscription?.remove();
  }, []);

  const loadCompanyInfo = async () => {
    try {
      console.log('🔄 تحميل إعدادات الشركة من قاعدة البيانات...');
      
      // جلب إعدادات الشركة من قاعدة البيانات
      const settings = await companySettingsService.get();
      
      if (settings) {
        console.log('✅ تم تحميل إعدادات الشركة من قاعدة البيانات');
        
        // جلب أوقات العمل
        const workingHours = await workingHoursService.getByCompanyId(settings.id);
        const workDays = workingHours
          .filter(hour => hour.is_working_day)
          .map(hour => hour.day_of_week);
        
        const morningStart = workingHours.find(h => h.is_working_day)?.morning_start || '08:00';
        const morningEnd = workingHours.find(h => h.is_working_day)?.morning_end || '12:00';
        const eveningStart = workingHours.find(h => h.is_working_day)?.evening_start || '14:00';
        const eveningEnd = workingHours.find(h => h.is_working_day)?.evening_end || '18:00';
        
        setCompanyInfo({
          name_ar: settings.name_ar,
          name_he: settings.name_he,
          name_en: settings.name_en,
          address_ar: settings.address_ar,
          address_he: settings.address_he,
          address_en: settings.address_en,
          phone1: settings.phone1,
          phone2: settings.phone2 || '',
          phone3: settings.phone3 || '',
          morning_start: morningStart,
          morning_end: morningEnd,
          evening_start: eveningStart,
          evening_end: eveningEnd,
          work_days: workDays
        });
      } else {
        console.log('📝 لا توجد إعدادات محفوظة، استخدام القيم الافتراضية');
        
        // إنشاء إعدادات افتراضية في قاعدة البيانات
        const defaultSettings = {
          name_ar: companyInfo.name_ar,
          name_he: companyInfo.name_he,
          name_en: companyInfo.name_en,
          address_ar: companyInfo.address_ar,
          address_he: companyInfo.address_he,
          address_en: companyInfo.address_en,
          phone1: companyInfo.phone1,
          phone2: companyInfo.phone2,
          phone3: companyInfo.phone3
        };
        
        const newSettings = await companySettingsService.create(defaultSettings);
        console.log('✅ تم إنشاء إعدادات افتراضية في قاعدة البيانات');
        
        // إنشاء أوقات عمل افتراضية
        const defaultWorkingHours = DAYS_OF_WEEK.map(day => ({
          day_of_week: day.key,
          is_working_day: companyInfo.work_days.includes(day.key),
          morning_start: companyInfo.morning_start,
          morning_end: companyInfo.morning_end,
          evening_start: companyInfo.evening_start,
          evening_end: companyInfo.evening_end
        }));
        
        await workingHoursService.upsert(newSettings.id, defaultWorkingHours);
        console.log('✅ تم إنشاء أوقات عمل افتراضية في قاعدة البيانات');
      }
      
      // حفظ نسخة في التخزين المحلي للتوافق مع الإصدارات السابقة
      await AsyncStorage.setItem('companyInfo', JSON.stringify(companyInfo));
      
    } catch (error) {
      console.error('❌ خطأ في تحميل إعدادات الشركة:', error);
      
      // في حالة الخطأ، جرب التحميل من التخزين المحلي
      try {
        const savedInfo = await AsyncStorage.getItem('companyInfo');
        if (savedInfo) {
          setCompanyInfo(JSON.parse(savedInfo));
          console.log('✅ تم تحميل الإعدادات من التخزين المحلي كبديل');
        }
      } catch (localError) {
        console.log('خطأ في تحميل الإعدادات من التخزين المحلي:', localError);
      }
    }
  };

  const saveCompanyInfo = async () => {
    try {
      console.log('💾 حفظ إعدادات الشركة في قاعدة البيانات...');
      
      // جلب الإعدادات الحالية أو إنشاء جديدة
      let settings = await companySettingsService.get();
      
      const settingsData = {
        name_ar: companyInfo.name_ar,
        name_he: companyInfo.name_he,
        name_en: companyInfo.name_en,
        address_ar: companyInfo.address_ar,
        address_he: companyInfo.address_he,
        address_en: companyInfo.address_en,
        phone1: companyInfo.phone1,
        phone2: companyInfo.phone2,
        phone3: companyInfo.phone3
      };
      
      if (settings) {
        // تحديث الإعدادات الموجودة
        settings = await companySettingsService.update(settings.id, settingsData);
        console.log('✅ تم تحديث إعدادات الشركة في قاعدة البيانات');
      } else {
        // إنشاء إعدادات جديدة
        settings = await companySettingsService.create(settingsData);
        console.log('✅ تم إنشاء إعدادات الشركة في قاعدة البيانات');
      }
      
      // حفظ أوقات العمل
      const workingHoursData = DAYS_OF_WEEK.map(day => ({
        day_of_week: day.key,
        is_working_day: companyInfo.work_days.includes(day.key),
        morning_start: companyInfo.morning_start,
        morning_end: companyInfo.morning_end,
        evening_start: companyInfo.evening_start,
        evening_end: companyInfo.evening_end
      }));
      
      await workingHoursService.upsert(settings.id, workingHoursData);
      console.log('✅ تم حفظ أوقات العمل في قاعدة البيانات');
      
      // حفظ نسخة في التخزين المحلي للتوافق
      await AsyncStorage.setItem('companyInfo', JSON.stringify(companyInfo));
      
      Alert.alert(
        '✅ تم الحفظ بنجاح', 
        'تم حفظ معلومات الشركة وأوقات العمل في قاعدة البيانات بنجاح'
      );
      
    } catch (error) {
      console.error('❌ خطأ في حفظ الإعدادات:', error);
      Alert.alert(
        '❌ خطأ في الحفظ', 
        'حدث خطأ في حفظ المعلومات في قاعدة البيانات. يرجى المحاولة مرة أخرى.'
      );
    }
  };

  const toggleWorkDay = (day: string) => {
    const updatedDays = companyInfo.work_days.includes(day)
      ? companyInfo.work_days.filter(d => d !== day)
      : [...companyInfo.work_days, day];
    
    setCompanyInfo(prev => ({ ...prev, work_days: updatedDays }));
  };

  const handleLogout = async () => {
    router.replace('/(tabs)/accounting');
  };

  const isTablet = screenData.width >= 768;
  const isLargeScreen = screenData.width >= 1024;

  const getResponsiveStyles = () => {
    if (isLargeScreen) {
      return {
        container: { ...styles.container, padding: 40 },
        formContainer: { ...styles.formContainer, maxWidth: 1200, alignSelf: 'center' },
        sectionContainer: { ...styles.sectionContainer, flexDirection: 'row', flexWrap: 'wrap' },
        inputGroup: { ...styles.inputGroup, width: '48%', marginHorizontal: '1%' },
        title: { ...styles.title, fontSize: 32 }
      };
    } else if (isTablet) {
      return {
        container: { ...styles.container, padding: 30 },
        formContainer: { ...styles.formContainer, maxWidth: 800, alignSelf: 'center' },
        sectionContainer: { ...styles.sectionContainer, flexDirection: 'row', flexWrap: 'wrap' },
        inputGroup: { ...styles.inputGroup, width: '48%', marginHorizontal: '1%' },
        title: { ...styles.title, fontSize: 28 }
      };
    } else {
      return {
        container: styles.container,
        formContainer: styles.formContainer,
        sectionContainer: styles.sectionContainer,
        inputGroup: styles.inputGroup,
        title: styles.title
      };
    }
  };

  const responsiveStyles = getResponsiveStyles();

  return (
    <SafeAreaView style={responsiveStyles.container}>
      <ScrollView 
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 50 }}
      >
        <View style={styles.header}>
          <Text style={responsiveStyles.title}>إعدادات الشركة</Text>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>خروج</Text>
          </TouchableOpacity>
        </View>

        <View style={responsiveStyles.formContainer}>
          {/* Company Names Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🏢 أسماء الشركة</Text>
            <View style={responsiveStyles.sectionContainer}>
              <View style={responsiveStyles.inputGroup}>
                <Text style={styles.inputLabel}>🇵🇸 الاسم بالعربية:</Text>
                <TextInput
                  style={styles.input}
                  value={companyInfo.name_ar}
                  onChangeText={(text) => setCompanyInfo(prev => ({ ...prev, name_ar: text }))}
                  placeholder="نعامنة للصرافة"
                  textAlign="right"
                />
              </View>

              <View style={responsiveStyles.inputGroup}>
                <Text style={styles.inputLabel}>🇮🇱 השם בעברית:</Text>
                <TextInput
                  style={styles.input}
                  value={companyInfo.name_he}
                  onChangeText={(text) => setCompanyInfo(prev => ({ ...prev, name_he: text }))}
                  placeholder="נעאמנה להמרות"
                  textAlign="right"
                />
              </View>

              <View style={responsiveStyles.inputGroup}>
                <Text style={styles.inputLabel}>🇺🇸 Name in English:</Text>
                <TextInput
                  style={styles.input}
                  value={companyInfo.name_en}
                  onChangeText={(text) => setCompanyInfo(prev => ({ ...prev, name_en: text }))}
                  placeholder="Naamneh Exchange"
                  textAlign="left"
                />
              </View>
            </View>
          </View>

          {/* Addresses Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📍 عناوين الشركة</Text>
            <View style={responsiveStyles.sectionContainer}>
              <View style={responsiveStyles.inputGroup}>
                <Text style={styles.inputLabel}>🇵🇸 العنوان بالعربية:</Text>
                <TextInput
                  style={styles.input}
                  value={companyInfo.address_ar}
                  onChangeText={(text) => setCompanyInfo(prev => ({ ...prev, address_ar: text }))}
                  placeholder="عرابة الشارع الرئيسي"
                  textAlign="right"
                />
              </View>

              <View style={responsiveStyles.inputGroup}>
                <Text style={styles.inputLabel}>🇮🇱 הכתובת בעברית:</Text>
                <TextInput
                  style={styles.input}
                  value={companyInfo.address_he}
                  onChangeText={(text) => setCompanyInfo(prev => ({ ...prev, address_he: text }))}
                  placeholder="ערבה הרחוב הראשי"
                  textAlign="right"
                />
              </View>

              <View style={responsiveStyles.inputGroup}>
                <Text style={styles.inputLabel}>🇺🇸 Address in English:</Text>
                <TextInput
                  style={styles.input}
                  value={companyInfo.address_en}
                  onChangeText={(text) => setCompanyInfo(prev => ({ ...prev, address_en: text }))}
                  placeholder="Arraba Main Street"
                  textAlign="left"
                />
              </View>
            </View>
          </View>

          {/* Phone Numbers Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📞 أرقام الهواتف</Text>
            <View style={responsiveStyles.sectionContainer}>
              <View style={responsiveStyles.inputGroup}>
                <Text style={styles.inputLabel}>الهاتف الأول (مطلوب):</Text>
                <TextInput
                  style={styles.input}
                  value={companyInfo.phone1}
                  onChangeText={(text) => setCompanyInfo(prev => ({ ...prev, phone1: text }))}
                  placeholder="05260000841"
                  keyboardType="phone-pad"
                  textAlign="center"
                />
              </View>

              <View style={responsiveStyles.inputGroup}>
                <Text style={styles.inputLabel}>الهاتف الثاني (اختياري):</Text>
                <TextInput
                  style={styles.input}
                  value={companyInfo.phone2}
                  onChangeText={(text) => setCompanyInfo(prev => ({ ...prev, phone2: text }))}
                  placeholder="اختياري"
                  keyboardType="phone-pad"
                  textAlign="center"
                />
              </View>

              <View style={responsiveStyles.inputGroup}>
                <Text style={styles.inputLabel}>الهاتف الثالث (اختياري):</Text>
                <TextInput
                  style={styles.input}
                  value={companyInfo.phone3}
                  onChangeText={(text) => setCompanyInfo(prev => ({ ...prev, phone3: text }))}
                  placeholder="اختياري"
                  keyboardType="phone-pad"
                  textAlign="center"
                />
              </View>
            </View>
          </View>

          {/* Working Hours Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🕐 ساعات العمل</Text>
            <View style={responsiveStyles.sectionContainer}>
              <View style={responsiveStyles.inputGroup}>
                <Text style={styles.inputLabel}>بداية الدوام الصباحي:</Text>
                <TextInput
                  style={styles.input}
                  value={companyInfo.morning_start}
                  onChangeText={(text) => setCompanyInfo(prev => ({ ...prev, morning_start: text }))}
                  placeholder="08:00"
                  textAlign="center"
                />
              </View>

              <View style={responsiveStyles.inputGroup}>
                <Text style={styles.inputLabel}>نهاية الدوام الصباحي:</Text>
                <TextInput
                  style={styles.input}
                  value={companyInfo.morning_end}
                  onChangeText={(text) => setCompanyInfo(prev => ({ ...prev, morning_end: text }))}
                  placeholder="12:00"
                  textAlign="center"
                />
              </View>

              <View style={responsiveStyles.inputGroup}>
                <Text style={styles.inputLabel}>بداية الدوام المسائي:</Text>
                <TextInput
                  style={styles.input}
                  value={companyInfo.evening_start}
                  onChangeText={(text) => setCompanyInfo(prev => ({ ...prev, evening_start: text }))}
                  placeholder="14:00"
                  textAlign="center"
                />
              </View>

              <View style={responsiveStyles.inputGroup}>
                <Text style={styles.inputLabel}>نهاية الدوام المسائي:</Text>
                <TextInput
                  style={styles.input}
                  value={companyInfo.evening_end}
                  onChangeText={(text) => setCompanyInfo(prev => ({ ...prev, evening_end: text }))}
                  placeholder="18:00"
                  textAlign="center"
                />
              </View>
            </View>
          </View>

          {/* Working Days Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📅 أيام العمل</Text>
            <View style={styles.daysContainer}>
              {DAYS_OF_WEEK.map((day) => (
                <TouchableOpacity
                  key={day.key}
                  style={[
                    styles.dayButton,
                    companyInfo.work_days.includes(day.key) && styles.selectedDay
                  ]}
                  onPress={() => toggleWorkDay(day.key)}
                >
                  <Text style={[
                    styles.dayText,
                    companyInfo.work_days.includes(day.key) && styles.selectedDayText
                  ]}>
                    {day.ar}
                  </Text>
                  <Text style={[
                    styles.dayTextEn,
                    companyInfo.work_days.includes(day.key) && styles.selectedDayText
                  ]}>
                    {day.en}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Save Button */}
          <TouchableOpacity style={styles.saveButton} onPress={saveCompanyInfo}>
            <Text style={styles.saveButtonText}>💾 حفظ معلومات الشركة</Text>
          </TouchableOpacity>

          {/* Preview Section */}
          <View style={styles.previewSection}>
            <Text style={styles.previewTitle}>👁️ معاينة المعلومات</Text>
            <View style={styles.previewContainer}>
              <Text style={styles.previewText}>
                🏢 {companyInfo.name_ar} | {companyInfo.name_he} | {companyInfo.name_en}
              </Text>
              <Text style={styles.previewText}>
                📍 {companyInfo.address_ar}
              </Text>
              <Text style={styles.previewText}>
                📞 {companyInfo.phone1}
                {companyInfo.phone2 && ` | ${companyInfo.phone2}`}
                {companyInfo.phone3 && ` | ${companyInfo.phone3}`}
              </Text>
              <Text style={styles.previewText}>
                🕐 {companyInfo.morning_start} - {companyInfo.morning_end} | {companyInfo.evening_start} - {companyInfo.evening_end}
              </Text>
              <Text style={styles.previewText}>
                📅 أيام العمل: {companyInfo.work_days.map(day => 
                  DAYS_OF_WEEK.find(d => d.key === day)?.ar
                ).join(' - ')}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0FDF4',
    padding: 20,
  },
  scrollContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#065F46',
  },
  logoutButton: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  formContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 15,
    textAlign: 'center',
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
  },
  sectionContainer: {
    gap: 15,
  },
  inputGroup: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    borderWidth: 2,
    borderColor: '#D1D5DB',
    padding: 15,
    fontSize: 16,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    color: '#1F2937',
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  dayButton: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    minWidth: 100,
    alignItems: 'center',
  },
  selectedDay: {
    backgroundColor: '#065F46',
    borderColor: '#065F46',
  },
  dayText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#374151',
  },
  dayTextEn: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  selectedDayText: {
    color: '#FFFFFF',
  },
  saveButton: {
    backgroundColor: '#065F46',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#065F46',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  previewSection: {
    marginTop: 30,
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E40AF',
    marginBottom: 15,
    textAlign: 'center',
  },
  previewContainer: {
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 8,
    gap: 8,
  },
  previewText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
});