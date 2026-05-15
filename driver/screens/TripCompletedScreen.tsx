import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/Card';
import { Header } from '@/components/Header';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { colors, radius, spacing } from '@/constants/theme';
import { activeTrip } from '@/data/mockData';

export function TripCompletedScreen({ onReset }: { onReset: () => void }) {
  return (
    <Screen>
      <Header title="Trip completed" subtitle="Fare summary and completion status for this mock trip." />
      <Card>
        <View style={styles.iconWrap}>
          <Ionicons name="checkmark" size={34} color={colors.background} />
        </View>
        <Text style={styles.title}>Payment marked complete</Text>
        <Text style={styles.fare}>{activeTrip.fare}</Text>
        <Text style={styles.muted}>Trip ID {activeTrip.id}</Text>
        <View style={styles.summary}>
          <Text style={styles.summaryLabel}>Distance</Text>
          <Text style={styles.summaryValue}>{activeTrip.distance}</Text>
          <Text style={styles.summaryLabel}>Duration</Text>
          <Text style={styles.summaryValue}>{activeTrip.duration}</Text>
        </View>
        <PrimaryButton onPress={onReset} style={styles.button}>
          Return to Home
        </PrimaryButton>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: colors.yellow,
    borderRadius: 999,
    height: 70,
    justifyContent: 'center',
    marginBottom: spacing.md,
    width: 70,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
  },
  fare: {
    color: colors.yellow,
    fontSize: 38,
    fontWeight: '900',
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  muted: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '800',
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  summary: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    marginTop: spacing.lg,
    padding: spacing.md,
  },
  summaryLabel: {
    color: colors.subtle,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  summaryValue: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
    marginBottom: spacing.md,
    marginTop: 4,
  },
  button: {
    marginTop: spacing.lg,
  },
});
