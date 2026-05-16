import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { useThemeColors } from '@/src/context/AppContext';
import { radius, spacing } from '@/src/constants/theme';

export function PrimaryButton({
  children,
  onPress,
  style,
  disabled = false,
}: {
  children: React.ReactNode;
  onPress: () => void;
  style?: ViewStyle;
  disabled?: boolean;
}) {
  const c = useThemeColors();
  const styles = useMemo(() => StyleSheet.create({
    primary: {
      alignItems: 'center',
      backgroundColor: c.ink,
      borderRadius: radius.md,
      justifyContent: 'center',
      minHeight: 54,
      paddingHorizontal: spacing.md,
    },
    primaryText: {
      color: c.surface,
      fontSize: 16,
      fontWeight: '900',
    },
    pressed: {
      opacity: 0.82,
      transform: [{ scale: 0.99 }],
    },
    disabled: {
      opacity: 0.55,
    },
  }), [c]);

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.primary, pressed && !disabled && styles.pressed, disabled && styles.disabled, style]}>
      <Text style={styles.primaryText}>{children}</Text>
    </Pressable>
  );
}

export function SecondaryButton({
  children,
  onPress,
  style,
}: {
  children: React.ReactNode;
  onPress: () => void;
  style?: ViewStyle;
}) {
  const c = useThemeColors();
  const styles = useMemo(() => StyleSheet.create({
    secondary: {
      alignItems: 'center',
      backgroundColor: c.surfaceMuted,
      borderRadius: radius.md,
      justifyContent: 'center',
      minHeight: 50,
      paddingHorizontal: spacing.md,
    },
    secondaryText: {
      color: c.ink,
      fontSize: 15,
      fontWeight: '900',
    },
    pressed: {
      opacity: 0.82,
      transform: [{ scale: 0.99 }],
    },
  }), [c]);

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.secondary, pressed && styles.pressed, style]}>
      <Text style={styles.secondaryText}>{children}</Text>
    </Pressable>
  );
}
