import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useThemeColors } from '@/src/context/AppContext';
import { radius, shadow, spacing } from '@/src/constants/theme';

export type PickerCoordinate = {
  latitude: number;
  longitude: number;
};

export function LocationPickerMap(_: {
  coordinate?: PickerCoordinate;
  onCoordinateChange?: (coordinate: PickerCoordinate) => void;
}) {
  const c = useThemeColors();
  const styles = useMemo(() => StyleSheet.create({
    map: {
      alignItems: 'center',
      backgroundColor: '#dde6dc',
      flex: 1,
      justifyContent: 'center',
      padding: spacing.md,
    },
    card: {
      alignItems: 'center',
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      flexDirection: 'row',
      gap: spacing.sm,
      padding: spacing.md,
      ...shadow,
    },
    text: {
      color: c.ink,
      flex: 1,
      fontSize: 14,
      fontWeight: '900',
      lineHeight: 20,
    },
  }), [c]);

  return (
    <View style={styles.map}>
      <View style={styles.card}>
        <Ionicons name="map" size={22} color={c.ink} />
        <Text style={styles.text}>Native map picker is available in Expo Go.</Text>
      </View>
    </View>
  );
}
