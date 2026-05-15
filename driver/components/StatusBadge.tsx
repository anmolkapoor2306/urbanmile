import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '@/constants/theme';

export function StatusBadge({ label, tone = 'neutral' }: { label: string; tone?: 'online' | 'warning' | 'neutral' }) {
  return (
    <View style={[styles.badge, tone === 'online' && styles.online, tone === 'warning' && styles.warning]}>
      <View style={[styles.dot, tone === 'online' && styles.onlineDot, tone === 'warning' && styles.warningDot]} />
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
    borderRadius: radius.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  online: {
    backgroundColor: '#0f2618',
    borderColor: '#1f5f34',
  },
  warning: {
    backgroundColor: colors.amberSoft,
    borderColor: colors.yellowDark,
  },
  dot: {
    backgroundColor: colors.subtle,
    borderRadius: 5,
    height: 8,
    width: 8,
  },
  onlineDot: {
    backgroundColor: colors.green,
  },
  warningDot: {
    backgroundColor: colors.yellow,
  },
  text: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
  },
});
