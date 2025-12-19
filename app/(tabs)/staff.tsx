import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function StaffScreen() {
  const [requests, setRequests] = useState([]);
  const router = useRouter();

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      const savedRequests = await AsyncStorage.getItem('serviceRequests');
      if (savedRequests) {
        const allRequests = JSON.parse(savedRequests);
        const pendingRequests = allRequests.filter((req: any) => req.status === 'pending');
        setRequests(pendingRequests);
      }
    } catch (error) {
      console.log('Error loading requests:', error);
    }
  };

  const approveRequest = async (requestId: string) => {
    try {
      const savedRequests = await AsyncStorage.getItem('serviceRequests');
      if (savedRequests) {
        const allRequests = JSON.parse(savedRequests);
        const updatedRequests = allRequests.map((req: any) => 
          req.id === requestId ? { ...req, status: 'approved' } : req
        );
        await AsyncStorage.setItem('serviceRequests', JSON.stringify(updatedRequests));
        loadRequests();
        Alert.alert('تم', 'تم الموافقة على الطلب');
      }
    } catch (error) {
      Alert.alert('خطأ', 'حدث خطأ في الموافقة على الطلب');
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.clear();
    router.replace('/');
  };

  const getServiceName = (service: string) => {
    const services = {
      'exchange': 'صرافة أموال',
      'transfer': 'تحويل للخارج',
      'check': 'صرافة شيكات',
      'bank': 'تحويل لحساب بنك',
      'withdraw': 'سحب من الفيزا',
      'deposit': 'إيداع في الفيزا'
    };
    return services[service as keyof typeof services] || service;
  };

  return (
    <SafeAreaView style={styles.container}>
    <ScrollView
      style={styles.scrollContainer}
      showsVerticalScrollIndicator={false}
      showsHorizontalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.title}>طلبات الخدمات</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>خروج</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.requestsContainer}>
        {requests.length === 0 ? (
          <View style={styles.noRequestsContainer}>
            <Text style={styles.noRequestsText}>لا توجد طلبات جديدة</Text>
          </View>
        ) : (
          requests.map((request: any) => (
            <View key={request.id} style={styles.requestCard}>
              <Text style={styles.requestService}>{getServiceName(request.service)}</Text>
              <Text style={styles.requestCustomer}>رقم الهوية: {request.customerId}</Text>
              <Text style={styles.requestTime}>
                الوقت: {new Date(request.timestamp).toLocaleString('ar')}
              </Text>
              
              {request.service === 'exchange' && (
                <View style={styles.requestDetails}>
                  <Text style={styles.detailText}>العملية: {request.operation === 'buy' ? 'شراء' : 'بيع'}</Text>
                  <Text style={styles.detailText}>العملة: {request.currency === 'usd' ? 'دولار' : 'يورو'}</Text>
                  <Text style={styles.detailText}>المبلغ: {request.amount}</Text>
                  <Text style={styles.resultText}>{request.result}</Text>
                </View>
              )}

              {request.service === 'transfer' && (
                <View style={styles.requestDetails}>
                  <Text style={styles.detailText}>البلد: {request.country}</Text>
                  <Text style={styles.detailText}>العملة: {request.currency}</Text>
                  <Text style={styles.detailText}>المبلغ: {request.amount}</Text>
                </View>
              )}

              {request.service === 'check' && (
                <View style={styles.requestDetails}>
                  <Text style={styles.detailText}>مبلغ الشيك: {request.checkAmount}</Text>
                  <Text style={styles.detailText}>النوع: {request.checkType === 'current' ? 'حالي الصرف' : 'متأخر الصرف'}</Text>
                  <Text style={styles.detailText}>العمولة: {request.commission}</Text>
                  <Text style={styles.resultText}>{request.total}</Text>
                </View>
              )}

              <TouchableOpacity 
                style={styles.approveButton} 
                onPress={() => approveRequest(request.id)}
              >
                <Text style={styles.approveButtonText}>موافقة</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0FDF4',
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
    marginTop: 40,
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
  requestsContainer: {
    marginBottom: 20,
  },
  noRequestsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 100,
  },
  noRequestsText: {
    fontSize: 18,
    color: '#6B7280',
  },
  requestCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  requestService: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 10,
  },
  requestCustomer: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 5,
  },
  requestTime: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 15,
  },
  requestDetails: {
    backgroundColor: '#F9FAFB',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  resultText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#059669',
    marginTop: 5,
  },
  detailText: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 5,
  },
  approveButton: {
    backgroundColor: '#059669',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  approveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});