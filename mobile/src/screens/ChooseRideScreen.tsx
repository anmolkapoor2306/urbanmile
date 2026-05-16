import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '@/src/components/Buttons';
import { MapPlaceholder } from '@/src/components/MapPlaceholder';
import { useThemeColors } from '@/src/context/AppContext';
import { radius, shadow, spacing } from '@/src/constants/theme';
import { rideOptions } from '@/src/data/mock';
import { pointFromParams, type RidePlanParams } from '@/src/types/ridePlan';

const defaultPickup = {
  label: 'Current location',
  latitude: 31.326,
  longitude: 75.5762,
};

const defaultDropoff = {
  label: 'Selected destination',
  latitude: 31.7096,
  longitude: 74.7973,
};

export function ChooseRideScreen() {
  const router = useRouter();
  const c = useThemeColors();
  const params = useLocalSearchParams<RidePlanParams>();
  const pickup = pointFromParams(params, 'pickup', defaultPickup);
  const dropoff = pointFromParams(params, 'dropoff', defaultDropoff);

  const styles = useMemo(() => StyleSheet.create({
    screen: {
      backgroundColor: c.background,
      flex: 1,
    },
    mapWrap: {
      flex: 1,
    },
    mapHeader: {
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
    sheet: {
      backgroundColor: c.surface,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      flex: 1.25,
    },
    sheetContent: {
      padding: spacing.md,
      paddingBottom: spacing.xl,
    },
    routeSummary: {
      backgroundColor: c.surfaceMuted,
      borderRadius: radius.lg,
      flexDirection: 'row',
      gap: spacing.md,
      padding: spacing.md,
    },
    routeLine: {
      alignItems: 'center',
    },
    routeDot: {
      borderRadius: 999,
      height: 11,
      width: 11,
    },
    pickupDot: {
      backgroundColor: c.green,
    },
    dropoffDot: {
      backgroundColor: c.yellowDark,
    },
    routeConnector: {
      backgroundColor: c.border,
      flex: 1,
      minHeight: 28,
      width: 1,
    },
    routeCopy: {
      flex: 1,
      gap: spacing.md,
    },
    routeText: {
      color: c.ink,
      fontSize: 14,
      fontWeight: '800',
    },
    title: {
      color: c.ink,
      fontSize: 22,
      fontWeight: '900',
      marginTop: spacing.lg,
    },
    rideOption: {
      alignItems: 'center',
      borderColor: c.border,
      borderRadius: radius.lg,
      borderWidth: 1,
      flexDirection: 'row',
      gap: spacing.md,
      marginTop: spacing.sm,
      padding: spacing.md,
    },
    rideOptionActive: {
      borderColor: c.yellowDark,
      backgroundColor: '#fff9df',
    },
    carIcon: {
      alignItems: 'center',
      backgroundColor: c.yellow,
      borderRadius: 18,
      height: 44,
      justifyContent: 'center',
      width: 44,
    },
    rideCopy: {
      flex: 1,
    },
    rideName: {
      color: c.ink,
      fontSize: 16,
      fontWeight: '900',
    },
    rideMeta: {
      color: c.muted,
      fontSize: 12,
      fontWeight: '800',
      marginTop: 3,
    },
    rideNote: {
      color: c.subtle,
      fontSize: 11,
      fontWeight: '700',
      marginTop: 3,
    },
    fare: {
      color: c.ink,
      fontSize: 16,
      fontWeight: '900',
    },
    utilityRow: {
      alignItems: 'center',
      borderColor: c.border,
      borderRadius: radius.md,
      borderWidth: 1,
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.sm,
      minHeight: 52,
      paddingHorizontal: spacing.md,
    },
    utilityText: {
      color: c.ink,
      flex: 1,
      fontSize: 15,
      fontWeight: '900',
    },
    utilityMeta: {
      color: c.yellowDark,
      fontSize: 12,
      fontWeight: '900',
    },
    confirmButton: {
      marginTop: spacing.lg,
    },
  }), [c]);

  return (
    <View style={styles.screen}>
      <View style={styles.mapWrap}>
        <MapPlaceholder variant="route" />
        <SafeAreaView style={styles.mapHeader}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={c.ink} />
          </Pressable>
        </SafeAreaView>
      </View>

      <ScrollView style={styles.sheet} contentContainerStyle={styles.sheetContent} showsVerticalScrollIndicator={false}>
        <View style={styles.routeSummary}>
          <RouteLine
            greenColor={c.green}
            yellowDarkColor={c.yellowDark}
            borderColor={c.border}
          />
          <View style={styles.routeCopy}>
            <Text numberOfLines={2} style={styles.routeText}>{pickup.label}</Text>
            <Text numberOfLines={2} style={styles.routeText}>{dropoff.label}</Text>
          </View>
        </View>

        <Text style={styles.title}>Choose your ride</Text>
        {rideOptions.map((ride, index) => (
          <Pressable key={ride.id} style={[styles.rideOption, index === 0 && styles.rideOptionActive]}>
            <View style={styles.carIcon}>
              <Ionicons name={ride.id === 'xl' ? 'bus' : 'car-sport'} size={24} color={c.ink} />
            </View>
            <View style={styles.rideCopy}>
              <Text style={styles.rideName}>{ride.name}</Text>
              <Text style={styles.rideMeta}>{ride.eta} · {ride.capacity}</Text>
              <Text style={styles.rideNote}>{ride.note}</Text>
            </View>
            <Text style={styles.fare}>{ride.fare}</Text>
          </Pressable>
        ))}

        <Pressable onPress={() => router.push('/coupon' as Href)} style={styles.utilityRow}>
          <Ionicons name="ticket" size={20} color={c.ink} />
          <Text style={styles.utilityText}>Apply coupon</Text>
          <Ionicons name="chevron-forward" size={18} color={c.subtle} />
        </Pressable>

        <View style={styles.utilityRow}>
          <Ionicons name="cash" size={20} color={c.ink} />
          <Text style={styles.utilityText}>Cash payment</Text>
          <Text style={styles.utilityMeta}>Change</Text>
        </View>

        <PrimaryButton onPress={() => router.push('/tracking' as Href)} style={styles.confirmButton}>Confirm Miles Eco</PrimaryButton>
      </ScrollView>
    </View>
  );
}

function RouteLine({ greenColor, yellowDarkColor, borderColor }: { greenColor: string; yellowDarkColor: string; borderColor: string }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ borderRadius: 999, height: 11, width: 11, backgroundColor: greenColor }} />
      <View style={{ backgroundColor: borderColor, flex: 1, minHeight: 28, width: 1 }} />
      <View style={{ borderRadius: 999, height: 11, width: 11, backgroundColor: yellowDarkColor }} />
    </View>
  );
}
