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

interface Transaction {
  id: string;
  service_number: number;
  amount_paid: number;
  currency_paid: string;
  amount_received: number;
  currency_received: string;
  customer_id: string;
  notes: string;
  created_at: string;
  updated_at: string;
  customer_name?: string;
}

export default function TransactionsManagement() {
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 768;

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  // حقول التعديل
  const [amountPaid, setAmountPaid] = useState('');
  const [currencyPaid, setCurrencyPaid] = useState('');
  const [amountReceived, setAmountReceived] = useState('');
  const [currencyReceived, setCurrencyReceived] = useState('');

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
      fetchTransactions();
    } catch (error) {
      console.error('Error checking auth:', error);
      router.replace('/login');
    }
  };

  const fetchTransactions = async () => {
    try {
      setLoading(true);

      // جلب المعاملات
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (transactionsError) throw transactionsError;

      // جلب أسماء العملاء
      const customerIds = transactionsData?.map(t => t.customer_id).filter(Boolean) || [];
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('national_id, customer_name')
        .in('national_id', customerIds);

      if (customersError) throw customersError;

      // دمج البيانات
      const customersMap = new Map(
        customersData?.map(c => [c.national_id, c.customer_name]) || []
      );

      const enrichedTransactions = transactionsData?.map(transaction => ({
        ...transaction,
        customer_name: customersMap.get(transaction.customer_id) || 'غير متوفر'
      })) || [];

      setTransactions(enrichedTransactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      Alert.alert('خطأ', 'فشل في تحميل المعاملات');
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setAmountPaid(transaction.amount_paid.toString());
    setCurrencyPaid(transaction.currency_paid);
    setAmountReceived(transaction.amount_received.toString());
    setCurrencyReceived(transaction.currency_received);
    setModalVisible(true);
  };

  const handleUpdate = async () => {
    if (!selectedTransaction) return;

    // التحقق من البيانات
    if (!amountPaid || !currencyPaid || !amountReceived || !currencyReceived) {
      Alert.alert('تنبيه', 'يرجى ملء جميع الحقول');
      return;
    }

    try {
      setSaving(true);
      const { error } = await supabase
        .from('transactions')
        .update({
          amount_paid: parseFloat(amountPaid),
          currency_paid: currencyPaid,
          amount_received: parseFloat(amountReceived),
          currency_received: currencyReceived,
        })
        .eq('id', selectedTransaction.id);

      if (error) throw error;

      Alert.alert('نجح', 'تم تحديث المعاملة بنجاح');
      setModalVisible(false);
      fetchTransactions();
    } catch (error) {
      console.error('Error updating transaction:', error);
      Alert.alert('خطأ', 'فشل في تحديث المعاملة');
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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← رجوع</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>إدارة المعاملات</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>تسجيل الخروج</Text>
        </TouchableOpacity>
      </View>

      {/* Table */}
      <ScrollView style={styles.scrollView} horizontal={!isLargeScreen}>
        <View style={styles.tableContainer}>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.headerCell, styles.nameCell]}>اسم الزبون</Text>
            <Text style={[styles.headerCell, styles.serviceCell]}>رقم الخدمة</Text>
            <Text style={[styles.headerCell, styles.amountCell]}>المبلغ المدفوع</Text>
            <Text style={[styles.headerCell, styles.currencyCell]}>العملة المدفوعة</Text>
            <Text style={[styles.headerCell, styles.amountCell]}>المبلغ المستلم</Text>
            <Text style={[styles.headerCell, styles.currencyCell]}>العملة المستلمة</Text>
            <Text style={[styles.headerCell, styles.customerCell]}>رقم الهوية</Text>
            <Text style={[styles.headerCell, styles.dateCell]}>التاريخ</Text>
          </View>

          {/* Table Rows */}
          {transactions.map((transaction, index) => (
            <TouchableOpacity
              key={transaction.id}
              style={[styles.tableRow, index % 2 === 0 ? styles.evenRow : styles.oddRow]}
              onPress={() => openEditModal(transaction)}
            >
              <Text style={[styles.cell, styles.nameCell]} numberOfLines={1}>
                {transaction.customer_name || 'غير متوفر'}
              </Text>
              <Text style={[styles.cell, styles.serviceCell]}>{transaction.service_number}</Text>
              <Text style={[styles.cell, styles.amountCell]}>{transaction.amount_paid.toFixed(2)}</Text>
              <Text style={[styles.cell, styles.currencyCell]}>{transaction.currency_paid}</Text>
              <Text style={[styles.cell, styles.amountCell]}>{transaction.amount_received.toFixed(2)}</Text>
              <Text style={[styles.cell, styles.currencyCell]}>{transaction.currency_received}</Text>
              <Text style={[styles.cell, styles.customerCell]}>{transaction.customer_id || 'غير متوفر'}</Text>
              <Text style={[styles.cell, styles.dateCell]}>{formatDate(transaction.created_at)}</Text>
            </TouchableOpacity>
          ))}

          {transactions.length === 0 && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>لا توجد معاملات</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Edit Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isLargeScreen && styles.modalContentLarge]}>
            <Text style={styles.modalTitle}>تعديل المعاملة</Text>

            {selectedTransaction && (
              <ScrollView
                style={styles.modalScrollView}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.modalBody}>
                  <Text style={styles.infoText}>اسم الزبون: {selectedTransaction.customer_name || 'غير متوفر'}</Text>
                  <Text style={styles.infoText}>رقم الهوية: {selectedTransaction.customer_id || 'غير متوفر'}</Text>
                  <Text style={styles.infoText}>رقم الخدمة: {selectedTransaction.service_number}</Text>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>المبلغ المدفوع</Text>
                    <TextInput
                      style={styles.input}
                      value={amountPaid}
                      onChangeText={setAmountPaid}
                      keyboardType="decimal-pad"
                      placeholder="0.00"
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>العملة المدفوعة</Text>
                    <TextInput
                      style={styles.input}
                      value={currencyPaid}
                      onChangeText={setCurrencyPaid}
                      placeholder="ILS"
                      autoCapitalize="characters"
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>المبلغ المستلم</Text>
                    <TextInput
                      style={styles.input}
                      value={amountReceived}
                      onChangeText={setAmountReceived}
                      keyboardType="decimal-pad"
                      placeholder="0.00"
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>العملة المستلمة</Text>
                    <TextInput
                      style={styles.input}
                      value={currencyReceived}
                      onChangeText={setCurrencyReceived}
                      placeholder="ILS"
                      autoCapitalize="characters"
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
  nameCell: {
    width: 150,
  },
  idCell: {
    width: 120,
  },
  serviceCell: {
    width: 100,
  },
  amountCell: {
    width: 120,
  },
  currencyCell: {
    width: 100,
  },
  customerCell: {
    width: 120,
  },
  dateCell: {
    width: 150,
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
