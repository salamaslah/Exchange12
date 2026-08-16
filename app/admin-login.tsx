import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { exchangeShopService } from '@/lib/supabase';

export default function AdminLoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setError('يرجى إدخال اسم المستخدم وكلمة المرور');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await exchangeShopService.login(username, password);

      if (result.success && result.shop) {
        await AsyncStorage.setItem('isAdminLoggedIn', 'true');
        await AsyncStorage.setItem('adminLoginTime', new Date().toISOString());
        await AsyncStorage.setItem('adminUsername', result.shop.username);

        router.replace('/(tabs)/accounting');
      } else {
        setError(result.error || 'اسم المستخدم أو كلمة المرور غير صحيحة');
      }
    } catch (error) {
      setError('حدث خطأ في تسجيل الدخول');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Text style={styles.backButtonText}>← العودة</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.loginContainer}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>⚙️</Text>
          </View>

          <Text style={styles.title}>تسجيل الدخول للإدارة</Text>
          <Text style={styles.subtitle}>يرجى إدخال بيانات المدير للوصول إلى إعدادات الشركة</Text>

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>اسم المستخدم:</Text>
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={(t) => { setUsername(t); setError(null); }}
                placeholder="admin"
                textAlign="right"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>كلمة المرور:</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={(t) => { setPassword(t); setError(null); }}
                placeholder="••••••"
                textAlign="right"
                secureTextEntry={true}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
                onSubmitEditing={handleLogin}
              />
            </View>

            <TouchableOpacity
              style={[styles.loginButton, loading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.loginButtonText}>تسجيل الدخول</Text>
              )}
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
    backgroundColor: '#F0FDF4',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    marginTop: 20,
    marginBottom: 40,
  },
  backButton: {
    backgroundColor: '#6B7280',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  loginContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    maxWidth: 400,
    alignSelf: 'center',
    width: '100%',
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  logoText: {
    fontSize: 40,
    color: '#FFFFFF',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#065F46',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 40,
    textAlign: 'center',
    lineHeight: 24,
  },
  errorBox: {
    backgroundColor: 'rgba(208, 48, 47, 0.1)',
    borderWidth: 1,
    borderColor: '#D0302F',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 16,
    width: '100%',
  },
  errorText: {
    color: '#D0302F',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '600',
  },
  formContainer: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    marginBottom: 30,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 8,
    fontWeight: '600',
    textAlign: 'right',
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
  loginButton: {
    backgroundColor: '#059669',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  loginButtonDisabled: {
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0,
    elevation: 0,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
