import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '@/constants/theme';

export function MapPlaceholder({ label = 'Route preview' }: { label?: string }) {
  return (
    <View style={styles.map}>
      <View style={styles.road} />
      <View style={[styles.node, styles.start]} />
      <View style={[styles.node, styles.end]} />
      <Ionicons name="navigate" size={22} color={colors.yellow} style={styles.icon} />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  map: {
    backgroundColor: '#0c0c0f',
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    height: 190,
    marginVertical: spacing.md,
    overflow: 'hidden',
    position: 'relative',
  },
  road: {
    backgroundColor: colors.yellow,
    borderRadius: 999,
    height: 4,
    left: 42,
    opacity: 0.7,
    position: 'absolute',
    right: 48,
    top: 98,
    transform: [{ rotate: '-18deg' }],
  },
  node: {
    borderColor: '#fff',
    borderRadius: 999,
    borderWidth: 3,
    height: 18,
    position: 'absolute',
    width: 18,
  },
  start: {
    backgroundColor: colors.green,
    left: 42,
    top: 116,
  },
  end: {
    backgroundColor: colors.yellow,
    right: 50,
    top: 63,
  },
  icon: {
    left: '48%',
    position: 'absolute',
    top: 76,
  },
  label: {
    bottom: spacing.md,
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
    left: spacing.md,
    position: 'absolute',
  },
});
