import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: 'none' }, // إخفاء شريط التبويب
      }}>
      <Tabs.Screen
        name="prices"
        options={{
          title: 'الأسعار',
          tabBarIcon: ({ size, color }) => (
            <Ionicons name="trending-up" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="customer-info"
        options={{
          title: 'معلومات الزبون',
          tabBarIcon: ({ size, color }) => (
            <Ionicons name="person-add" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="services"
        options={{
          title: 'الخدمات',
          tabBarIcon: ({ size, color }) => (
            <Ionicons name="business" size={size} color={color} />
          ),
        }}
      />
      {/* الصفحات الأخرى مخفية ولكن متاحة للوصول المباشر */}
      <Tabs.Screen
        name="staff"
        options={{
          href: null, // إخفاء من التبويب
        }}
      />
      <Tabs.Screen
        name="accounting"
        options={{
          href: null, // إخفاء من التبويب
        }}
      />
      <Tabs.Screen
        name="treasury"
        options={{
          title: 'الخزينة',
          tabBarIcon: ({ size, color }) => (
            <Ionicons name="wallet" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="company-settings"
        options={{
          href: null, // إخفاء من التبويب
        }}
      />
      <Tabs.Screen
        name="currency-management"
        options={{
          href: null, // إخفاء من التبويب
        }}
      />
      <Tabs.Screen
        name="ads-management"
        options={{
          href: null, // إخفاء من التبويب
        }}
      />
    </Tabs>
  );
}