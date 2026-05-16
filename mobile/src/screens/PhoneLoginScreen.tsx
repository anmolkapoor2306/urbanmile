import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrimaryButton } from '@/src/components/Buttons';
import { useThemeColors } from '@/src/context/AppContext';
import { radius, spacing } from '@/src/constants/theme';

export function PhoneLoginScreen() {
  const router = useRouter();
  const c = useThemeColors();
  const insets = useSafeAreaInsets();
  const [phone, setPhone] = useState('');

  const phoneValid = phone.replace(/\D/g, '').length >= 10;

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
      borderColor: c.border,
      borderRadius: radius.md,
      backgroundColor: c.surface,
    },
    countryCode: {
      alignItems: 'center',
      justifyContent: 'center',
      borderRightWidth: 1.5,
      borderColor: c.border,
      height: 34,
      paddingHorizontal: spacing.md,
      minWidth: 54,
    },
    countryCodeText: {
      color: c.ink,
      fontSize: 17,
      fontWeight: '800',
    },
    phoneInput: {
      flex: 1,
      color: c.ink,
      fontSize: 17,
      fontWeight: '600',
      lineHeight: 24,
      minWidth: 0,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
    },
    continueButton: {
      borderRadius: radius.md,
    },
    termsText: {
      color: c.subtle,
      fontSize: 11,
      fontWeight: '600',
      lineHeight: 17,
      marginTop: -spacing.sm,
      textAlign: 'center',
    },
  }), [c]);

  const handleContinue = () => {
    if (!phoneValid) {
      Alert.alert('Invalid number', 'Please enter a valid 10-digit phone number.');
      return;
    }
    router.push('/otp');
  };

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
          <Text style={styles.title}>Sign in with your phone</Text>
          <Text style={styles.subtitle}>We'll send you a verification code.</Text>

          <View style={styles.inputWrapper}>
            <View style={styles.countryCode}>
              <Text style={styles.countryCodeText}>+91</Text>
            </View>
            <TextInput
              style={styles.phoneInput}
              placeholder="Enter phone number"
              placeholderTextColor={c.subtle}
              keyboardType="phone-pad"
              maxLength={10}
              value={phone}
              onChangeText={setPhone}
              returnKeyType="done"
              autoFocus
            />
          </View>

          <PrimaryButton
            onPress={handleContinue}
            style={styles.continueButton}
            disabled={!phoneValid}
          >
            Continue
          </PrimaryButton>

          <Text style={styles.termsText}>
            By continuing, you agree to UrbanMiles Terms and Privacy Policy.
          </Text>
        </View>

        <View style={{ height: Math.max(insets.bottom, spacing.lg) }} />
      </KeyboardAvoidingView>
    </View>
  );
}
