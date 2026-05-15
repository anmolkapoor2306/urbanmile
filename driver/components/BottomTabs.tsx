import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '@/constants/theme';
import type { DriverTab } from '@/data/mockData';

const tabs: { key: DriverTab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'home', label: 'Home', icon: 'home' },
  { key: 'trips', label: 'Trips', icon: 'map' },
  { key: 'earnings', label: 'Earnings', icon: 'wallet' },
  { key: 'profile', label: 'Profile', icon: 'person' },
];

export function BottomTabs({ activeTab, onChange }: { activeTab: DriverTab; onChange: (tab: DriverTab) => void }) {
  return (
    <View style={styles.wrap}>
      {tabs.map((tab) => {
        const active = tab.key === activeTab;
        return (
          <Pressable key={tab.key} onPress={() => onChange(tab.key)} style={[styles.item, active && styles.activeItem]}>
            <Ionicons name={tab.icon} size={20} color={active ? colors.background : colors.muted} />
            <Text style={[styles.label, active && styles.activeLabel]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    bottom: spacing.md,
    flexDirection: 'row',
    gap: spacing.xs,
    left: spacing.md,
    padding: spacing.xs,
    position: 'absolute',
    right: spacing.md,
  },
  item: {
    alignItems: 'center',
    borderRadius: radius.md,
    flex: 1,
    gap: 3,
    paddingVertical: spacing.sm,
  },
  activeItem: {
    backgroundColor: colors.yellow,
  },
  label: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800',
  },
  activeLabel: {
    color: colors.background,
  },
});
