import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Card } from '@/components/Card';
import { Header } from '@/components/Header';
import { Screen } from '@/components/Screen';
import { colors, radius, spacing } from '@/constants/theme';
import { driverProfile, recentTrips } from '@/data/mockData';

type TripFilter = '24h' | '7d' | '30d' | 'custom';

const filters: { key: TripFilter; label: string }[] = [
  { key: '24h', label: 'Last 24h' },
  { key: '7d', label: 'Last 7 days' },
  { key: '30d', label: 'Last 30 days' },
  { key: 'custom', label: 'Custom' },
];

export function CompletedTripsScreen() {
  const [activeFilter, setActiveFilter] = useState<TripFilter>('7d');
  const [customFrom, setCustomFrom] = useState('2026-05-01');
  const [customTo, setCustomTo] = useState('2026-05-14');

  const filteredTrips = useMemo(() => {
    const now = new Date('2026-05-14T23:59:00+05:30');
    const rangeStart = getFilterStartDate(activeFilter, now, customFrom);
    const rangeEnd = activeFilter === 'custom' ? parseDateEnd(customTo) : now;

    return recentTrips.filter((trip) => {
      const completedAt = new Date(trip.completedAt);
      return completedAt >= rangeStart && completedAt <= rangeEnd;
    });
  }, [activeFilter, customFrom, customTo]);

  return (
    <Screen>
      <Header title="Completed trips" subtitle="A simple history of finished UrbanMiles rides." />

      <Card>
        <View style={styles.summaryRow}>
          <View>
            <Text style={styles.summaryValue}>{driverProfile.completedTrips}</Text>
            <Text style={styles.summaryLabel}>Lifetime completed trips</Text>
          </View>
          <View style={styles.iconWrap}>
            <Ionicons name="checkmark-done" size={24} color={colors.background} />
          </View>
        </View>
      </Card>

      <View style={styles.filterWrap}>
        {filters.map((filter) => {
          const selected = activeFilter === filter.key;
          return (
            <Pressable
              key={filter.key}
              onPress={() => setActiveFilter(filter.key)}
              style={({ pressed }) => [styles.filterChip, selected && styles.filterChipActive, pressed && styles.pressed]}
            >
              <Text style={[styles.filterText, selected && styles.filterTextActive]}>{filter.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {activeFilter === 'custom' ? (
        <Card style={styles.customCard}>
          <Text style={styles.customTitle}>Custom range</Text>
          <View style={styles.customRow}>
            <View style={styles.customField}>
              <Text style={styles.inputLabel}>From</Text>
              <TextInput
                value={customFrom}
                onChangeText={setCustomFrom}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.subtle}
                style={styles.input}
              />
            </View>
            <View style={styles.customField}>
              <Text style={styles.inputLabel}>To</Text>
              <TextInput
                value={customTo}
                onChangeText={setCustomTo}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.subtle}
                style={styles.input}
              />
            </View>
          </View>
        </Card>
      ) : null}

      <Text style={styles.sectionTitle}>Recent completed</Text>
      {filteredTrips.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No completed trips</Text>
          <Text style={styles.emptyText}>Try another time range to view more completed rides.</Text>
        </Card>
      ) : null}
      {filteredTrips.map((trip) => (
        <Card key={trip.id} style={styles.tripCard}>
          <View style={styles.tripIcon}>
            <Ionicons name="checkmark" size={16} color={colors.background} />
          </View>
          <View style={styles.tripCopy}>
            <Text style={styles.tripRoute}>{trip.route}</Text>
            <Text style={styles.tripMeta}>{trip.id} - Completed - {trip.time}</Text>
          </View>
          <Text style={styles.tripFare}>{trip.fare}</Text>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  summaryRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryValue: {
    color: colors.text,
    fontSize: 34,
    fontWeight: '900',
  },
  summaryLabel: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 4,
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: colors.yellow,
    borderRadius: 999,
    height: 50,
    justifyContent: 'center',
    width: 50,
  },
  filterWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  filterChip: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  filterChipActive: {
    backgroundColor: colors.yellow,
    borderColor: colors.yellow,
  },
  filterText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '900',
  },
  filterTextActive: {
    color: colors.background,
  },
  pressed: {
    opacity: 0.82,
  },
  customCard: {
    marginTop: spacing.md,
  },
  customTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
    marginBottom: spacing.sm,
  },
  customRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  customField: {
    flex: 1,
  },
  inputLabel: {
    color: colors.subtle,
    fontSize: 11,
    fontWeight: '900',
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
    minHeight: 46,
    paddingHorizontal: spacing.sm,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  tripCard: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  tripIcon: {
    alignItems: 'center',
    backgroundColor: colors.green,
    borderRadius: 999,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  tripCopy: {
    flex: 1,
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
  emptyCard: {
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  emptyText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 20,
    marginTop: 4,
  },
});

function getFilterStartDate(filter: TripFilter, now: Date, customFrom: string) {
  if (filter === 'custom') return parseDateStart(customFrom);

  const hours = filter === '24h' ? 24 : filter === '7d' ? 24 * 7 : 24 * 30;
  return new Date(now.getTime() - hours * 60 * 60 * 1000);
}

function parseDateStart(value: string) {
  const parsed = new Date(`${value}T00:00:00+05:30`);
  if (Number.isNaN(parsed.getTime())) return new Date(0);
  return parsed;
}

function parseDateEnd(value: string) {
  const parsed = new Date(`${value}T23:59:59+05:30`);
  if (Number.isNaN(parsed.getTime())) return new Date(8640000000000000);
  return parsed;
}
