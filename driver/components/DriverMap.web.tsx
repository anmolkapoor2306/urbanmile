import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { colors, shadow, spacing } from '@/constants/theme';

export type DriverRegion = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

export function DriverMap({ region }: { region: DriverRegion; recenterKey: number }) {
  return (
    <View style={styles.map}>
      <View style={[styles.road, styles.roadOne]} />
      <View style={[styles.road, styles.roadTwo]} />
      <View style={styles.routeGlow} />
      <View style={styles.vehicleMarker}>
        <Ionicons name="car-sport" size={24} color={colors.background} />
      </View>
      <Text style={styles.mapLabel}>
        Interactive native map on mobile - {region.latitude.toFixed(4)}, {region.longitude.toFixed(4)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  map: {
    backgroundColor: '#f4f1ea',
    bottom: 0,
    left: 0,
    overflow: 'hidden',
    position: 'absolute',
    right: 0,
    top: 0,
  },
  road: {
    backgroundColor: '#d8d2c8',
    borderRadius: 999,
    height: 38,
    opacity: 0.95,
    position: 'absolute',
  },
  roadOne: {
    left: -40,
    right: -40,
    top: 230,
    transform: [{ rotate: '-23deg' }],
  },
  roadTwo: {
    left: -80,
    right: 80,
    top: 420,
    transform: [{ rotate: '28deg' }],
  },
  routeGlow: {
    backgroundColor: colors.yellow,
    borderRadius: 999,
    height: 7,
    left: 60,
    opacity: 0.78,
    position: 'absolute',
    right: 70,
    top: 320,
    transform: [{ rotate: '-23deg' }],
  },
  vehicleMarker: {
    alignItems: 'center',
    backgroundColor: colors.yellow,
    borderColor: '#fff',
    borderRadius: 999,
    borderWidth: 3,
    height: 54,
    justifyContent: 'center',
    left: '45%',
    position: 'absolute',
    top: '43%',
    width: 54,
    ...shadow,
  },
  mapLabel: {
    bottom: 248,
    color: '#52525b',
    fontSize: 12,
    fontWeight: '900',
    left: spacing.md,
    letterSpacing: 1,
    position: 'absolute',
    right: spacing.md,
    textTransform: 'uppercase',
  },
});
