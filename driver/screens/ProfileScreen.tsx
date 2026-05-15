import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/Card';
import { Header } from '@/components/Header';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { StatusBadge } from '@/components/StatusBadge';
import { colors, spacing } from '@/constants/theme';
import { driverProfile } from '@/data/mockData';

export function ProfileScreen({ onLogout }: { onLogout: () => void }) {
  return (
    <Screen>
      <Header title="Profile" subtitle="Driver account, vehicle, and app preferences." />
      <Card>
        <View style={styles.profileRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>AK</Text>
          </View>
          <View style={styles.profileCopy}>
            <Text style={styles.name}>{driverProfile.name}</Text>
            <Text style={styles.muted}>{driverProfile.phone}</Text>
            <StatusBadge label={`${driverProfile.rating} rating`} tone="online" />
          </View>
        </View>
      </Card>

      <Card style={styles.cardGap}>
        <Text style={styles.sectionTitle}>Vehicle</Text>
        <InfoRow icon="car-sport" label="Model" value={driverProfile.vehicle.model} />
        <InfoRow icon="pricetag" label="Plate" value={driverProfile.vehicle.plate} />
        <InfoRow icon="speedometer" label="Type" value={driverProfile.vehicle.type} />
        <InfoRow icon="flame" label="Fuel" value={driverProfile.vehicle.fuel} />
      </Card>

      <Card style={styles.cardGap}>
        <Text style={styles.sectionTitle}>Settings</Text>
        <InfoRow icon="location" label="Home city" value={driverProfile.city} />
        <InfoRow icon="checkmark-circle" label="Completed trips" value={String(driverProfile.completedTrips)} />
      </Card>

      <PrimaryButton onPress={onLogout} variant="secondary" style={styles.logout}>
        Log out
      </PrimaryButton>
    </Screen>
  );
}

function InfoRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={18} color={colors.yellow} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  profileRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.yellow,
    borderRadius: 28,
    height: 58,
    justifyContent: 'center',
    width: 58,
  },
  avatarText: {
    color: colors.background,
    fontSize: 18,
    fontWeight: '900',
  },
  profileCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  name: {
    color: colors.text,
    fontSize: 21,
    fontWeight: '900',
  },
  muted: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  cardGap: {
    marginTop: spacing.md,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
    marginBottom: spacing.sm,
  },
  infoRow: {
    alignItems: 'center',
    borderTopColor: colors.borderMuted,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  infoLabel: {
    color: colors.muted,
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
  },
  infoValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900',
  },
  logout: {
    marginTop: spacing.lg,
  },
});
