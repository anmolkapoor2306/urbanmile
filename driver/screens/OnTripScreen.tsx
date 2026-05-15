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

export function OnTripScreen({ onComplete }: { onComplete: () => void }) {
  return (
    <Screen>
      <Header title="On trip" subtitle="Trip is active. Keep the route simple, focused, and safe." />
      <Card>
        <View style={styles.row}>
          <StatusBadge label="Passenger onboard" tone="online" />
          <Text style={styles.fare}>{activeTrip.fare}</Text>
        </View>
        <MapPlaceholder label="Drop-off route preview" />
        <TripRoute pickup={activeTrip.pickup} dropoff={activeTrip.dropoff} />
        <PrimaryButton onPress={onComplete} style={styles.button}>
          Complete Trip
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
    fontSize: 24,
    fontWeight: '900',
  },
  button: {
    marginTop: spacing.lg,
  },
});
