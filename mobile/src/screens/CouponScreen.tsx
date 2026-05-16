import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableWithoutFeedback, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '@/src/components/Buttons';
import { useThemeColors } from '@/src/context/AppContext';
import { radius, shadow, spacing } from '@/src/constants/theme';
import { coupons } from '@/src/data/mock';

export function CouponScreen() {
  const router = useRouter();
  const c = useThemeColors();

  const styles = useMemo(() => StyleSheet.create({
    safeArea: {
      backgroundColor: c.background,
      flex: 1,
      justifyContent: 'flex-end',
    },
    keyboard: {
      flex: 1,
    },
    content: {
      backgroundColor: c.surface,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      marginTop: 'auto',
      padding: spacing.md,
      paddingBottom: 130,
      ...shadow,
    },
    handle: {
      alignSelf: 'center',
      backgroundColor: c.border,
      borderRadius: 999,
      height: 5,
      marginBottom: spacing.md,
      width: 48,
    },
    header: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    title: {
      color: c.ink,
      fontSize: 24,
      fontWeight: '900',
    },
    closeButton: {
      alignItems: 'center',
      backgroundColor: c.surfaceMuted,
      borderRadius: 999,
      height: 42,
      justifyContent: 'center',
      width: 42,
    },
    inputRow: {
      alignItems: 'center',
      backgroundColor: c.surfaceMuted,
      borderRadius: radius.md,
      flexDirection: 'row',
      marginTop: spacing.lg,
      padding: spacing.xs,
    },
    input: {
      color: c.ink,
      flex: 1,
      fontSize: 15,
      fontWeight: '800',
      minHeight: 46,
      paddingHorizontal: spacing.md,
    },
    applyButton: {
      alignItems: 'center',
      backgroundColor: c.yellow,
      borderRadius: radius.sm,
      justifyContent: 'center',
      minHeight: 42,
      paddingHorizontal: spacing.md,
    },
    applyText: {
      color: c.ink,
      fontSize: 13,
      fontWeight: '900',
    },
    couponCard: {
      alignItems: 'center',
      borderColor: c.border,
      borderRadius: radius.lg,
      borderWidth: 1,
      flexDirection: 'row',
      gap: spacing.md,
      marginTop: spacing.md,
      padding: spacing.md,
    },
    ticketIcon: {
      alignItems: 'center',
      backgroundColor: c.yellow,
      borderRadius: 18,
      height: 46,
      justifyContent: 'center',
      width: 46,
    },
    couponCopy: {
      flex: 1,
    },
    couponCode: {
      color: c.ink,
      fontSize: 16,
      fontWeight: '900',
    },
    couponTitle: {
      color: c.muted,
      fontSize: 13,
      fontWeight: '800',
      marginTop: 2,
    },
    couponDetail: {
      color: c.subtle,
      fontSize: 12,
      fontWeight: '700',
      marginTop: 3,
    },
    doneButton: {
      marginTop: spacing.lg,
    },
  }), [c]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboard}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.handle} />
            <View style={styles.header}>
              <Text style={styles.title}>Apply Coupon</Text>
              <Pressable onPress={() => router.back()} style={styles.closeButton}>
                <Ionicons name="close" size={22} color={c.ink} />
              </Pressable>
            </View>
            <View style={styles.inputRow}>
              <TextInput placeholder="Enter coupon code" placeholderTextColor={c.subtle} style={styles.input} autoCapitalize="characters" />
              <Pressable style={styles.applyButton}>
                <Text style={styles.applyText}>Apply</Text>
              </Pressable>
            </View>
            {coupons.map((coupon) => (
              <Pressable key={coupon.id} style={styles.couponCard}>
                <View style={styles.ticketIcon}>
                  <Ionicons name="ticket" size={22} color={c.ink} />
                </View>
                <View style={styles.couponCopy}>
                  <Text style={styles.couponCode}>{coupon.code}</Text>
                  <Text style={styles.couponTitle}>{coupon.title}</Text>
                  <Text style={styles.couponDetail}>{coupon.detail}</Text>
                </View>
              </Pressable>
            ))}
            <PrimaryButton onPress={() => router.back()} style={styles.doneButton}>Done</PrimaryButton>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
