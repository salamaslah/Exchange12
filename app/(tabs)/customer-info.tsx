import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, SafeAreaView, Image, Platform } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { customerService, transactionService, supabase } from '@/lib/supabase';
import { useInactivityTimer } from '@/hooks/useInactivityTimer';

interface Service {
  id: string;
  service_number: number;
  service_name: string;
  service_name_he?: string;
  service_name_en?: string;
}

export default function CustomerInfoScreen() {
  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [nationalId, setNationalId] = useState('');
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState<'ar' | 'he' | 'en'>('ar');
  const [idImage, setIdImage] = useState<string | null>(null);
  const [licenseImage, setLicenseImage] = useState<string | null>(null);
  const [passportImage, setPassportImage] = useState<string | null>(null);
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const router = useRouter();
  const { resetTimer } = useInactivityTimer();

  useFocusEffect(
    React.useCallback(() => {
      console.log('🔄 تم تفعيل صفحة معلومات الزبائن');
      loadInitialData();
    }, [])
  );

  const loadInitialData = async () => {
    try {
      await loadLanguage();
      await loadServices();

      // مسح البيانات السابقة
      setNationalId('');
      setIdImage(null);
      setLicenseImage(null);
      setPassportImage(null);
      setSelectedService(null);
      setIsNewCustomer(false);
    } catch (error) {
      console.error('❌ خطأ في تحميل البيانات:', error);
    }
  };

  const loadLanguage = async () => {
    try {
      const savedLanguage = await AsyncStorage.getItem('selectedLanguage');
      if (savedLanguage && ['ar', 'he', 'en'].includes(savedLanguage)) {
        setLanguage(savedLanguage as 'ar' | 'he' | 'en');
        console.log('✅ تم تحميل اللغة:', savedLanguage);
      }
    } catch (error) {
      console.log('خطأ في تحميل اللغة:', error);
    }
  };

  const loadServices = async () => {
    try {
      console.log('🔄 جلب جميع الخدمات من جدول services');

      const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('service_number');

      if (error) {
        console.error('❌ خطأ في جلب الخدمات:', error);
        throw error;
      }

      console.log(`✅ تم جلب ${data?.length || 0} خدمة`);
      setServices(data || []);
    } catch (error) {
      console.error('❌ خطأ في تحميل الخدمات:', error);

      // الخدمات الافتراضية
      const defaultServices = [
        { id: '1', service_number: 1, service_name: 'إنشاء فيزا', service_name_he: 'יצירת כרטיס', service_name_en: 'Create Card' },
        { id: '2', service_number: 2, service_name: 'تحويل للخارج', service_name_he: 'העברה לחו"ל', service_name_en: 'International Transfer' },
        { id: '3', service_number: 3, service_name: 'سحب حوالة', service_name_he: 'משיכת העברה', service_name_en: 'Receive Transfer' },
        { id: '4', service_number: 4, service_name: 'صرافة شيكات', service_name_he: 'פדיון צ\'קים', service_name_en: 'Check Cashing' },
        { id: '5', service_number: 5, service_name: 'تحويل لحساب بنك', service_name_he: 'העברה לחשבון הבנק', service_name_en: 'Bank Transfer' },
        { id: '6', service_number: 6, service_name: 'سحب من الفيزا', service_name_he: 'משיכה מכרטיס', service_name_en: 'Card Withdrawal' },
        { id: '7', service_number: 7, service_name: 'إيداع في الفيזا', service_name_he: 'הפקדה בכרטיס', service_name_en: 'Card Deposit' },
        { id: '8', service_number: 8, service_name: 'صرافة أموال', service_name_he: 'החלפת כספים', service_name_en: 'Money Exchange' }
      ];

      setServices(defaultServices);
    }
  };

  const getServiceName = (service: Service) => {
    switch (language) {
      case 'he':
        return service.service_name_he || service.service_name;
      case 'en':
        return service.service_name_en || service.service_name;
      default:
        return service.service_name;
    }
  };

  const searchCustomerByNationalId = async (id: string) => {
    if (id.length !== 9) {
      setIsNewCustomer(false);
      return;
    }

    try {
      console.log(`🔍 البحث عن زبون برقم الهوية: ${id}`);
      const customer = await customerService.getByNationalId(id);

      if (customer) {
        console.log(`✅ تم العثور على الزبون: ${customer.customer_name}`);
        setIsNewCustomer(false);
      } else {
        console.log('📝 زبون جديد');
        setIsNewCustomer(true);
      }
    } catch (error) {
      console.error('❌ خطأ في البحث:', error);
      setIsNewCustomer(true);
    }
  };

  const handleNationalIdChange = (text: string) => {
    resetTimer();
    const numericText = text.replace(/[^0-9]/g, '');
    setNationalId(numericText);

    if (numericText.length === 9) {
      searchCustomerByNationalId(numericText);
    } else {
      setIsNewCustomer(false);
    }
  };

  const pickImage = async (type: 'id' | 'license' | 'passport') => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          language === 'ar' ? 'خطأ' : language === 'he' ? 'שגיאה' : 'Error',
          language === 'ar' ? 'نحتاج إلى إذن للوصول إلى الصور' :
          language === 'he' ? 'אנו זקוקים להרשאה לגישה לתמונות' :
          'We need permission to access photos'
        );
        return;
      }

      const result = await ImagePicker.launchImagePickerAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;

        switch (type) {
          case 'id':
            setIdImage(imageUri);
            console.log('✅ تم اختيار صورة الهوية');
            break;
          case 'license':
            setLicenseImage(imageUri);
            console.log('✅ تم اختيار صورة الرخصة/الجواز');
            break;
          case 'passport':
            setPassportImage(imageUri);
            console.log('✅ تم اختيار صورة جواز السفر');
            break;
        }
      }
    } catch (error) {
      console.error('❌ خطأ في اختيار الصورة:', error);
      Alert.alert(
        language === 'ar' ? 'خطأ' : language === 'he' ? 'שגיאה' : 'Error',
        language === 'ar' ? 'حدث خطأ في اختيار الصورة' :
        language === 'he' ? 'אירעה שגיאה בבחירת התמונה' :
        'Error occurred selecting image'
      );
    }
  };

  const validateAndContinue = async () => {
    resetTimer();

    // التحقق من اختيار الخدمة
    if (!selectedService) {
      Alert.alert(
        language === 'ar' ? 'خطأ' : language === 'he' ? 'שגיאה' : 'Error',
        language === 'ar' ? 'الرجاء اختيار خدمة' :
        language === 'he' ? 'אנא בחר שירות' :
        'Please select a service'
      );
      return;
    }

    // التحقق من رقم الهوية
    if (!nationalId || nationalId.length !== 9) {
      Alert.alert(
        language === 'ar' ? 'خطأ' : language === 'he' ? 'שגיאה' : 'Error',
        language === 'ar' ? 'الرجاء إدخال رقم هوية صحيح (9 أرقام)' :
        language === 'he' ? 'אנא הכנס מספר זהות תקין (9 ספרות)' :
        'Please enter valid ID number (9 digits)'
      );
      return;
    }

    // التحقق من صورة الهوية للزبائن الجدد
    if (isNewCustomer && !idImage) {
      Alert.alert(
        language === 'ar' ? 'خطأ' : language === 'he' ? 'שגיאה' : 'Error',
        language === 'ar' ? 'الرجاء رفع صورة الهوية' :
        language === 'he' ? 'אנא העלה תמונת תעודת זהות' :
        'Please upload ID image'
      );
      return;
    }

    // التحقق من المتطلبات الإضافية
    if (selectedService.service_number === 1 && isNewCustomer && !licenseImage) {
      Alert.alert(
        language === 'ar' ? 'تنبيه' : language === 'he' ? 'אזהרה' : 'Warning',
        language === 'ar' ? 'لإنشاء كرت مسبق الدفع، يرجى رفع صورة رخصة أو جواز سفر' :
        language === 'he' ? 'ליצירת כרטיס משולם מראש, אנא העלה תמונת רישיון או דרכון' :
        'To create a prepaid card, please upload license or passport image'
      );
      return;
    }

    if (selectedService.service_number === 2 && isNewCustomer && !passportImage) {
      Alert.alert(
        language === 'ar' ? 'تنبيه' : language === 'he' ? 'אזהרה' : 'Warning',
        language === 'ar' ? 'لتحويل أموال للخارج، يرجى رفع صورة جواز سفر المرسل إليه' :
        language === 'he' ? 'להעברת כסף לחו"ל, אנא העלה תמונת דרכון של הנמען' :
        'For international transfer, please upload recipient passport image'
      );
      return;
    }

    try {
      setLoading(true);

      // حفظ البيانات في AsyncStorage
      await AsyncStorage.setItem('selectedServiceNumber', selectedService.service_number.toString());
      await AsyncStorage.setItem('selectedServiceName', selectedService.service_name);
      await AsyncStorage.setItem('currentCustomerId', nationalId);
      if (idImage) await AsyncStorage.setItem('currentCustomerImage1', idImage);
      if (licenseImage) await AsyncStorage.setItem('currentCustomerImage2', licenseImage);
      if (passportImage) await AsyncStorage.setItem('currentCustomerImage3', passportImage);

      console.log('✅ تم حفظ البيانات');

      // الانتقال إلى صفحة الانتظار
      router.replace('/waiting-screen');

    } catch (error) {
      console.error('❌ خطأ في المعالجة:', error);
      Alert.alert(
        language === 'ar' ? 'خطأ' : language === 'he' ? 'שגיאה' : 'Error',
        language === 'ar' ? 'حدث خطأ في معالجة البيانات' :
        language === 'he' ? 'אירעה שגיאה בעיבוד הנתונים' :
        'Error occurred processing data'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleBackToPrices = () => {
    router.replace('/(tabs)/prices');
  };

  const getTextAlign = () => {
    return language === 'en' ? 'left' : 'right';
  };

  const shouldShowLicenseUpload = () => {
    return selectedService?.service_number === 1 && isNewCustomer;
  };

  const shouldShowPassportUpload = () => {
    return selectedService?.service_number === 2 && isNewCustomer;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        onTouchStart={resetTimer}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBackToPrices}>
            <Text style={styles.backButtonText}>
              {language === 'ar' && '← العودة'}
              {language === 'he' && '← חזרה'}
              {language === 'en' && '← Back'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.title}>
            {language === 'ar' && 'معلومات الزبون'}
            {language === 'he' && 'פרטי הלקוח'}
            {language === 'en' && 'Customer Info'}
          </Text>

          <View style={{ width: 80 }} />
        </View>

        <View style={styles.content}>
          {/* Service Selection */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { textAlign: getTextAlign() }]}>
              {language === 'ar' && 'اختر الخدمة:'}
              {language === 'he' && 'בחר שירות:'}
              {language === 'en' && 'Select Service:'}
            </Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.servicesScroll}>
              {services.map((service) => (
                <TouchableOpacity
                  key={service.id}
                  style={[
                    styles.serviceCard,
                    selectedService?.id === service.id && styles.serviceCardSelected
                  ]}
                  onPress={() => {
                    resetTimer();
                    setSelectedService(service);
                    // مسح الصور السابقة عند تغيير الخدمة
                    setIdImage(null);
                    setLicenseImage(null);
                    setPassportImage(null);
                  }}
                >
                  <Text style={[
                    styles.serviceCardText,
                    selectedService?.id === service.id && styles.serviceCardTextSelected,
                    { textAlign: 'center' }
                  ]}>
                    {getServiceName(service)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* National ID Input */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { textAlign: getTextAlign() }]}>
              {language === 'ar' && 'رقم الهوية:'}
              {language === 'he' && 'מספר זהות:'}
              {language === 'en' && 'National ID:'}
            </Text>

            <TextInput
              style={[styles.input, { textAlign: 'center' }]}
              value={nationalId}
              onChangeText={handleNationalIdChange}
              placeholder="123456789"
              keyboardType="numeric"
              maxLength={9}
            />
          </View>

          {/* New Customer Message & Image Uploads */}
          {isNewCustomer && (
            <View style={styles.newCustomerSection}>
              <Text style={[styles.newCustomerTitle, { textAlign: getTextAlign() }]}>
                {language === 'ar' && 'اذا كنت زبون جديد !! اضف صور واضحه وصالحة للاستعمال'}
                {language === 'he' && 'אם אתה לקוח חדש !! הוסף תמונות ברורות ותקפות'}
                {language === 'en' && 'If you are a new customer !! Add clear and valid images'}
              </Text>

              {/* ID Image Upload */}
              <View style={styles.uploadSection}>
                <Text style={[styles.uploadLabel, { textAlign: getTextAlign() }]}>
                  {language === 'ar' && '📸 صورة الهوية'}
                  {language === 'he' && '📸 תמונת תעודת זהות'}
                  {language === 'en' && '📸 ID Image'}
                </Text>

                {idImage ? (
                  <View style={styles.imageContainer}>
                    <Image source={{ uri: idImage }} style={styles.uploadedImage} />
                    <TouchableOpacity
                      style={styles.changeImageButton}
                      onPress={() => pickImage('id')}
                    >
                      <Text style={styles.changeImageButtonText}>
                        {language === 'ar' && '🔄 تغيير الصورة'}
                        {language === 'he' && '🔄 שנה תמונה'}
                        {language === 'en' && '🔄 Change Image'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.uploadButton}
                    onPress={() => pickImage('id')}
                  >
                    <Text style={styles.uploadButtonIcon}>📷</Text>
                    <Text style={styles.uploadButtonText}>
                      {language === 'ar' && 'اضغط لرفع صورة الهوية'}
                      {language === 'he' && 'לחץ להעלות תמונת תעודת זהות'}
                      {language === 'en' && 'Tap to upload ID image'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* License/Passport Upload for Prepaid Card */}
              {shouldShowLicenseUpload() && (
                <View style={styles.uploadSection}>
                  <Text style={[styles.uploadLabel, { textAlign: getTextAlign() }]}>
                    {language === 'ar' && '📸 صورة رخصة أو جواز سفر'}
                    {language === 'he' && '📸 תמונת רישיון או דרכון'}
                    {language === 'en' && '📸 License or Passport Image'}
                  </Text>
                  <Text style={[styles.uploadNote, { textAlign: getTextAlign() }]}>
                    {language === 'ar' && '(مطلوب لإنشاء كرت مسبق الدفع أو معاملة أكثر من 20000 شيقل)'}
                    {language === 'he' && '(נדרש ליצירת כרטיס משולם מראש או עסקה מעל 20,000 שקל)'}
                    {language === 'en' && '(Required for prepaid card or transaction over 20,000 NIS)'}
                  </Text>

                  {licenseImage ? (
                    <View style={styles.imageContainer}>
                      <Image source={{ uri: licenseImage }} style={styles.uploadedImage} />
                      <TouchableOpacity
                        style={styles.changeImageButton}
                        onPress={() => pickImage('license')}
                      >
                        <Text style={styles.changeImageButtonText}>
                          {language === 'ar' && '🔄 تغيير الصورة'}
                          {language === 'he' && '🔄 שנה תמונה'}
                          {language === 'en' && '🔄 Change Image'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.uploadButton}
                      onPress={() => pickImage('license')}
                    >
                      <Text style={styles.uploadButtonIcon}>📷</Text>
                      <Text style={styles.uploadButtonText}>
                        {language === 'ar' && 'اضغط لرفع صورة الرخصة/الجواز'}
                        {language === 'he' && 'לחץ להעלות תמונת רישיון/דרכון'}
                        {language === 'en' && 'Tap to upload license/passport'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* Passport Upload for International Transfer */}
              {shouldShowPassportUpload() && (
                <View style={styles.uploadSection}>
                  <Text style={[styles.uploadLabel, { textAlign: getTextAlign() }]}>
                    {language === 'ar' && '📸 صورة جواز سفر المرسل إليه'}
                    {language === 'he' && '📸 תמונת דרכון של הנמען'}
                    {language === 'en' && '📸 Recipient Passport Image'}
                  </Text>
                  <Text style={[styles.uploadNote, { textAlign: getTextAlign() }]}>
                    {language === 'ar' && '(مطلوب لتحويل الأموال للخارج)'}
                    {language === 'he' && '(נדרש להעברת כסף לחו"ל)'}
                    {language === 'en' && '(Required for international transfer)'}
                  </Text>

                  {passportImage ? (
                    <View style={styles.imageContainer}>
                      <Image source={{ uri: passportImage }} style={styles.uploadedImage} />
                      <TouchableOpacity
                        style={styles.changeImageButton}
                        onPress={() => pickImage('passport')}
                      >
                        <Text style={styles.changeImageButtonText}>
                          {language === 'ar' && '🔄 تغيير الصورة'}
                          {language === 'he' && '🔄 שנה תמונה'}
                          {language === 'en' && '🔄 Change Image'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.uploadButton}
                      onPress={() => pickImage('passport')}
                    >
                      <Text style={styles.uploadButtonIcon}>📷</Text>
                      <Text style={styles.uploadButtonText}>
                        {language === 'ar' && 'اضغط لرفع صورة جواز السفر'}
                        {language === 'he' && 'לחץ להעלות תמונת דרכון'}
                        {language === 'en' && 'Tap to upload passport image'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          )}

          {/* Continue Button */}
          <TouchableOpacity
            style={[styles.continueButton, loading && styles.disabledButton]}
            onPress={validateAndContinue}
            disabled={loading}
          >
            <Text style={styles.continueButtonText}>
              {loading ? (
                language === 'ar' ? 'جاري المعالجة...' :
                language === 'he' ? 'מעבד...' :
                'Processing...'
              ) : (
                language === 'ar' ? '✅ متابعة' :
                language === 'he' ? '✅ המשך' :
                '✅ Continue'
              )}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F9FF',
  },
  scrollContainer: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 20,
  },
  backButton: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
    width: 80,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0369A1',
    textAlign: 'center',
    flex: 1,
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 15,
    backgroundColor: '#DBEAFE',
    padding: 12,
    borderRadius: 8,
  },
  servicesScroll: {
    flexDirection: 'row',
  },
  serviceCard: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginRight: 10,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    minWidth: 140,
  },
  serviceCardSelected: {
    backgroundColor: '#0369A1',
    borderColor: '#0369A1',
  },
  serviceCardText: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '600',
  },
  serviceCardTextSelected: {
    color: '#FFFFFF',
  },
  input: {
    borderWidth: 2,
    borderColor: '#D1D5DB',
    padding: 15,
    fontSize: 18,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    color: '#1F2937',
    fontWeight: '600',
  },
  newCustomerSection: {
    backgroundColor: '#FEF3C7',
    padding: 20,
    borderRadius: 12,
    marginBottom: 25,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  newCustomerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#92400E',
    marginBottom: 20,
    lineHeight: 24,
  },
  uploadSection: {
    marginBottom: 20,
  },
  uploadLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  uploadNote: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 10,
    fontStyle: 'italic',
  },
  uploadButton: {
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
  uploadButtonIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  uploadButtonText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
    textAlign: 'center',
  },
  imageContainer: {
    alignItems: 'center',
  },
  uploadedImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 10,
  },
  changeImageButton: {
    backgroundColor: '#0369A1',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
  },
  changeImageButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  continueButton: {
    backgroundColor: '#059669',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#059669',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0,
    elevation: 0,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
