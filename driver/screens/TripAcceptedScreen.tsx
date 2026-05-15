import { StyleSheet, Text } from 'react-native';
import { Card } from '@/components/Card';
import { Header } from '@/components/Header';
import { MapPlaceholder } from '@/components/MapPlaceholder';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { StatusBadge } from '@/components/StatusBadge';
import { TripRoute } from '@/components/TripRoute';
import { colors, spacing } from '@/constants/theme';
import { activeTrip } from '@/data/mockData';

export function TripAcceptedScreen({ hasArrived, onArrived, onStartTrip }: { hasArrived: boolean; onArrived: () => void; onStartTrip: () => void }) {
  return (
    <Screen>
      <Header title={hasArrived ? 'Ready to start' : 'Navigate to pickup'} subtitle="Use your preferred navigation app for live routing." />
      <Card>
        <StatusBadge label={hasArrived ? 'Arrived at pickup' : `Pickup ETA ${activeTrip.pickupEta}`} tone={hasArrived ? 'online' : 'warning'} />
        <MapPlaceholder label="Pickup navigation preview" />
        <TripRoute pickup={activeTrip.pickup} dropoff={activeTrip.dropoff} />
        <Text style={styles.note}>{activeTrip.note}</Text>
        {hasArrived ? (
          <PrimaryButton onPress={onStartTrip} style={styles.button}>
            Start Trip
          </PrimaryButton>
        ) : (
          <PrimaryButton onPress={onArrived} style={styles.button}>
            Arrived at Pickup
          </PrimaryButton>
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  note: {
    backgroundColor: colors.amberSoft,
    borderColor: colors.yellowDark,
    borderRadius: 16,
    borderWidth: 1,
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 20,
    marginTop: spacing.md,
    padding: spacing.md,
  },
  button: {
    marginTop: spacing.lg,
  },
});
