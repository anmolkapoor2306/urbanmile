import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef } from 'react';
import { Animated, Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrimaryButton } from '@/src/components/Buttons';
import { useThemeColors } from '@/src/context/AppContext';
import { radius, spacing } from '@/src/constants/theme';

const heroCarImage = require('@/assets/images/urbanmiles-hero-car.png');

export function WelcomeScreen() {
  const router = useRouter();
  const c = useThemeColors();
  const { height } = useWindowDimensions();
  const fadeIn = useRef(new Animated.Value(0)).current;
  const heroHeight = Math.round(height * 0.5);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    Animated.timing(fadeIn, {
      toValue: 1,
      duration: 420,
      useNativeDriver: true,
    }).start();
  }, [fadeIn]);

  const styles = useMemo(() => StyleSheet.create({
    outerWrapper: {
      backgroundColor: c.background,
      flex: 1,
    },
    container: {
      flex: 1,
    },
    heroSection: {
      backgroundColor: '#f4eddf',
      overflow: 'hidden',
      position: 'relative',
      width: '100%',
    },
    heroImage: {
      height: '106%',
      transform: [{ translateY: -12 }],
      width: '100%',
    },
    heroOverlay: {
      backgroundColor: 'rgba(0, 0, 0, 0.45)',
      bottom: 0,
      left: 0,
      opacity: 0.5,
      position: 'absolute',
      right: 0,
      top: 0,
    },
    logoRow: {
      alignItems: 'center',
      backgroundColor: 'rgba(255, 255, 255, 0.82)',
      borderRadius: 999,
      flexDirection: 'row',
      gap: spacing.sm,
      left: spacing.lg,
      paddingBottom: spacing.xs,
      paddingLeft: spacing.xs,
      paddingRight: spacing.md,
      paddingTop: spacing.xs,
      position: 'absolute',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.14,
      shadowRadius: 12,
      top: Math.max(insets.top, spacing.lg),
      elevation: 4,
      zIndex: 2,
    },
    logoMark: {
      alignItems: 'center',
      backgroundColor: c.yellow,
      borderRadius: 14,
      height: 36,
      justifyContent: 'center',
      width: 36,
    },
    brand: {
      color: '#111111',
      fontSize: 21,
      fontWeight: '900',
    },
    bottomContent: {
      flex: 1,
      gap: spacing.lg,
      justifyContent: 'flex-start',
      paddingHorizontal: spacing.lg,
      paddingBottom: Math.max(insets.bottom, spacing.xl),
      paddingTop: spacing.lg,
    },
    copy: {
      gap: spacing.sm,
    },
    title: {
      color: c.ink,
      fontSize: 34,
      fontWeight: '900',
      letterSpacing: 0,
      lineHeight: 39,
    },
    subtitle: {
      color: c.muted,
      fontSize: 16,
      fontWeight: '700',
      lineHeight: 23,
    },
    loginButton: {
      borderRadius: radius.md,
      width: '100%',
    },
    terms: {
      alignItems: 'center',
      paddingHorizontal: spacing.md,
    },
    termsText: {
      color: c.subtle,
      fontSize: 12,
      fontWeight: '700',
      lineHeight: 18,
      textAlign: 'center',
    },
  }), [c, insets]);

  return (
    <View style={styles.outerWrapper}>
      <View style={styles.container}>
        <View style={[styles.heroSection, { height: heroHeight }]}>
          <Image source={heroCarImage} resizeMode="cover" style={styles.heroImage} />
          <View style={styles.heroOverlay} />
          <Animated.View style={[styles.logoRow, { opacity: fadeIn }]}>
            <View style={styles.logoMark}>
              <Ionicons name="navigate" size={20} color="#111111" />
            </View>
            <Text style={styles.brand}>UrbanMiles</Text>
          </Animated.View>
        </View>

        <View style={styles.bottomContent}>
          <View style={styles.copy}>
            <Text style={styles.title}>Premium rides across your city</Text>
            <Text style={styles.subtitle}>Clean cars. Transparent fares. Reliable rides.</Text>
          </View>

          <PrimaryButton onPress={() => router.push('/phone-login')} style={styles.loginButton}>Login with Phone Number</PrimaryButton>

          <Pressable style={styles.terms}>
            <Text style={styles.termsText}>By continuing, you agree to UrbanMiles Terms and Privacy Policy.</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
