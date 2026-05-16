import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useThemeColors } from '@/src/context/AppContext';
import { radius, shadow, spacing } from '@/src/constants/theme';
import { customer } from '@/src/data/mock';

const menuItems = [
  { label: 'Ride History', icon: 'time', path: '/ride-history' },
  { label: 'Coupons', icon: 'ticket', path: '/coupon' },
  { label: 'About UrbanMiles', icon: 'information-circle', path: '/profile' },
  { label: 'Settings', icon: 'settings', path: '/settings' },
] as const;

export function SideDrawer({
  isOpen,
  onClose,
  onOpenSavedPlaces,
}: {
  isOpen: boolean;
  onClose: () => void;
  onOpenSavedPlaces: () => void;
}) {
  const router = useRouter();
  const c = useThemeColors();

  const styles = useMemo(() => StyleSheet.create({
    overlay: {
      bottom: 0,
      left: 0,
      position: 'absolute',
      right: 0,
      top: 0,
      zIndex: 20,
    },
    backdrop: {
      backgroundColor: 'rgba(0,0,0,0.28)',
      bottom: 0,
      left: 0,
      position: 'absolute',
      right: 0,
      top: 0,
    },
    drawer: {
      backgroundColor: c.surface,
      borderBottomRightRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      bottom: 0,
      left: 0,
      padding: spacing.lg,
      paddingTop: 58,
      position: 'absolute',
      top: 0,
      width: '82%',
      ...shadow,
    },
    profile: {
      alignItems: 'center',
      borderBottomColor: c.border,
      borderBottomWidth: 1,
      flexDirection: 'row',
      gap: spacing.md,
      paddingBottom: spacing.lg,
    },
    avatar: {
      alignItems: 'center',
      backgroundColor: c.ink,
      borderRadius: 999,
      height: 56,
      justifyContent: 'center',
      width: 56,
    },
    avatarText: {
      color: c.yellow,
      fontSize: 18,
      fontWeight: '900',
    },
    name: {
      color: c.ink,
      fontSize: 18,
      fontWeight: '900',
    },
    phone: {
      color: c.muted,
      fontSize: 13,
      fontWeight: '700',
      marginTop: 3,
    },
    menu: {
      paddingVertical: spacing.md,
    },
    menuItem: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing.md,
      minHeight: 48,
    },
    menuText: {
      color: c.ink,
      flex: 1,
      fontSize: 15,
      fontWeight: '800',
    },
    logout: {
      alignItems: 'center',
      borderTopColor: c.border,
      borderTopWidth: 1,
      flexDirection: 'row',
      gap: spacing.md,
      marginTop: 'auto',
      paddingTop: spacing.lg,
    },
    logoutText: {
      color: c.red,
      fontSize: 15,
      fontWeight: '900',
    },
  }), [c]);

  if (!isOpen) return null;

  return (
    <View style={styles.overlay}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.drawer}>
        <View style={styles.profile}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>AK</Text>
          </View>
          <View>
            <Text style={styles.name}>{customer.name}</Text>
            <Text style={styles.phone}>{customer.phone}</Text>
          </View>
        </View>
        <View style={styles.menu}>
          <Pressable
            onPress={() => {
              onClose();
              onOpenSavedPlaces();
            }}
            style={styles.menuItem}>
            <Ionicons name="bookmark" size={20} color={c.ink} />
            <Text style={styles.menuText}>Saved Places</Text>
            <Ionicons name="chevron-forward" size={16} color={c.subtle} />
          </Pressable>
          {menuItems.map((item) => (
            <Pressable
              key={item.label}
              onPress={() => {
                onClose();
                router.push(item.path as Href);
              }}
              style={styles.menuItem}>
              <Ionicons name={item.icon} size={20} color={c.ink} />
              <Text style={styles.menuText}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={c.subtle} />
            </Pressable>
          ))}
        </View>
        <Pressable onPress={onClose} style={styles.logout}>
          <Ionicons name="log-out" size={20} color={c.red} />
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
      </View>
    </View>
  );
}
