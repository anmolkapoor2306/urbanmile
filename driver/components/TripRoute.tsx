import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '@/constants/theme';

export function TripRoute({ pickup, dropoff }: { pickup: string; dropoff: string }) {
  return (
    <View style={styles.route}>
      <View style={styles.timeline}>
        <View style={[styles.dot, styles.pickup]} />
        <View style={styles.line} />
        <View style={[styles.dot, styles.dropoff]} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.label}>Pickup</Text>
        <Text style={styles.value}>{pickup}</Text>
        <Text style={[styles.label, styles.dropoffLabel]}>Drop-off</Text>
        <Text style={styles.value}>{dropoff}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  route: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  timeline: {
    alignItems: 'center',
    paddingTop: 5,
  },
  dot: {
    borderRadius: 999,
    height: 12,
    width: 12,
  },
  pickup: {
    backgroundColor: colors.green,
  },
  dropoff: {
    backgroundColor: colors.yellow,
  },
  line: {
    backgroundColor: colors.border,
    flex: 1,
    minHeight: 48,
    width: 2,
  },
  copy: {
    flex: 1,
  },
  label: {
    color: colors.subtle,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  dropoffLabel: {
    marginTop: spacing.md,
  },
  value: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 21,
    marginTop: 4,
  },
});
