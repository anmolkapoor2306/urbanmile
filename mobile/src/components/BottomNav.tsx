import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useThemeColors } from '@/src/context/AppContext';
import { radius, shadow, spacing } from '@/src/constants/theme';

const items = [
  { key: 'home', label: 'Home', icon: 'home', path: '/home' },
  { key: 'bookings', label: 'Bookings', icon: 'receipt', path: '/ride-history' },
  { key: 'wallet', label: 'Wallet', icon: 'wallet', path: '/wallet' },
  { key: 'support', label: 'Support', icon: 'headset', path: '/profile' },
] as const;

export function BottomNav({ active }: { active: 'home' | 'bookings' | 'wallet' | 'support' | 'settings' }) {
  const router = useRouter();
  const c = useThemeColors();
  const styles = useMemo(() => StyleSheet.create({
    nav: {
      alignItems: 'center',
      backgroundColor: c.surface,
      borderColor: c.border,
      borderRadius: radius.xl,
      borderWidth: 1,
      bottom: spacing.md,
      flexDirection: 'row',
      justifyContent: 'space-around',
      left: spacing.md,
      minHeight: 68,
      paddingHorizontal: spacing.sm,
      position: 'absolute',
      right: spacing.md,
      ...shadow,
    },
    item: {
      alignItems: 'center',
      flex: 1,
      gap: 4,
    },
    label: {
      color: c.subtle,
      fontSize: 11,
      fontWeight: '800',
    },
    labelActive: {
      color: c.ink,
    },
  }), [c]);

  return (
    <View style={styles.nav}>
      {items.map((item) => {
        const isActive = active === item.key;
        return (
          <Pressable key={item.key} onPress={() => router.push(item.path as Href)} style={styles.item}>
            <Ionicons name={item.icon} size={20} color={isActive ? c.ink : c.subtle} />
            <Text style={[styles.label, isActive && styles.labelActive]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
