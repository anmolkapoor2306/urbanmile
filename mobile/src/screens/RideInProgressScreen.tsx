import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton, SecondaryButton } from '@/src/components/Buttons';
import { MapPlaceholder } from '@/src/components/MapPlaceholder';
import { useThemeColors } from '@/src/context/AppContext';
import { radius, shadow, spacing } from '@/src/constants/theme';

export function RideInProgressScreen() {
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
    title: {
      color: c.ink,
      fontSize: 24,
      fontWeight: '900',
    },
    routeCard: {
      alignItems: 'center',
      backgroundColor: c.surfaceMuted,
      borderRadius: radius.lg,
      flexDirection: 'row',
      gap: spacing.md,
      marginTop: spacing.md,
      padding: spacing.md,
    },
    routeCopy: {
      flex: 1,
    },
    routeTitle: {
      color: c.ink,
      fontSize: 15,
      fontWeight: '900',
    },
    routeMeta: {
      color: c.muted,
      fontSize: 12,
      fontWeight: '700',
      marginTop: 3,
    },
    fareCard: {
      borderColor: c.border,
      borderRadius: radius.lg,
      borderWidth: 1,
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: spacing.md,
      padding: spacing.md,
    },
    label: {
      color: c.subtle,
      fontSize: 11,
      fontWeight: '900',
      textTransform: 'uppercase',
    },
    fare: {
      color: c.ink,
      fontSize: 24,
      fontWeight: '900',
      marginTop: 4,
    },
    payment: {
      color: c.ink,
      fontSize: 18,
      fontWeight: '900',
      marginTop: 7,
      textAlign: 'right',
    },
    actions: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    action: {
      flex: 1,
    },
    cancel: {
      backgroundColor: c.red,
      flex: 1,
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
          <Text style={styles.title}>Ride in progress</Text>
          <View style={styles.routeCard}>
            <Ionicons name="trail-sign" size={22} color={c.ink} />
            <View style={styles.routeCopy}>
              <Text style={styles.routeTitle}>On the way to Amritsar Airport</Text>
              <Text style={styles.routeMeta}>72 km · 1 hr 18 min remaining</Text>
            </View>
          </View>
          <View style={styles.fareCard}>
            <View>
              <Text style={styles.label}>Estimated fare</Text>
              <Text style={styles.fare}>₹3,250</Text>
            </View>
            <View>
              <Text style={styles.label}>Payment</Text>
              <Text style={styles.payment}>Cash</Text>
            </View>
          </View>
          <View style={styles.actions}>
            <SecondaryButton onPress={() => router.push('/completed' as Href)} style={styles.action}>Complete demo</SecondaryButton>
            <PrimaryButton onPress={() => router.push('/home')} style={styles.cancel}>Cancel ride</PrimaryButton>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}
