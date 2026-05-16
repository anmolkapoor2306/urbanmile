import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomNav } from '@/src/components/BottomNav';
import { useThemeColors } from '@/src/context/AppContext';
import { radius, shadow, spacing } from '@/src/constants/theme';

export function WalletScreen() {
  const c = useThemeColors();

  const styles = useMemo(() => StyleSheet.create({
    safeArea: {
      backgroundColor: c.background,
      flex: 1,
    },
    content: {
      alignItems: 'center',
      justifyContent: 'center',
      flexGrow: 1,
      padding: spacing.md,
    },
    card: {
      alignItems: 'center',
      backgroundColor: c.surface,
      borderRadius: radius.xl,
      padding: spacing.xl,
      ...shadow,
    },
    iconWrap: {
      backgroundColor: c.surfaceMuted,
      borderRadius: 999,
      height: 80,
      width: 80,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.lg,
    },
    title: {
      color: c.ink,
      fontSize: 22,
      fontWeight: '900',
      marginBottom: spacing.xs,
    },
    subtitle: {
      color: c.muted,
      fontSize: 14,
      fontWeight: '700',
      textAlign: 'center',
      lineHeight: 20,
    },
  }), [c]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons name="wallet-outline" size={42} color={c.yellow} />
          </View>
          <Text style={styles.title}>Wallet coming soon</Text>
          <Text style={styles.subtitle}>
            Payments, refunds, and ride credits will appear here.
          </Text>
        </View>
      </ScrollView>
      <BottomNav active="wallet" />
    </SafeAreaView>
  );
}
