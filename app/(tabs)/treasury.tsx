import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Modal, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { treasuryService, TreasuryBalance } from '@/lib/treasuryService';

export default function TreasuryScreen() {
  const [balances, setBalances] = useState<TreasuryBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingBalance, setEditingBalance] = useState<TreasuryBalance | null>(null);
  const [selectedBalance, setSelectedBalance] = useState<TreasuryBalance | null>(null);
  const [formData, setFormData] = useState({
    currency_code: '',
    currency_name_ar: '',
    currency_name_he: '',
    currency_name_en: '',
    balance_amount: '',
    notes: ''
  });
  const router = useRouter();

  useEffect(() => {
    checkLoginStatus();
    loadBalances();
  }, []);

  const checkLoginStatus = async () => {
    try {
      const isAdminLoggedIn = await AsyncStorage.getItem('isAdminLoggedIn');
      if (!isAdminLoggedIn || isAdminLoggedIn !== 'true') {
        router.replace('/admin-login');
        return;
      }
    } catch (error) {
      console.log('Error checking login status:', error);
      router.replace('/admin-login');
    }
  };

  const loadBalances = async () => {
    try {
      setLoading(true);
      console.log('🔄 تحميل أرصدة الخزينة...');
      
      const balancesData = await treasuryService.getAll();
      setBalances(balancesData);
      
      console.log(`✅ تم تحميل ${balancesData.length} رصيد`);
    } catch (error) {
      console.error('❌ خطأ في تحميل الأرصدة:', error);
      Alert.alert('خطأ', 'حدث خطأ في تحميل أرصدة الخزينة');
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (balance: TreasuryBalance) => {
    setEditingBalance(balance);
    setFormData({
      currency_code: balance.currency_code,
      currency_name_ar: balance.currency_name_ar,
      currency_name_he: balance.currency_name_he,
      currency_name_en: balance.currency_name_en,
      balance_amount: balance.balance_amount.toString(),
      notes: balance.notes
    });
    setShowEditModal(true);
  };

  const openAddModal = () => {
    setFormData({
      currency_code: '',
      currency_name_ar: '',
      currency_name_he: '',
      currency_name_en: '',
      balance_amount: '0',
      notes: ''
    });
    setShowAddModal(true);
  };

  const closeModals = () => {
    setShowEditModal(false);
    setShowAddModal(false);
    setEditingBalance(null);
    setFormData({
      currency_code: '',
      currency_name_ar: '',
      currency_name_he: '',
      currency_name_en: '',
      balance_amount: '',
      notes: ''
    });
  };

  const saveBalance = async () => {
    if (!formData.currency_code.trim() || !formData.currency_name_ar.trim() || !formData.balance_amount.trim()) {
      Alert.alert('خطأ', 'يرجى إكمال الحقول المطلوبة');
      return;
    }

    const amount = parseFloat(formData.balance_amount);
    if (isNaN(amount) || amount < 0) {
      Alert.alert('خطأ', 'يرجى إدخال مبلغ صحيح');
      return;
    }

    try {
      if (editingBalance) {
        // تحديث رصيد موجود
        await treasuryService.update(editingBalance.id, {
          currency_name_ar: formData.currency_name_ar,
          currency_name_he: formData.currency_name_he,
          currency_name_en: formData.currency_name_en,
          balance_amount: amount,
          notes: formData.notes
        });
        
        Alert.alert('✅ تم التحديث', 'تم تحديث الرصيد بنجاح');
      } else {
        // إضافة رصيد جديد
        await treasuryService.create({
          currency_code: formData.currency_code.toUpperCase(),
          currency_name_ar: formData.currency_name_ar,
          currency_name_he: formData.currency_name_he,
          currency_name_en: formData.currency_name_en,
          balance_amount: amount,
          notes: formData.notes,
          last_updated: new Date().toISOString()
        });
        
        Alert.alert('✅ تم الإضافة', 'تم إضافة الرصيد بنجاح');
      }
      
      closeModals();
      await loadBalances();
    } catch (error) {
      console.error('❌ خطأ في حفظ الرصيد:', error);
      Alert.alert('❌ خطأ', 'حدث خطأ في حفظ الرصيد');
    }
  };

  const deleteBalance = async (balance: TreasuryBalance) => {
    Alert.alert(
      '🗑️ حذف الرصيد',
      `هل تريد حذف رصيد ${balance.currency_name_ar} (${balance.currency_code}) نهائياً؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'نعم، احذف',
          style: 'destructive',
          onPress: async () => {
            try {
              await treasuryService.delete(balance.id);
              await loadBalances();
              Alert.alert('✅ تم الحذف', 'تم حذف الرصيد بنجاح');
            } catch (error) {
              Alert.alert('❌ خطأ', 'حدث خطأ في حذف الرصيد');
            }
          }
        }
      ]
    );
  };

  const selectBalance = (balance: TreasuryBalance) => {
    setSelectedBalance(selectedBalance?.id === balance.id ? null : balance);
  };

  const getCurrencySymbol = (code: string) => {
    const symbols: { [key: string]: string } = {
      'ILS': '₪',
      'USD': '$',
      'EUR': '€'
    };
    return symbols[code] || code;
  };

  const getCurrencyFlag = (code: string) => {
    const flags: { [key: string]: string } = {
      'ILS': '🇮🇱',
      'USD': '🇺🇸',
      'EUR': '🇪🇺'
    };
    return flags[code] || '💰';
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('isAdminLoggedIn');
    await AsyncStorage.removeItem('adminLoginTime');
    await AsyncStorage.removeItem('adminUsername');
    router.replace('/admin-login');
  };

  const getTotalValue = () => {
    return balances.reduce((total, balance) => {
      if (balance.currency_code === 'ILS') {
        return total + balance.balance_amount;
      } else if (balance.currency_code === 'USD') {
        return total + (balance.balance_amount * 3.65); // تحويل تقريبي
      } else if (balance.currency_code === 'EUR') {
        return total + (balance.balance_amount * 3.95); // تحويل تقريبي
      }
      return total;
    }, 0);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.container, styles.centerContent]}>
          <Text style={styles.loadingText}>جاري تحميل أرصدة الخزينة...</Text>
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
          <Text style={styles.title}>إدارة أرصدة الخزينة</Text>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>خروج</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {/* إجمالي القيمة */}
          <View style={styles.totalValueContainer}>
            <Text style={styles.totalValueLabel}>إجمالي القيمة التقديرية:</Text>
            <Text style={styles.totalValueAmount}>
              {getTotalValue().toLocaleString('ar')} ₪
            </Text>
          </View>

          {/* زر إضافة رصيد جديد */}
          <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
            <Text style={styles.addButtonText}>➕ إضافة عملة جديدة</Text>
          </TouchableOpacity>

          {/* جدول الأرصدة */}
          <View style={styles.tableContainer}>
            <Text style={styles.tableTitle}>أرصدة الخزينة ({balances.length})</Text>
            
            {/* رأس الجدول */}
            <View style={styles.tableHeader}>
              <View style={styles.headerCell}>
                <Text style={styles.headerText}>العملة</Text>
              </View>
              <View style={styles.headerCell}>
                <Text style={styles.headerText}>الرصيد</Text>
              </View>
              <View style={styles.headerCell}>
                <Text style={styles.headerText}>آخر تحديث</Text>
              </View>
              <View style={styles.headerCell}>
                <Text style={styles.headerText}>الإجراءات</Text>
              </View>
            </View>

            {/* صفوف الجدول */}
            {balances.map((balance, index) => (
              <TouchableOpacity
                key={balance.id}
                style={[
                  styles.tableRow,
                  index % 2 === 0 ? styles.evenRow : styles.oddRow,
                  selectedBalance?.id === balance.id && styles.selectedRow
                ]}
                onPress={() => selectBalance(balance)}
              >
                <View style={styles.currencyCell}>
                  <Text style={styles.currencyFlag}>{getCurrencyFlag(balance.currency_code)}</Text>
                  <View style={styles.currencyInfo}>
                    <Text style={styles.currencyCode}>{balance.currency_code}</Text>
                    <Text style={styles.currencyName}>{balance.currency_name_ar}</Text>
                    <Text style={styles.currencyNameEn}>{balance.currency_name_en}</Text>
                  </View>
                </View>
                
                <View style={styles.balanceCell}>
                  <Text style={styles.balanceAmount}>
                    {balance.balance_amount.toLocaleString('ar')}
                  </Text>
                  <Text style={styles.currencySymbol}>
                    {getCurrencySymbol(balance.currency_code)}
                  </Text>
                </View>
                
                <View style={styles.dateCell}>
                  <Text style={styles.lastUpdated}>
                    {new Date(balance.last_updated).toLocaleDateString('ar')}
                  </Text>
                  <Text style={styles.lastUpdatedTime}>
                    {new Date(balance.last_updated).toLocaleTimeString('ar', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </Text>
                </View>
                
                <View style={styles.actionsCell}>
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => openEditModal(balance)}
                  >
                    <Text style={styles.editButtonText}>✏️</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => deleteBalance(balance)}
                  >
                    <Text style={styles.deleteButtonText}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}

            {/* رسالة عدم وجود أرصدة */}
            {balances.length === 0 && (
              <View style={styles.noBalancesContainer}>
                <Text style={styles.noBalancesText}>لا توجد أرصدة محفوظة</Text>
                <Text style={styles.noBalancesSubText}>يرجى إضافة أرصدة جديدة</Text>
              </View>
            )}
          </View>

          {/* معلومات الرصيد المختار */}
          {selectedBalance && (
            <View style={styles.selectedBalanceContainer}>
              <Text style={styles.selectedBalanceTitle}>
                📋 تفاصيل الرصيد المختار:
              </Text>
              <View style={styles.selectedBalanceInfo}>
                <Text style={styles.selectedBalanceText}>
                  العملة: {selectedBalance.currency_name_ar} ({selectedBalance.currency_code})
                </Text>
                <Text style={styles.selectedBalanceText}>
                  الرصيد: {selectedBalance.balance_amount.toLocaleString('ar')} {getCurrencySymbol(selectedBalance.currency_code)}
                </Text>
                <Text style={styles.selectedBalanceText}>
                  آخر تحديث: {new Date(selectedBalance.last_updated).toLocaleString('ar')}
                </Text>
                {selectedBalance.notes && (
                  <Text style={styles.selectedBalanceText}>
                    الملاحظات: {selectedBalance.notes}
                  </Text>
                )}
              </View>
            </View>
          )}
        </View>

        {/* نافذة تعديل الرصيد */}
        <Modal
          visible={showEditModal}
          transparent={true}
          animationType="slide"
          onRequestClose={closeModals}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  تعديل رصيد {editingBalance?.currency_name_ar}
                </Text>
                <TouchableOpacity style={styles.closeButton} onPress={closeModals}>
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalContent}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>اسم العملة بالعربية:</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.currency_name_ar}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, currency_name_ar: text }))}
                    placeholder="شيقل إسرائيلي"
                    textAlign="right"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>اسم العملة بالعبرية:</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.currency_name_he}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, currency_name_he: text }))}
                    placeholder="שקל ישראלי"
                    textAlign="right"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>اسم العملة بالإنجليزية:</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.currency_name_en}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, currency_name_en: text }))}
                    placeholder="Israeli Shekel"
                    textAlign="left"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>المبلغ:</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.balance_amount}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, balance_amount: text }))}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                    textAlign="center"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>ملاحظات:</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={formData.notes}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, notes: text }))}
                    placeholder="ملاحظات إضافية..."
                    textAlign="right"
                    multiline={true}
                    numberOfLines={3}
                  />
                </View>

                <TouchableOpacity style={styles.saveButton} onPress={saveBalance}>
                  <Text style={styles.saveButtonText}>💾 حفظ التغييرات</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* نافذة إضافة رصيد جديد */}
        <Modal
          visible={showAddModal}
          transparent={true}
          animationType="slide"
          onRequestClose={closeModals}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>إضافة عملة جديدة</Text>
                <TouchableOpacity style={styles.closeButton} onPress={closeModals}>
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalContent}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>رمز العملة (مثل ILS, USD, EUR):</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.currency_code}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, currency_code: text.toUpperCase() }))}
                    placeholder="ILS"
                    maxLength={3}
                    autoCapitalize="characters"
                    textAlign="center"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>اسم العملة بالعربية:</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.currency_name_ar}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, currency_name_ar: text }))}
                    placeholder="شيقل إسرائيلي"
                    textAlign="right"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>اسم العملة بالعبرية:</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.currency_name_he}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, currency_name_he: text }))}
                    placeholder="שקל ישראלי"
                    textAlign="right"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>اسم العملة بالإنجليزية:</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.currency_name_en}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, currency_name_en: text }))}
                    placeholder="Israeli Shekel"
                    textAlign="left"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>المبلغ الأولي:</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.balance_amount}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, balance_amount: text }))}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                    textAlign="center"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>ملاحظات:</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={formData.notes}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, notes: text }))}
                    placeholder="ملاحظات إضافية..."
                    textAlign="right"
                    multiline={true}
                    numberOfLines={3}
                  />
                </View>

                <TouchableOpacity style={styles.saveButton} onPress={saveBalance}>
                  <Text style={styles.saveButtonText}>💾 حفظ العملة الجديدة</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>
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
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0369A1',
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
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  content: {
    marginBottom: 20,
  },
  totalValueContainer: {
    backgroundColor: '#DBEAFE',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  totalValueLabel: {
    fontSize: 16,
    color: '#1E40AF',
    fontWeight: '600',
    marginBottom: 8,
  },
  totalValueAmount: {
    fontSize: 24,
    color: '#1E40AF',
    fontWeight: 'bold',
  },
  addButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#059669',
    borderStyle: 'dashed',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  addButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#059669',
  },
  tableContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  tableTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    padding: 15,
    textAlign: 'center',
    backgroundColor: '#F3F4F6',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#0369A1',
    paddingVertical: 12,
  },
  headerCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  headerText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  evenRow: {
    backgroundColor: '#F9FAFB',
  },
  oddRow: {
    backgroundColor: '#FFFFFF',
  },
  selectedRow: {
    backgroundColor: '#DBEAFE',
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  currencyCell: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  currencyFlag: {
    fontSize: 24,
    marginRight: 10,
  },
  currencyInfo: {
    flex: 1,
  },
  currencyCode: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  currencyName: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  currencyNameEn: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 1,
  },
  balanceCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  balanceAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#059669',
  },
  currencySymbol: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  dateCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  lastUpdated: {
    fontSize: 12,
    color: '#6B7280',
  },
  lastUpdatedTime: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 2,
  },
  actionsCell: {
    flex: 0.8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  editButton: {
    backgroundColor: '#3B82F6',
    width: 35,
    height: 35,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButtonText: {
    fontSize: 16,
  },
  deleteButton: {
    backgroundColor: '#DC2626',
    width: 35,
    height: 35,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonText: {
    fontSize: 16,
  },
  noBalancesContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noBalancesText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  noBalancesSubText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  selectedBalanceContainer: {
    backgroundColor: '#EFF6FF',
    padding: 20,
    borderRadius: 12,
    marginTop: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  selectedBalanceTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E40AF',
    marginBottom: 12,
    textAlign: 'center',
  },
  selectedBalanceInfo: {
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 8,
    gap: 8,
  },
  selectedBalanceText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0369A1',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalContent: {
    padding: 20,
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
    borderWidth: 1,
    borderColor: '#D1D5DB',
    padding: 12,
    fontSize: 16,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: '#0369A1',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});