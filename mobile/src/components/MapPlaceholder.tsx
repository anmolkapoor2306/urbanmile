import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useThemeColors } from '@/src/context/AppContext';
import { radius, shadow, spacing } from '@/src/constants/theme';

export function MapPlaceholder({
  variant = 'city',
  showCar = false,
}: {
  variant?: 'city' | 'route';
  showCar?: boolean;
}) {
  const c = useThemeColors();
  const styles = useMemo(() => StyleSheet.create({
    map: {
      backgroundColor: '#dde6dc',
      flex: 1,
      overflow: 'hidden',
      position: 'relative',
    },
    road: {
      backgroundColor: '#ffffff',
      borderColor: '#c8d4c8',
      borderRadius: 999,
      borderWidth: 1,
      height: 38,
      position: 'absolute',
    },
    roadOne: {
      left: -40,
      right: -50,
      top: 150,
      transform: [{ rotate: '-18deg' }],
    },
    roadTwo: {
      left: -80,
      right: 30,
      top: 310,
      transform: [{ rotate: '27deg' }],
    },
    roadThree: {
      bottom: 130,
      left: 160,
      right: -140,
      transform: [{ rotate: '86deg' }],
    },
    block: {
      backgroundColor: '#c3dcc1',
      borderRadius: 22,
      opacity: 0.8,
      position: 'absolute',
    },
    blockOne: {
      height: 90,
      left: 26,
      top: 76,
      width: 110,
    },
    blockTwo: {
      height: 130,
      right: -20,
      top: 210,
      width: 150,
    },
    blockThree: {
      bottom: 66,
      height: 120,
      left: -18,
      width: 150,
    },
    routeLine: {
      backgroundColor: c.yellowDark,
      borderRadius: 999,
      height: 8,
      left: 48,
      position: 'absolute',
      right: 64,
      top: 238,
      transform: [{ rotate: '21deg' }],
    },
    pin: {
      borderColor: c.surface,
      borderRadius: 999,
      borderWidth: 3,
      height: 18,
      position: 'absolute',
      width: 18,
    },
    pickupPin: {
      backgroundColor: c.green,
      left: 68,
      top: 254,
    },
    dropoffPin: {
      backgroundColor: c.yellow,
      right: 78,
      top: 210,
    },
    carMarker: {
      alignItems: 'center',
      backgroundColor: c.yellow,
      borderColor: c.surface,
      borderRadius: 999,
      borderWidth: 3,
      height: 46,
      justifyContent: 'center',
      left: '48%',
      position: 'absolute',
      top: '42%',
      width: 46,
      ...shadow,
    },
    mapBadge: {
      alignItems: 'center',
      backgroundColor: c.surface,
      borderRadius: radius.md,
      bottom: spacing.lg,
      flexDirection: 'row',
      gap: spacing.xs,
      left: spacing.lg,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      position: 'absolute',
      ...shadow,
    },
    mapBadgeText: {
      color: c.ink,
      fontSize: 12,
      fontWeight: '900',
    },
  }), [c]);

  return (
    <View style={styles.map}>
      <View style={[styles.road, styles.roadOne]} />
      <View style={[styles.road, styles.roadTwo]} />
      <View style={[styles.road, styles.roadThree]} />
      <View style={[styles.block, styles.blockOne]} />
      <View style={[styles.block, styles.blockTwo]} />
      <View style={[styles.block, styles.blockThree]} />
      {variant === 'route' ? <View style={styles.routeLine} /> : null}
      <View style={[styles.pin, styles.pickupPin]} />
      <View style={[styles.pin, styles.dropoffPin]} />
      {showCar ? (
        <View style={styles.carMarker}>
          <Ionicons name="car-sport" size={20} color={c.ink} />
        </View>
      ) : null}
      <View style={styles.mapBadge}>
        <Ionicons name="map" size={14} color={c.ink} />
        <Text style={styles.mapBadgeText}>Map preview</Text>
      </View>
    </View>
  );
}
