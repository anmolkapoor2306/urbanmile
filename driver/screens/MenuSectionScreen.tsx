import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/Card';
import { Header } from '@/components/Header';
import { Screen } from '@/components/Screen';
import { colors, spacing } from '@/constants/theme';
import { driverProfile } from '@/data/mockData';

type MenuSection = 'documents' | 'vehicle' | 'settings' | 'help';

const sectionCopy: Record<
  MenuSection,
  { title: string; subtitle: string; icon: keyof typeof Ionicons.glyphMap; rows: { label: string; value: string }[] }
> = {
  documents: {
    title: 'Documents',
    subtitle: 'UI-only view for license, permits, insurance, and compliance documents.',
    icon: 'document-text',
    rows: [
      { label: 'Driving license', value: 'Verified' },
      { label: 'Commercial permit', value: 'Valid until Dec 2026' },
      { label: 'Insurance', value: 'Valid until Aug 2026' },
    ],
  },
  vehicle: {
    title: 'Vehicle Details',
    subtitle: 'Assigned fleet vehicle and inspection details.',
    icon: 'car-sport',
    rows: [
      { label: 'Vehicle', value: driverProfile.vehicle.model },
      { label: 'Plate number', value: driverProfile.vehicle.plate },
      { label: 'Category', value: driverProfile.vehicle.type },
      { label: 'Fuel', value: driverProfile.vehicle.fuel },
    ],
  },
  settings: {
    title: 'Settings',
    subtitle: 'Mock preferences for notification, safety, and driver app behavior.',
    icon: 'settings',
    rows: [
      { label: 'Trip alerts', value: 'Enabled' },
      { label: 'Navigation preference', value: 'Default maps' },
      { label: 'Theme', value: 'UrbanMiles dark' },
    ],
  },
  help: {
    title: 'Help & Support',
    subtitle: 'Driver support shortcuts for operations and emergency assistance.',
    icon: 'help-circle',
    rows: [
      { label: 'Operations support', value: '+91 90000 00000' },
      { label: 'Emergency desk', value: 'Available 24/7' },
      { label: 'App support', value: 'Mock channel' },
    ],
  },
};

export function MenuSectionScreen({ section }: { section: MenuSection }) {
  const copy = sectionCopy[section];

  return (
    <Screen>
      <View style={styles.offset} />
      <Header title={copy.title} subtitle={copy.subtitle} />
      <Card>
        <View style={styles.iconWrap}>
          <Ionicons name={copy.icon} size={28} color={colors.background} />
        </View>
        {copy.rows.map((row) => (
          <View key={row.label} style={styles.row}>
            <Text style={styles.label}>{row.label}</Text>
            <Text style={styles.value}>{row.value}</Text>
          </View>
        ))}
      </Card>
      <Text style={styles.note}>This section is UI-only for Driver App V1.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  offset: {
    height: 48,
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: colors.yellow,
    borderRadius: 999,
    height: 58,
    justifyContent: 'center',
    marginBottom: spacing.md,
    width: 58,
  },
  row: {
    borderTopColor: colors.borderMuted,
    borderTopWidth: 1,
    paddingVertical: spacing.md,
  },
  label: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  value: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
    marginTop: 4,
  },
  note: {
    color: colors.subtle,
    fontSize: 12,
    fontWeight: '800',
    marginTop: spacing.md,
    textAlign: 'center',
  },
});
