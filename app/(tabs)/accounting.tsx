import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function AccountingScreen() {
  const router = useRouter();

  useEffect(() => {
    checkLoginStatus();
  }, []);

  const checkLoginStatus = async () => {
    try {
      const isLoggedIn = await AsyncStorage.getItem('isLoggedIn');
      if (!isLoggedIn || isLoggedIn !== 'true') {
        // إذا لم يكن مسجل دخول، توجيه لصفحة تسجيل الدخول
        router.replace('/login');
        return;
      }
    } catch (error) {
      console.log('Error checking login status:', error);
      router.replace('/login');
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('isLoggedIn');
    await AsyncStorage.removeItem('loginTime');
    router.replace('/');
  };

  const navigateToCurrencyManagement = () => {
    router.push('/(tabs)/currency-management');
  };

  const navigateToAdsManagement = () => {
    router.push('/(tabs)/ads-management');
  };

  return (
    <SafeAreaView style={styles.container}>
    <ScrollView 
      style={styles.scrollContainer}
      showsVerticalScrollIndicator={false}
      showsHorizontalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.title}>الإعدادات</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>خروج</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Settings Buttons */}
        <View style={styles.settingsContainer}>
          <TouchableOpacity 
            style={styles.settingButton}
            onPress={navigateToCurrencyManagement}
          >
            <View style={styles.buttonContent}>
              <Text style={styles.buttonIcon}>💱</Text>
              <View style={styles.buttonTextContainer}>
                <Text style={styles.buttonTitle}>إعدادات العملات والعمولات</Text>
                <Text style={styles.buttonDescription}>إدارة العملات وتحديد العمولات</Text>
              </View>
              <Text style={styles.buttonArrow}>←</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.settingButton}
            onPress={navigateToAdsManagement}
          >
            <View style={styles.buttonContent}>
              <Text style={styles.buttonIcon}>📢</Text>
              <View style={styles.buttonTextContainer}>
                <Text style={styles.buttonTitle}>إعدادات الإعلانات</Text>
                <Text style={styles.buttonDescription}>إدارة وتعديل الإعلانات</Text>
              </View>
              <Text style={styles.buttonArrow}>←</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.settingButton}
            onPress={() => router.push('/(tabs)/company-settings')}
          >
            <View style={styles.buttonContent}>
              <Text style={styles.buttonIcon}>🏢</Text>
              <View style={styles.buttonTextContainer}>
                <Text style={styles.buttonTitle}>إعدادات الشركة</Text>
                <Text style={styles.buttonDescription}>تحديد معلومات الشركة وساعات العمل</Text>
              </View>
              <Text style={styles.buttonArrow}>←</Text>
            </View>
          </TouchableOpacity>
        </View>
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
    color: '#7C3AED',
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
  content: {
    marginBottom: 20,
  },
  settingsContainer: {
    gap: 15,
  },
  settingButton: {
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
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  buttonIcon: {
    fontSize: 24,
    marginRight: 15,
  },
  buttonTextContainer: {
    flex: 1,
  },
  buttonTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  buttonDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  buttonArrow: {
    fontSize: 18,
    color: '#7C3AED',
  },
});