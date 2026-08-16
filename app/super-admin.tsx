import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, ActivityIndicator, Modal, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { exchangeShopService, workingHoursService } from '@/lib/supabase';

type Shop = {
  id: string;
  username: string;
  password: string;
  name_ar: string;
  name_he: string;
  name_en: string;
  is_active: boolean;
  address_ar?: string;
  address_he?: string;
  address_en?: string;
  phone1?: string;
  phone2?: string;
  phone3?: string;
  created_at?: string;
};

const DAYS = [
  { key: 'sunday', label: 'الأحد' },
  { key: 'monday', label: 'الإثنين' },
  { key: 'tuesday', label: 'الثلاثاء' },
  { key: 'wednesday', label: 'الأربعاء' },
  { key: 'thursday', label: 'الخميس' },
  { key: 'friday', label: 'الجمعة' },
  { key: 'saturday', label: 'السبت' },
];

export default function SuperAdminScreen() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Add shop form state
  const [form, setForm] = useState({
    username: '',
    password: '',
    shop_name_ar: '',
    shop_name_he: '',
    shop_name_en: '',
    address_ar: '',
    address_he: '',
    address_en: '',
    phone1: '',
    phone2: '',
    phone3: '',
  });
  const [workingDays, setWorkingDays] = useState<Record<string, boolean>>({
    sunday: true, monday: true, tuesday: true, wednesday: true,
    thursday: true, friday: false, saturday: true,
  });
  const [morningStart, setMorningStart] = useState('09:00');
  const [morningEnd, setMorningEnd] = useState('14:00');
  const [eveningStart, setEveningStart] = useState('16:00');
  const [eveningEnd, setEveningEnd] = useState('18:00');

  useEffect(() => {
    loadShops();
  }, []);

  const loadShops = async () => {
    try {
      setLoading(true);
      const data = await exchangeShopService.getAll();
      setShops(data as Shop[]);
    } catch (err) {
      setError('خطأ في تحميل المحلات');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('isLoggedIn');
    await AsyncStorage.removeItem('isSuperAdmin');
    await AsyncStorage.removeItem('savedShopUsername');
    await AsyncStorage.removeItem('savedShopPassword');
    await AsyncStorage.removeItem('shopUsername');
    await AsyncStorage.removeItem('shopId');
    router.replace('/login');
  };

  const resetForm = () => {
    setForm({
      username: '', password: '', shop_name_ar: '', shop_name_he: '',
      shop_name_en: '', address_ar: '', address_he: '', address_en: '',
      phone1: '', phone2: '', phone3: '',
    });
    setWorkingDays({
      sunday: true, monday: true, tuesday: true, wednesday: true,
      thursday: true, friday: false, saturday: true,
    });
    setMorningStart('09:00');
    setMorningEnd('14:00');
    setEveningStart('16:00');
    setEveningEnd('18:00');
    setError(null);
  };

  const handleAddShop = async () => {
    if (!form.username.trim() || !form.password.trim()) {
      setError('يرجى إدخال اسم المستخدم وكلمة المرور');
      return;
    }
    if (!form.shop_name_ar.trim()) {
      setError('يرجى إدخال اسم المحل بالعربية');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const newShop = await exchangeShopService.create({
        username: form.username.trim(),
        password: form.password.trim(),
        shop_name_ar: form.shop_name_ar.trim(),
        shop_name_he: form.shop_name_he.trim() || form.shop_name_ar.trim(),
        shop_name_en: form.shop_name_en.trim() || form.shop_name_ar.trim(),
        address_ar: form.address_ar.trim(),
        address_he: form.address_he.trim(),
        address_en: form.address_en.trim(),
        phone1: form.phone1.trim(),
        phone2: form.phone2.trim(),
        phone3: form.phone3.trim(),
      });

      // Save working hours for the new shop
      if (newShop?.id) {
        const hours = DAYS.map(day => ({
          key: day.key,
          is_working_day: workingDays[day.key] || false,
          morning_start: morningStart,
          morning_end: morningEnd,
          evening_start: eveningStart,
          evening_end: eveningEnd,
        }));
        await workingHoursService.upsert(newShop.id, hours as any);
      }

      setShowAddModal(false);
      resetForm();
      await loadShops();
      Alert.alert('تم', 'تم إضافة المحل بنجاح');
    } catch (err: any) {
      setError(err?.message || 'خطأ في إضافة المحل - قد يكون اسم المستخدم مستخدماً');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteShop = (shop: Shop) => {
    Alert.alert(
      'تأكيد الحذف',
      `هل أنت متأكد من حذف محل "${shop.name_ar}"؟ سيتم حذف جميع بياناته وساعات عمله.`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: async () => {
            try {
              await exchangeShopService.delete(shop.id);
              await loadShops();
              Alert.alert('تم', 'تم حذف المحل بنجاح');
            } catch (err: any) {
              Alert.alert('خطأ', err?.message || 'لم يتم الحذف');
            }
          },
        },
      ]
    );
  };

  const toggleWorkingDay = (day: string) => {
    setWorkingDays(prev => ({ ...prev, [day]: !prev[day] }));
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#C9A84C" />
          <Text style={styles.loadingText}>جاري التحميل...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>لوحة تحكم الشركات</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>خروج</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.addButton} onPress={() => { resetForm(); setShowAddModal(true); }}>
          <Text style={styles.addButtonText}>+ إضافة محل صرافة جديد</Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>محلات الصرافة ({shops.length})</Text>

        {shops.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>لا توجد محلات صرافة</Text>
          </View>
        ) : (
          shops.map((shop) => (
            <View key={shop.id} style={styles.shopCard}>
              <View style={styles.shopHeader}>
                <View style={styles.shopInfo}>
                  <Text style={styles.shopName}>{shop.name_ar}</Text>
                  <Text style={styles.shopUsername}>@{shop.username}</Text>
                  {shop.phone1 ? <Text style={styles.shopPhone}>📞 {shop.phone1}</Text> : null}
                  <Text style={styles.shopStatus}>
                    {shop.is_active ? '✅ مفعّل' : '❌ معطّل'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteShop(shop)}
                >
                  <Text style={styles.deleteButtonText}>🗑️ حذف</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Add Shop Modal */}
      <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => setShowAddModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>إضافة محل صرافة جديد</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {error && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <Text style={styles.sectionLabel}>بيانات الدخول</Text>
              <View style={styles.inputRow}>
                <View style={styles.inputHalf}>
                  <Text style={styles.inputLabel}>اسم المستخدم *</Text>
                  <TextInput
                    style={styles.input}
                    value={form.username}
                    onChangeText={(t) => setForm({ ...form, username: t })}
                    placeholder="shop1"
                    textAlign="right"
                    autoCapitalize="none"
                  />
                </View>
                <View style={styles.inputHalf}>
                  <Text style={styles.inputLabel}>كلمة المرور *</Text>
                  <TextInput
                    style={styles.input}
                    value={form.password}
                    onChangeText={(t) => setForm({ ...form, password: t })}
                    placeholder="••••••"
                    textAlign="right"
                    secureTextEntry
                    autoCapitalize="none"
                  />
                </View>
              </View>

              <Text style={styles.sectionLabel}>اسم المحل</Text>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>الاسم بالعربية *</Text>
                <TextInput
                  style={styles.input}
                  value={form.shop_name_ar}
                  onChangeText={(t) => setForm({ ...form, shop_name_ar: t })}
                  placeholder="نعامنة للصرافة"
                  textAlign="right"
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>الاسم بالعبرية</Text>
                <TextInput
                  style={styles.input}
                  value={form.shop_name_he}
                  onChangeText={(t) => setForm({ ...form, shop_name_he: t })}
                  placeholder="נעאמנה להמרות"
                  textAlign="right"
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>الاسم بالإنجليزية</Text>
                <TextInput
                  style={styles.input}
                  value={form.shop_name_en}
                  onChangeText={(t) => setForm({ ...form, shop_name_en: t })}
                  placeholder="Naamneh Exchange"
                  textAlign="left"
                />
              </View>

              <Text style={styles.sectionLabel}>العنوان</Text>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>العنوان بالعربية</Text>
                <TextInput
                  style={styles.input}
                  value={form.address_ar}
                  onChangeText={(t) => setForm({ ...form, address_ar: t })}
                  placeholder="عرابة الشارع الرئيسي"
                  textAlign="right"
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>العنوان بالعبرية</Text>
                <TextInput
                  style={styles.input}
                  value={form.address_he}
                  onChangeText={(t) => setForm({ ...form, address_he: t })}
                  placeholder="ערבה הרחוב הראשי"
                  textAlign="right"
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>العنوان بالإنجليزية</Text>
                <TextInput
                  style={styles.input}
                  value={form.address_en}
                  onChangeText={(t) => setForm({ ...form, address_en: t })}
                  placeholder="Arraba Main Street"
                  textAlign="left"
                />
              </View>

              <Text style={styles.sectionLabel}>أرقام الهاتف</Text>
              <View style={styles.inputRow}>
                <View style={styles.inputThird}>
                  <Text style={styles.inputLabel}>هاتف 1</Text>
                  <TextInput
                    style={styles.input}
                    value={form.phone1}
                    onChangeText={(t) => setForm({ ...form, phone1: t })}
                    placeholder="052..."
                    textAlign="left"
                    keyboardType="phone-pad"
                  />
                </View>
                <View style={styles.inputThird}>
                  <Text style={styles.inputLabel}>هاتف 2</Text>
                  <TextInput
                    style={styles.input}
                    value={form.phone2}
                    onChangeText={(t) => setForm({ ...form, phone2: t })}
                    placeholder="053..."
                    textAlign="left"
                    keyboardType="phone-pad"
                  />
                </View>
                <View style={styles.inputThird}>
                  <Text style={styles.inputLabel}>هاتف 3</Text>
                  <TextInput
                    style={styles.input}
                    value={form.phone3}
                    onChangeText={(t) => setForm({ ...form, phone3: t })}
                    placeholder="054..."
                    textAlign="left"
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              <Text style={styles.sectionLabel}>ساعات وأيام العمل</Text>
              <View style={styles.daysContainer}>
                {DAYS.map(day => (
                  <TouchableOpacity
                    key={day.key}
                    style={[styles.dayButton, workingDays[day.key] && styles.dayButtonActive]}
                    onPress={() => toggleWorkingDay(day.key)}
                  >
                    <Text style={[styles.dayButtonText, workingDays[day.key] && styles.dayButtonTextActive]}>
                      {day.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.sectionLabel}>الفترة الصباحية</Text>
              <View style={styles.inputRow}>
                <View style={styles.inputHalf}>
                  <Text style={styles.inputLabel}>من</Text>
                  <TextInput
                    style={styles.input}
                    value={morningStart}
                    onChangeText={setMorningStart}
                    placeholder="09:00"
                    textAlign="center"
                  />
                </View>
                <View style={styles.inputHalf}>
                  <Text style={styles.inputLabel}>إلى</Text>
                  <TextInput
                    style={styles.input}
                    value={morningEnd}
                    onChangeText={setMorningEnd}
                    placeholder="14:00"
                    textAlign="center"
                  />
                </View>
              </View>

              <Text style={styles.sectionLabel}>الفترة المسائية</Text>
              <View style={styles.inputRow}>
                <View style={styles.inputHalf}>
                  <Text style={styles.inputLabel}>من</Text>
                  <TextInput
                    style={styles.input}
                    value={eveningStart}
                    onChangeText={setEveningStart}
                    placeholder="16:00"
                    textAlign="center"
                  />
                </View>
                <View style={styles.inputHalf}>
                  <Text style={styles.inputLabel}>إلى</Text>
                  <TextInput
                    style={styles.input}
                    value={eveningEnd}
                    onChangeText={setEveningEnd}
                    placeholder="18:00"
                    textAlign="center"
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={handleAddShop}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.saveButtonText}>💾 حفظ المحل</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B3B24',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#0A2E1B',
    borderBottomWidth: 1,
    borderBottomColor: '#C9A84C',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#C9A84C',
  },
  logoutButton: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  scroll: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#C9A84C',
  },
  addButton: {
    backgroundColor: '#C9A84C',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  addButtonText: {
    color: '#0B3B24',
    fontSize: 18,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  shopCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  shopHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  shopInfo: {
    flex: 1,
  },
  shopName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0B3B24',
    marginBottom: 4,
  },
  shopUsername: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  shopPhone: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
  },
  shopStatus: {
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DC2626',
  },
  deleteButtonText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '90%',
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0B3B24',
  },
  closeButton: {
    fontSize: 24,
    color: '#6B7280',
  },
  modalScroll: {
    padding: 20,
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#DC2626',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 16,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '600',
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0B3B24',
    marginBottom: 12,
    marginTop: 8,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  inputHalf: {
    flex: 1,
  },
  inputThird: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 6,
    fontWeight: '600',
    textAlign: 'right',
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    padding: 12,
    fontSize: 15,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    color: '#1F2937',
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  dayButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    backgroundColor: '#F9FAFB',
  },
  dayButtonActive: {
    backgroundColor: '#0B3B24',
    borderColor: '#0B3B24',
  },
  dayButtonText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
  dayButtonTextActive: {
    color: '#C9A84C',
  },
  saveButton: {
    backgroundColor: '#0B3B24',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 20,
  },
  saveButtonDisabled: {
    backgroundColor: '#6B7280',
  },
  saveButtonText: {
    color: '#C9A84C',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
