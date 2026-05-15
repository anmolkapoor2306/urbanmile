import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DriverNavigator } from '@/navigation/DriverNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <DriverNavigator />
      <StatusBar style="light" />
    </SafeAreaProvider>
  );
}
