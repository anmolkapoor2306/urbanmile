import { StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/Card';
import { Header } from '@/components/Header';
import { Screen } from '@/components/Screen';
import { colors, spacing } from '@/constants/theme';
import { earningsSummary, recentTrips } from '@/data/mockData';

export function EarningsScreen() {
  return (
    <Screen>
      <Header title="Earnings" subtitle="Mock payouts and trip earnings for driver operations." />
      <Card>
        <Text style={styles.label}>Today earnings</Text>
        <Text style={styles.total}>{earningsSummary.today}</Text>
        <View style={styles.grid}>
          <EarningPill label="This week" value={earningsSummary.week} />
          <EarningPill label="Trips today" value={String(earningsSummary.tripsToday)} />
          <EarningPill label="Online time" value={earningsSummary.onlineHours} />
          <EarningPill label="Incentives" value={earningsSummary.incentives} />
        </View>
      </Card>

      <Text style={styles.sectionTitle}>Recent trips</Text>
      {recentTrips.map((trip) => (
        <Card key={trip.id} style={styles.trip}>
          <View>
            <Text style={styles.tripRoute}>{trip.route}</Text>
            <Text style={styles.tripMeta}>{trip.id} - {trip.time}</Text>
          </View>
          <Text style={styles.tripFare}>{trip.fare}</Text>
        </Card>
      ))}
    </Screen>
  );
}

function EarningPill({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.pill}>
      <Text style={styles.pillValue}>{value}</Text>
      <Text style={styles.pillLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  total: {
    color: colors.yellow,
    fontSize: 42,
    fontWeight: '900',
    marginTop: spacing.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  pill: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    padding: spacing.md,
    width: '47%',
  },
  pillValue: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
  },
  pillLabel: {
    color: colors.subtle,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 4,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  trip: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  tripRoute: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  tripMeta: {
    color: colors.subtle,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  tripFare: {
    color: colors.yellow,
    fontSize: 16,
    fontWeight: '900',
  },
});
