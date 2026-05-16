import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrimaryButton, SecondaryButton } from '@/src/components/Buttons';
import { useApp, useThemeColors } from '@/src/context/AppContext';
import { radius, spacing } from '@/src/constants/theme';

const DEMO_OTP = '000000';

export function OTPScreen() {
  const router = useRouter();
  const { setLoggedIn } = useApp();
  const c = useThemeColors();
  const insets = useSafeAreaInsets();
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const spinnerOpacity = useRef(new Animated.Value(0)).current;
  const inputRef = useRef<TextInput>(null);

  const otpValid = otp.length === 6;

  const handleVerify = useCallback(() => {
    if (!otpValid) {
      Alert.alert('Incomplete OTP', 'Please enter the full 6-digit code.');
      return;
    }

    setVerifying(true);
    Animated.loop(
      Animated.sequence([
        Animated.timing(spinnerOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.timing(spinnerOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      ])
    ).start();

    setTimeout(() => {
      Animated.timing(spinnerOpacity, { toValue: 0, duration: 0, useNativeDriver: true }).start();
      setVerifying(false);
      if (otp === DEMO_OTP) {
        setLoggedIn(true);
        router.replace('/home');
      } else {
        setError('Invalid verification code');
      }
    }, 500);
  }, [otp, otpValid]);

  const handleResend = useCallback(() => {
    Alert.alert('Demo OTP', 'Your verification code is: ' + DEMO_OTP);
  }, []);

  const styles = useMemo(() => StyleSheet.create({
    outerWrapper: {
      backgroundColor: c.background,
      flex: 1,
    },
    inner: {
      flex: 1,
      paddingHorizontal: spacing.lg,
    },
    headerRow: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'flex-start',
      minHeight: 44,
      paddingTop: spacing.sm,
    },
    backLabel: {
      color: c.ink,
      fontSize: 16,
      fontWeight: '700',
    },
    scrollContent: {
      flex: 1,
      justifyContent: 'center',
      gap: spacing.lg,
    },
    title: {
      color: c.ink,
      fontSize: 28,
      fontWeight: '900',
      lineHeight: 34,
    },
    subtitle: {
      marginTop: -spacing.sm,
      color: c.muted,
      fontSize: 15,
      fontWeight: '600',
      lineHeight: 22,
    },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: error ? c.red : c.border,
      borderRadius: radius.md,
      backgroundColor: c.surface,
    },
    otpInput: {
      flex: 1,
      color: c.ink,
      fontSize: 24,
      fontWeight: '800',
      letterSpacing: 8,
      lineHeight: 36,
      textAlign: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
    },
    verifyButton: {
      borderRadius: radius.md,
    },
    dividerRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing.sm,
    },
    dividerLine: {
      backgroundColor: c.border,
      flex: 1,
      height: 1,
    },
    dividerText: {
      color: c.subtle,
      fontSize: 13,
      fontWeight: '700',
    },
    errorText: {
      color: c.red,
      fontSize: 14,
      fontWeight: '700',
      textAlign: 'center',
    },
  }), [c, error]);

  return (
    <View style={styles.outerWrapper}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={insets.top}
        style={styles.inner}>
        <Pressable onPress={() => router.back()} style={[styles.headerRow, { marginBottom: spacing.lg, paddingTop: insets.top }]}>
          <Ionicons name="arrow-back" size={20} color={c.ink} />
          <Text style={styles.backLabel}>Back</Text>
        </Pressable>

        <View style={styles.scrollContent}>
          <Text style={styles.title}>Enter verification code</Text>
          <Text style={styles.subtitle}>
            We've sent a 6-digit code to your phone.
          </Text>

          <View style={styles.inputWrapper}>
            <TextInput
              ref={inputRef}
              style={styles.otpInput}
              placeholder="1 2 3 4 5 6"
              placeholderTextColor={c.subtle}
              keyboardType="number-pad"
              maxLength={6}
              value={otp}
              onChangeText={(text) => { setOtp(text); setError(''); }}
              returnKeyType="done"
              autoFocus
            />
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <PrimaryButton
            onPress={handleVerify}
            style={styles.verifyButton}
            disabled={!otpValid || verifying}
          >
            {verifying
              ? 'Verifying...'
              : 'Verify & Continue'}
          </PrimaryButton>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <SecondaryButton onPress={handleResend}>
            Resend Code
          </SecondaryButton>
        </View>

        <View style={{ height: Math.max(insets.bottom, spacing.lg) }} />
      </KeyboardAvoidingView>
    </View>
  );
}
