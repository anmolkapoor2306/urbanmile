import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useApp } from '@/src/context/AppContext';
import { WelcomeScreen } from '@/src/screens/WelcomeScreen';

export default function Index() {
  const { isLoggedIn } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (isLoggedIn) {
      router.replace('/home');
    }
  }, [isLoggedIn]);

  return <WelcomeScreen />;
}
