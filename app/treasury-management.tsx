import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface TreasuryBalance {
  id: string;
  currency_code: string;
  currency_name_ar: string;
  currency_name_he: string;
  currency_name_en: string;
  balance_amount: number;
  last_updated: string;
  notes: string;
}

export default function TreasuryManagement() {
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 768;

  const [balances, setBalances] = useState<TreasuryBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBalance, setSelectedBalance] = useState<TreasuryBalance | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  const [balanceAmount, setBalanceAmount] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const isLoggedIn = await AsyncStorage.getItem('isLoggedIn');
      if (!isLoggedIn || isLoggedIn !== 'true') {
        router.replace('/login');
        return;
      }
      fetchBalances();
    } catch (error) {
      console.error('Error checking auth:', error);
      router.replace('/login');
    }
  };

  const fetchBalances = async () => {
    try {
      setLoading(true);

      const { data: currenciesData, error: currenciesError } = await supabase
        .from('currencies')
        .select('code, name_ar');

      if (currenciesError) throw currenciesError;

      const { data: balancesData, error: balancesError } = await supabase
        .from('treasury_balances')
        .select('*')
        .order('currency_code', { ascending: true });

      if (balancesError) throw balancesError;

      const existingCodes = new Set(balancesData?.map(b => b.currency_code) || []);
      const allCurrencies = currenciesData || [];

      if (!existingCodes.has('ILS')) {
        const { error: insertError } = await supabase
          .from('treasury_balances')
          .insert({
            currency_code: 'ILS',
            currency_name_ar: 'شيقل إسرائيلي',
            currency_name_he: 'שקל ישראלי',
            currency_name_en: 'Israeli Shekel',
            balance_amount: 0,
            notes: ''
          });

        if (insertError && !insertError.message.includes('duplicate')) {
          console.error('Error inserting ILS:', insertError);
        }
      }

      for (const currency of allCurrencies) {
        if (!existingCodes.has(currency.code)) {
          const { error: insertError } = await supabase
            .from('treasury_balances')
            .insert({
              currency_code: currency.code,
              currency_name_ar: currency.name_ar,
              currency_name_he: '',
              currency_name_en: currency.code,
              balance_amount: 0,
              notes: ''
            });

          if (insertError && !insertError.message.includes('duplicate')) {
            console.error(`Error inserting ${currency.code}:`, insertError);
          }
        }
      }

      const { data: finalBalances, error: finalError } = await supabase
        .from('treasury_balances')
        .select('*')
        .order('currency_code', { ascending: true });

      if (finalError) throw finalError;

      setBalances(finalBalances || []);
    } catch (error) {
      console.error('Error fetching balances:', error);
      Alert.alert('خطأ', 'فشل في تحميل أرصدة الخزينة');
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (balance: TreasuryBalance) => {
    setSelectedBalance(balance);
    setBalanceAmount(balance.balance_amount.toString());
    setNotes(balance.notes || '');
    setModalVisible(true);
  };

  const handleUpdate = async () => {
    if (!selectedBalance) return;

    if (!balanceAmount) {
      Alert.alert('تنبيه', 'يرجى إدخال المبلغ');
      return;
    }

    try {
      setSaving(true);
      const { error } = await supabase
        .from('treasury_balances')
        .update({
          balance_amount: parseFloat(balanceAmount),
          notes: notes,
          last_updated: new Date().toISOString(),
        })
        .eq('id', selectedBalance.id);

      if (error) throw error;

      Alert.alert('نجح', 'تم تحديث الرصيد بنجاح');
      setModalVisible(false);
      fetchBalances();
    } catch (error) {
      console.error('Error updating balance:', error);
      Alert.alert('خطأ', 'فشل في تحديث الرصيد');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('isLoggedIn');
    await AsyncStorage.removeItem('loginTime');
    router.replace('/login');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#059669" />
        <Text style={styles.loadingText}>جاري التحميل...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← رجوع</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>إدارة الخزينة</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>تسجيل الخروج</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} horizontal={!isLargeScreen}>
        <View style={styles.tableContainer}>
          <View style={styles.tableHeader}>
            <Text style={[styles.headerCell, styles.codeCell]}>رمز العملة</Text>
            <Text style={[styles.headerCell, styles.nameCell]}>اسم العملة</Text>
            <Text style={[styles.headerCell, styles.balanceCell]}>الرصيد</Text>
            <Text style={[styles.headerCell, styles.dateCell]}>آخر تحديث</Text>
            <Text style={[styles.headerCell, styles.notesCell]}>ملاحظات</Text>
          </View>

          {balances.map((balance, index) => (
            <TouchableOpacity
              key={balance.id}
              style={[styles.tableRow, index % 2 === 0 ? styles.evenRow : styles.oddRow]}
              onPress={() => openEditModal(balance)}
            >
              <Text style={[styles.cell, styles.codeCell]}>{balance.currency_code}</Text>
              <Text style={[styles.cell, styles.nameCell]}>{balance.currency_name_ar}</Text>
              <Text style={[styles.cell, styles.balanceCell]}>
                {balance.balance_amount.toFixed(2)}
              </Text>
              <Text style={[styles.cell, styles.dateCell]}>
                {formatDate(balance.last_updated)}
              </Text>
              <Text style={[styles.cell, styles.notesCell]} numberOfLines={2}>
                {balance.notes || '-'}
              </Text>
            </TouchableOpacity>
          ))}

          {balances.length === 0 && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>لا توجد أرصدة</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isLargeScreen && styles.modalContentLarge]}>
            <Text style={styles.modalTitle}>تعديل الرصيد</Text>

            {selectedBalance && (
              <ScrollView
                style={styles.modalScrollView}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.modalBody}>
                  <Text style={styles.infoText}>
                    العملة: {selectedBalance.currency_name_ar} ({selectedBalance.currency_code})
                  </Text>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>الرصيد الحالي</Text>
                    <TextInput
                      style={styles.input}
                      value={balanceAmount}
                      onChangeText={setBalanceAmount}
                      keyboardType="decimal-pad"
                      placeholder="0.00"
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>ملاحظات</Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      value={notes}
                      onChangeText={setNotes}
                      placeholder="أدخل الملاحظات..."
                      multiline
                      numberOfLines={4}
                      textAlignVertical="top"
                    />
                  </View>

                  <View style={styles.modalButtons}>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.cancelButton]}
                      onPress={() => setModalVisible(false)}
                      disabled={saving}
                    >
                      <Text style={styles.cancelButtonText}>إلغاء</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.saveButton]}
                      onPress={handleUpdate}
                      disabled={saving}
                    >
                      {saving ? (
                        <ActivityIndicator color="#FFF" size="small" />
                      ) : (
                        <Text style={styles.saveButtonText}>حفظ</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#059669',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  logoutButton: {
    padding: 8,
  },
  logoutButtonText: {
    fontSize: 14,
    color: '#DC2626',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  tableContainer: {
    margin: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#059669',
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  headerCell: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  evenRow: {
    backgroundColor: '#FFFFFF',
  },
  oddRow: {
    backgroundColor: '#F9FAFB',
  },
  cell: {
    fontSize: 13,
    color: '#374151',
    textAlign: 'center',
  },
  codeCell: {
    width: 120,
  },
  nameCell: {
    width: 150,
  },
  balanceCell: {
    width: 120,
  },
  dateCell: {
    width: 180,
  },
  notesCell: {
    width: 200,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    maxHeight: '80%',
  },
  modalContentLarge: {
    width: '60%',
    maxWidth: 600,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalScrollView: {
    maxHeight: '100%',
  },
  modalBody: {
    gap: 16,
  },
  infoText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  formGroup: {
    gap: 8,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#F9FAFB',
    textAlign: 'right',
  },
  textArea: {
    minHeight: 100,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  saveButton: {
    backgroundColor: '#059669',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
