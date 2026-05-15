import { StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/Card';
import { Header } from '@/components/Header';
import { MapPlaceholder } from '@/components/MapPlaceholder';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { StatusBadge } from '@/components/StatusBadge';
import { TripRoute } from '@/components/TripRoute';
import { colors, spacing } from '@/constants/theme';
import { activeTrip } from '@/data/mockData';

export function NewTripRequestScreen({ onAcknowledge }: { onAcknowledge: () => void }) {
  return (
    <Screen>
      <Header title="New trip request" subtitle="Review the pickup, drop-off, and fare before acknowledging." />
      <Card>
        <View style={styles.row}>
          <StatusBadge label="New request" tone="warning" />
          <Text style={styles.fare}>{activeTrip.fare}</Text>
        </View>
        <MapPlaceholder />
        <TripRoute pickup={activeTrip.pickup} dropoff={activeTrip.dropoff} />
        <View style={styles.details}>
          <Text style={styles.detail}>{activeTrip.distance}</Text>
          <Text style={styles.detail}>{activeTrip.duration}</Text>
          <Text style={styles.detail}>Pickup ETA {activeTrip.pickupEta}</Text>
        </View>
        <PrimaryButton onPress={onAcknowledge} style={styles.button}>
          Acknowledge Trip
        </PrimaryButton>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  fare: {
    color: colors.yellow,
    fontSize: 26,
    fontWeight: '900',
  },
  details: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  detail: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 999,
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  button: {
    marginTop: spacing.lg,
  },
});
