import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useCallback, useLayoutEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomNav } from '@/src/components/BottomNav';
import { useApp } from '@/src/context/AppContext';
import { radius, spacing } from '@/src/constants/theme';
import type { AppTheme } from '@/src/context/AppContext';

const themeLabels: AppTheme[] = ['light', 'dark'];

export function SettingsScreen() {
  const { theme, setTheme, resolvedColors } = useApp();
  const isDark = theme === 'dark';
  const knobX = useSharedValue(0);
  const trackRef = useRef<View>(null);
  const halfWidth = useRef(0);
  const initialized = useRef(false);

  useLayoutEffect(() => {
    if (halfWidth.current > 0) {
      knobX.value = withSpring(isDark ? halfWidth.current : 0);
    }
  }, [isDark, knobX]);

  const knobStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: knobX.value }],
  }));

  const handleThemeToggle = useCallback(
    (next: AppTheme) => {
      const target = next === 'dark' ? (halfWidth.current || 50) : 0;
      knobX.value = withSpring(target);
      setTheme(next);
    },
    [setTheme, knobX],
  );

  const handleTrackLayout = useCallback(() => {
    if (trackRef.current) {
      trackRef.current.measure((_x, _y, width) => {
        halfWidth.current = width / 2;
        if (!initialized.current) {
          initialized.current = true;
          knobX.value = isDark ? halfWidth.current : 0;
        }
      });
    }
  }, [isDark, knobX]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: resolvedColors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.heading, { color: resolvedColors.ink }]}>
          Settings
        </Text>

        <View style={[styles.card, { backgroundColor: resolvedColors.surface, borderColor: resolvedColors.border }]}>
          <Text style={[styles.fieldLabel, { color: resolvedColors.muted }]}>
            Theme
          </Text>
          <View
            style={[styles.pillTrack, { backgroundColor: resolvedColors.surfaceMuted, borderColor: resolvedColors.border }]}
            ref={trackRef}
            onLayout={handleTrackLayout}>
            <Animated.View style={[styles.pillKnob, knobStyle, { backgroundColor: resolvedColors.yellow }]} />
            {themeLabels.map((t) => {
              const active = theme === t;
              return (
                <Pressable
                  key={t}
                  onPress={() => handleThemeToggle(t)}
                  style={styles.pillOption}>
                  <Text style={[styles.pillText, { color: active ? '#09090b' : resolvedColors.muted }]}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: resolvedColors.surface, borderColor: resolvedColors.border }]}>
          <Text style={[styles.fieldLabel, { color: resolvedColors.muted }]}>
            Coming soon
          </Text>
          {[
            'Ride preferences',
            'Language',
            'Notifications',
            'Privacy & data',
          ].map((item) => (
            <View key={item} style={styles.rowItem}>
              <Text style={[styles.rowItemText, { color: resolvedColors.ink }]}>
                {item}
              </Text>
              <Text style={[styles.comingSoonBadge, { backgroundColor: resolvedColors.surfaceMuted, color: resolvedColors.muted }]}>
                Soon
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
      <BottomNav active="settings" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    paddingBottom: 104,
  },
  heading: {
    fontSize: 28,
    fontWeight: '900',
    marginBottom: spacing.md,
  },
  card: {
    borderRadius: radius.xl,
    marginBottom: spacing.md,
    padding: spacing.lg,
    borderWidth: 1,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
  },
  pillTrack: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    height: 48,
    overflow: 'hidden',
    position: 'relative',
  },
  pillKnob: {
    borderRadius: radius.md,
    height: 36,
    position: 'absolute',
    top: 6,
    width: '50%',
    zIndex: 1,
  },
  pillOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  pillText: {
    fontSize: 15,
    fontWeight: '900',
  },
  rowItem: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  rowItemText: {
    fontSize: 15,
    fontWeight: '800',
  },
  comingSoonBadge: {
    borderRadius: 999,
    fontSize: 11,
    fontWeight: '900',
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
  },
});
