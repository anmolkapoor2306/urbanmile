import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@/components/Card';
import { PrimaryButton } from '@/components/PrimaryButton';
import { colors, radius, spacing } from '@/constants/theme';
import type { AuthenticatedDriver } from '@/data/mockData';
import { DRIVER_LOGIN_URL } from '@/src/config/api';

const LOGIN_TIMEOUT_MS = 12000;

export function LoginScreen({ onLogin }: { onLogin: (driver: AuthenticatedDriver) => void }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submitLogin() {
    if (!identifier.trim() || !password) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetchWithTimeout(
        DRIVER_LOGIN_URL,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier: identifier.trim(), password }),
        },
        LOGIN_TIMEOUT_MS
      );
      const payload = await readJsonPayload(response);

      if (!response.ok) {
        throw new Error(getLoginErrorMessage(response.status, payload));
      }

      if (!payload.driver) {
        throw new Error('Driver login could not be completed.');
      }

      onLogin(payload.driver as AuthenticatedDriver);
    } catch (loginError) {
      setError(getNetworkErrorMessage(loginError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
        style={styles.keyboardAvoiding}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.hero}>
              <View style={styles.logo}>
                <Ionicons name="car-sport" size={34} color={colors.background} />
              </View>
              <Text style={styles.brand}>UrbanMiles</Text>
              <Text style={styles.title}>Driver command center</Text>
              <Text style={styles.subtitle}>Sign in to manage trip requests, navigation, earnings, and vehicle operations.</Text>
            </View>

            <Card>
              <Text style={styles.label}>Email or phone</Text>
              <TextInput
                value={identifier}
                onChangeText={(value) => {
                  setIdentifier(value);
                  setError(null);
                }}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                placeholder="driver@urbanmiles.com or +91 99155 60404"
                placeholderTextColor={colors.subtle}
                returnKeyType="next"
                style={styles.input}
              />
              <Text style={styles.label}>Password</Text>
              <TextInput
                value={password}
                onChangeText={(value) => {
                  setPassword(value);
                  setError(null);
                }}
                placeholder="Enter password"
                placeholderTextColor={colors.subtle}
                secureTextEntry
                returnKeyType="done"
                style={styles.input}
              />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <PrimaryButton onPress={submitLogin} disabled={!identifier.trim() || !password || isSubmitting} style={styles.button}>
                {isSubmitting ? 'Signing in...' : 'Log in'}
              </PrimaryButton>
            </Card>

            <Text style={styles.note}>Driver accounts are created by UrbanMiles admin.</Text>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function readJsonPayload(response: Response): Promise<{ driver?: unknown; error?: string }> {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

function getLoginErrorMessage(status: number, payload: { error?: string }) {
  if (status === 401) return 'Invalid email/phone or password.';
  if (status === 403) return 'Driver account is not active.';
  return payload.error || 'Login failed. Please try again.';
}

function getNetworkErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : '';
  if (
    message === 'Network request failed' ||
    message.toLowerCase().includes('failed to fetch') ||
    message.toLowerCase().includes('abort')
  ) {
    return 'Cannot connect to UrbanMiles server. Check Wi-Fi and server.';
  }
  return message || 'Login failed. Please try again.';
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
  keyboardAvoiding: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.md,
    paddingBottom: 140,
  },
  hero: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  logo: {
    alignItems: 'center',
    backgroundColor: colors.yellow,
    borderRadius: 28,
    height: 64,
    justifyContent: 'center',
    marginBottom: spacing.md,
    width: 64,
  },
  brand: {
    color: colors.yellow,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text,
    fontSize: 34,
    fontWeight: '900',
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: spacing.sm,
    maxWidth: 320,
    textAlign: 'center',
  },
  label: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '900',
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: spacing.md,
    minHeight: 52,
    paddingHorizontal: spacing.md,
  },
  error: {
    color: colors.red,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: spacing.sm,
  },
  button: {
    marginTop: spacing.xs,
  },
  note: {
    color: colors.subtle,
    fontSize: 12,
    fontWeight: '700',
    marginTop: spacing.md,
    textAlign: 'center',
  },
});
