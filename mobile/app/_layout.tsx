import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { AppProvider } from '@/src/context/AppContext';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  return (
    <AppProvider>
      <ThemeProvider value={DefaultTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="home" />
          <Stack.Screen name="destination-search" />
          <Stack.Screen name="map-picker" />
          <Stack.Screen name="choose-ride" />
          <Stack.Screen name="coupon" options={{ presentation: 'transparentModal' }} />
          <Stack.Screen name="tracking" />
          <Stack.Screen name="in-progress" />
          <Stack.Screen name="completed" />
          <Stack.Screen name="ride-history" />
          <Stack.Screen name="profile" />
          <Stack.Screen name="settings" />
          <Stack.Screen name="wallet" />
          <Stack.Screen name="phone-login" />
          <Stack.Screen name="otp" />
        </Stack>
        <StatusBar style="dark" />
      </ThemeProvider>
    </AppProvider>
  );
}
