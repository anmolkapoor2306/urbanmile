import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '@/src/components/Buttons';
import { MapPlaceholder } from '@/src/components/MapPlaceholder';
import { useThemeColors } from '@/src/context/AppContext';
import { radius, shadow, spacing } from '@/src/constants/theme';
import { activeDriver } from '@/src/data/mock';

export function RideTrackingScreen() {
  const router = useRouter();
  const c = useThemeColors();

  const styles = useMemo(() => StyleSheet.create({
    screen: {
      flex: 1,
    },
    overlay: {
      bottom: 0,
      left: 0,
      padding: spacing.md,
      position: 'absolute',
      right: 0,
      top: 0,
    },
    backButton: {
      alignItems: 'center',
      backgroundColor: c.surface,
      borderRadius: 999,
      height: 48,
      justifyContent: 'center',
      width: 48,
      ...shadow,
    },
    card: {
      backgroundColor: c.surface,
      borderRadius: radius.xl,
      marginTop: 'auto',
      padding: spacing.md,
      ...shadow,
    },
    arriving: {
      color: c.ink,
      fontSize: 24,
      fontWeight: '900',
    },
    driverRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing.md,
      marginTop: spacing.md,
    },
    driverAvatar: {
      alignItems: 'center',
      backgroundColor: c.ink,
      borderRadius: 999,
      height: 54,
      justifyContent: 'center',
      width: 54,
    },
    driverInitials: {
      color: c.yellow,
      fontSize: 17,
      fontWeight: '900',
    },
    driverCopy: {
      flex: 1,
    },
    driverName: {
      color: c.ink,
      fontSize: 17,
      fontWeight: '900',
    },
    vehicle: {
      color: c.muted,
      fontSize: 12,
      fontWeight: '700',
      marginTop: 3,
    },
    otpBox: {
      alignItems: 'center',
      backgroundColor: c.surfaceMuted,
      borderRadius: radius.sm,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
    },
    otpLabel: {
      color: c.subtle,
      fontSize: 10,
      fontWeight: '900',
    },
    otp: {
      color: c.ink,
      fontSize: 18,
      fontWeight: '900',
    },
    actions: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    actionButton: {
      alignItems: 'center',
      backgroundColor: c.yellow,
      borderRadius: 999,
      flex: 1,
      height: 48,
      justifyContent: 'center',
    },
    button: {
      marginTop: spacing.md,
    },
  }), [c]);

  return (
    <View style={styles.screen}>
      <MapPlaceholder variant="route" showCar />
      <SafeAreaView pointerEvents="box-none" style={styles.overlay}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={c.ink} />
        </Pressable>
        <View style={styles.card}>
          <Text style={styles.arriving}>Driver arriving in {activeDriver.eta}</Text>
          <View style={styles.driverRow}>
            <View style={styles.driverAvatar}>
              <Text style={styles.driverInitials}>HS</Text>
            </View>
            <View style={styles.driverCopy}>
              <Text style={styles.driverName}>{activeDriver.name}</Text>
              <Text style={styles.vehicle}>{activeDriver.car} · {activeDriver.vehicle}</Text>
            </View>
            <View style={styles.otpBox}>
              <Text style={styles.otpLabel}>OTP</Text>
              <Text style={styles.otp}>{activeDriver.otp}</Text>
            </View>
          </View>
          <View style={styles.actions}>
            {(['call', 'chatbubble', 'share-social'] as const).map((icon) => (
              <Pressable key={icon} style={styles.actionButton}>
                <Ionicons name={icon} size={20} color={c.ink} />
              </Pressable>
            ))}
          </View>
          <PrimaryButton onPress={() => router.push('/in-progress' as Href)} style={styles.button}>Start mock trip</PrimaryButton>
        </View>
      </SafeAreaView>
    </View>
  );
}
