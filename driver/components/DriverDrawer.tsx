import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, shadow, spacing } from '@/constants/theme';
import { driverProfile, type DriverView } from '@/data/mockData';

const drawerItems: { key: DriverView; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'home', label: 'Home', icon: 'map' },
  { key: 'trips', label: 'Trips', icon: 'checkmark-done' },
  { key: 'earnings', label: 'Earnings', icon: 'wallet' },
  { key: 'profile', label: 'Profile', icon: 'person' },
  { key: 'documents', label: 'Documents', icon: 'document-text' },
  { key: 'vehicle', label: 'Vehicle Details', icon: 'car-sport' },
  { key: 'settings', label: 'Settings', icon: 'settings' },
  { key: 'help', label: 'Help & Support', icon: 'help-circle' },
];

export function DriverDrawer({
  isOpen,
  activeView,
  onClose,
  onNavigate,
  onLogout,
}: {
  isOpen: boolean;
  activeView: DriverView;
  onClose: () => void;
  onNavigate: (view: DriverView) => void;
  onLogout: () => void;
}) {
  if (!isOpen) return null;

  return (
    <View style={styles.overlay}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.drawer}>
        <View style={styles.profile}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>AK</Text>
          </View>
          <View style={styles.profileCopy}>
            <Text style={styles.name}>{driverProfile.name}</Text>
            <Text style={styles.meta}>{driverProfile.vehicle.plate}</Text>
          </View>
        </View>

        <View style={styles.nav}>
          {drawerItems.map((item) => {
            const active = item.key === activeView;
            return (
              <Pressable
                key={item.key}
                onPress={() => onNavigate(item.key)}
                style={({ pressed }) => [styles.item, active && styles.itemActive, pressed && styles.pressed]}
              >
                <Ionicons name={item.icon} size={20} color={active ? colors.background : colors.muted} />
                <Text style={[styles.itemText, active && styles.itemTextActive]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable onPress={onLogout} style={({ pressed }) => [styles.logout, pressed && styles.pressed]}>
          <Ionicons name="log-out" size={20} color={colors.red} />
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function MenuButton({ onPress, variant = 'dark' }: { onPress: () => void; variant?: 'dark' | 'floating' }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.menuButton, variant === 'floating' && styles.floatingMenuButton, pressed && styles.pressed]}
    >
      <Ionicons name="menu" size={24} color={colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 100,
  },
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.62)',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  drawer: {
    backgroundColor: colors.surface,
    borderRightColor: colors.border,
    borderRightWidth: 1,
    bottom: 0,
    left: 0,
    paddingHorizontal: spacing.md,
    paddingTop: 58,
    position: 'absolute',
    top: 0,
    width: 310,
    ...shadow,
  },
  profile: {
    alignItems: 'center',
    borderBottomColor: colors.borderMuted,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.yellow,
    borderRadius: 24,
    height: 50,
    justifyContent: 'center',
    width: 50,
  },
  avatarText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '900',
  },
  profileCopy: {
    flex: 1,
  },
  name: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
  },
  meta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  nav: {
    gap: spacing.xs,
    paddingTop: spacing.lg,
  },
  item: {
    alignItems: 'center',
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
  },
  itemActive: {
    backgroundColor: colors.yellow,
  },
  itemText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  itemTextActive: {
    color: colors.background,
  },
  logout: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    bottom: spacing.lg,
    flexDirection: 'row',
    gap: spacing.sm,
    left: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
    position: 'absolute',
    right: spacing.md,
  },
  logoutText: {
    color: colors.red,
    fontSize: 15,
    fontWeight: '900',
  },
  menuButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  floatingMenuButton: {
    left: spacing.md,
    position: 'absolute',
    top: 54,
    zIndex: 30,
  },
  pressed: {
    opacity: 0.82,
  },
});
