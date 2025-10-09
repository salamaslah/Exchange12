import { Stack } from 'expo-router';

export default function ServicesLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="exchange" options={{ title: '' }} />
      <Stack.Screen name="transfer" options={{ title: '' }} />
      <Stack.Screen name="remittance" options={{ title: '' }} />
      <Stack.Screen name="check" options={{ title: '' }} />
      <Stack.Screen name="bank" options={{ title: '' }} />
      <Stack.Screen name="withdraw" options={{ title: '' }} />
      <Stack.Screen name="deposit" options={{ title: '' }} />
      <Stack.Screen name="visa-creation" options={{ title: '' }} />
    </Stack>
  );
}