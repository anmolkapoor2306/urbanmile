import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '@/src/components/Buttons';
import { useThemeColors } from '@/src/context/AppContext';
import { radius, shadow, spacing } from '@/src/constants/theme';
import { activeDriver } from '@/src/data/mock';

export function RideCompletedScreen() {
  const router = useRouter();
  const c = useThemeColors();

  const styles = useMemo(() => StyleSheet.create({
    safeArea: {
      backgroundColor: c.background,
      flex: 1,
    },
    container: {
      flex: 1,
      justifyContent: 'center',
      padding: spacing.md,
    },
    card: {
      alignItems: 'center',
      backgroundColor: c.surface,
      borderRadius: radius.xl,
      padding: spacing.lg,
      ...shadow,
    },
    driverPhoto: {
      alignItems: 'center',
      backgroundColor: c.ink,
      borderRadius: 999,
      height: 92,
      justifyContent: 'center',
      width: 92,
    },
    driverInitials: {
      color: c.yellow,
      fontSize: 30,
      fontWeight: '900',
    },
    title: {
      color: c.ink,
      fontSize: 30,
      fontWeight: '900',
      marginTop: spacing.lg,
    },
    subtitle: {
      color: c.muted,
      fontSize: 15,
      fontWeight: '700',
      marginTop: spacing.xs,
      textAlign: 'center',
    },
    stars: {
      flexDirection: 'row',
      gap: spacing.xs,
      marginVertical: spacing.lg,
    },
    comment: {
      backgroundColor: c.surfaceMuted,
      borderRadius: radius.md,
      color: c.ink,
      fontSize: 15,
      fontWeight: '700',
      minHeight: 108,
      padding: spacing.md,
      textAlignVertical: 'top',
      width: '100%',
      marginBottom: spacing.lg,
    },
  }), [c]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.card}>
          <View style={styles.driverPhoto}>
            <Text style={styles.driverInitials}>HS</Text>
          </View>
          <Text style={styles.title}>Ride completed</Text>
          <Text style={styles.subtitle}>How was your ride with {activeDriver.name}?</Text>
          <View style={styles.stars}>
            {Array.from({ length: 5 }).map((_, index) => (
              <Pressable key={`star-${index}`}>
                <Ionicons name="star" size={34} color={c.yellowDark} />
              </Pressable>
            ))}
          </View>
          <TextInput
            placeholder="Add a comment"
            placeholderTextColor={c.subtle}
            multiline
            style={styles.comment}
          />
          <PrimaryButton onPress={() => router.replace('/home')}>Submit rating</PrimaryButton>
        </View>
      </View>
    </SafeAreaView>
  );
}
