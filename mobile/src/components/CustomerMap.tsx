import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useThemeColors } from '@/src/context/AppContext';
import { radius, shadow, spacing } from '@/src/constants/theme';

export type CustomerRegion = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

export function CustomerMap(_: { region?: CustomerRegion; recenterKey?: number }) {
  const c = useThemeColors();
  const styles = useMemo(() => StyleSheet.create({
    map: {
      backgroundColor: '#dde6dc',
      bottom: 0,
      left: 0,
      overflow: 'hidden',
      position: 'absolute',
      right: 0,
      top: 0,
    },
    road: {
      backgroundColor: '#ffffff',
      borderColor: '#c8d4c8',
      borderRadius: 999,
      borderWidth: 1,
      height: 36,
      position: 'absolute',
    },
    roadOne: {
      left: -60,
      right: -60,
      top: 190,
      transform: [{ rotate: '-18deg' }],
    },
    roadTwo: {
      left: -80,
      right: 20,
      top: 360,
      transform: [{ rotate: '28deg' }],
    },
    block: {
      backgroundColor: '#c3dcc1',
      borderRadius: 22,
      opacity: 0.8,
      position: 'absolute',
    },
    blockOne: {
      height: 120,
      left: 28,
      top: 76,
      width: 150,
    },
    blockTwo: {
      height: 160,
      right: -28,
      top: 230,
      width: 170,
    },
    previewCard: {
      alignItems: 'center',
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      flexDirection: 'row',
      gap: spacing.sm,
      left: spacing.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      position: 'absolute',
      right: spacing.md,
      top: 120,
      ...shadow,
    },
    previewText: {
      color: c.ink,
      flex: 1,
      fontSize: 13,
      fontWeight: '900',
      lineHeight: 18,
    },
  }), [c]);

  return (
    <View style={styles.map}>
      <View style={[styles.road, styles.roadOne]} />
      <View style={[styles.road, styles.roadTwo]} />
      <View style={[styles.block, styles.blockOne]} />
      <View style={[styles.block, styles.blockTwo]} />
      <View style={styles.previewCard}>
        <Ionicons name="map" size={20} color={c.ink} />
        <Text style={styles.previewText}>Native map preview is available in Expo Go.</Text>
      </View>
    </View>
  );
}
