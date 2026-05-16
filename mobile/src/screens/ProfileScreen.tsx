import { Ionicons } from '@expo/vector-icons';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomNav } from '@/src/components/BottomNav';
import { AddPlaceModal } from '@/src/components/AddPlaceModal';
import { useThemeColors } from '@/src/context/AppContext';
import { useApp } from '@/src/context/AppContext';
import { radius, shadow, spacing } from '@/src/constants/theme';
import { customer } from '@/src/data/mock';

export function ProfileScreen() {
  const { savedPlaces, removeSavedPlace } = useApp();
  const c = useThemeColors();
  const [showAdd, setShowAdd] = useState(false);

  const handleDeletePlace = useCallback(
    (id: string) => {
      Alert.alert('Delete saved place', 'Remove this saved place?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => removeSavedPlace(id),
        },
      ]);
    },
    [removeSavedPlace]
  );

  const getPlaceIcon = (label: string) => {
    if (label === 'Home') return 'home' as const;
    if (label === 'Work') return 'briefcase' as const;
    return 'location' as const;
  };

  const styles = useMemo(() => StyleSheet.create({
    safeArea: {
      backgroundColor: c.background,
      flex: 1,
    },
    content: {
      padding: spacing.md,
      paddingBottom: 104,
    },
    profileCard: {
      alignItems: 'center',
      backgroundColor: c.surface,
      borderRadius: radius.xl,
      padding: spacing.lg,
      ...shadow,
    },
    avatar: {
      alignItems: 'center',
      backgroundColor: c.ink,
      borderRadius: 999,
      height: 78,
      justifyContent: 'center',
      width: 78,
    },
    avatarText: {
      color: c.yellow,
      fontSize: 24,
      fontWeight: '900',
    },
    name: {
      color: c.ink,
      fontSize: 24,
      fontWeight: '900',
      marginTop: spacing.md,
    },
    phone: {
      color: c.muted,
      fontSize: 14,
      fontWeight: '800',
      marginTop: 4,
    },
    email: {
      color: c.subtle,
      fontSize: 13,
      fontWeight: '700',
      marginTop: 3,
    },
    sectionHeader: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: spacing.sm,
      marginTop: spacing.lg,
    },
    sectionTitle: {
      color: c.muted,
      fontSize: 12,
      fontWeight: '900',
      letterSpacing: 1.6,
      textTransform: 'uppercase',
    },
    addButton: {
      alignItems: 'center',
      backgroundColor: c.yellow,
      borderRadius: 999,
      height: 26,
      justifyContent: 'center',
      width: 26,
    },
    emptyState: {
      alignItems: 'center',
      marginTop: spacing.xs,
      paddingBottom: spacing.lg,
      paddingTop: spacing.xl,
    },
    emptyTitle: {
      color: c.ink,
      fontSize: 16,
      fontWeight: '900',
      marginTop: spacing.sm,
    },
    emptySubtitle: {
      color: c.muted,
      fontSize: 13,
      fontWeight: '700',
      marginTop: 4,
      textAlign: 'center',
    },
    placeRow: {
      alignItems: 'center',
      backgroundColor: c.surface,
      borderRadius: radius.md,
      flexDirection: 'row',
      gap: spacing.md,
      marginBottom: spacing.sm,
      minHeight: 60,
      paddingHorizontal: spacing.md,
      ...shadow,
    },
    placeIcon: {
      alignItems: 'center',
      backgroundColor: c.yellow,
      borderRadius: 16,
      height: 38,
      justifyContent: 'center',
      width: 38,
    },
    placeCopy: {
      flex: 1,
    },
    placeLabel: {
      color: c.ink,
      fontSize: 15,
      fontWeight: '900',
    },
    placeAddress: {
      color: c.muted,
      fontSize: 12,
      fontWeight: '700',
      marginTop: 2,
    },
  }), [c]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>AK</Text>
          </View>
          <Text style={styles.name}>{customer.name}</Text>
          <Text style={styles.phone}>{customer.phone}</Text>
          <Text style={styles.email}>{customer.email}</Text>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Saved Places</Text>
          <Pressable onPress={() => setShowAdd(true)} style={styles.addButton}>
            <Ionicons name="add" size={18} color={c.ink} />
          </Pressable>
        </View>

        {savedPlaces.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="bookmark-outline" size={28} color={c.subtle} />
            <Text style={styles.emptyTitle}>No saved places yet</Text>
            <Text style={styles.emptySubtitle}>
              Add home, work, or frequently visited places for faster booking.
            </Text>
          </View>
        ) : (
          savedPlaces.map((place) => (
            <Pressable
              key={place.id}
              onLongPress={() => handleDeletePlace(place.id)}
              style={styles.placeRow}>
              <View style={styles.placeIcon}>
                <Ionicons name={getPlaceIcon(place.label)} size={18} color={c.ink} />
              </View>
              <View style={styles.placeCopy}>
                <Text style={styles.placeLabel}>{place.label}</Text>
                <Text numberOfLines={1} style={styles.placeAddress}>
                  {place.address}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={17} color={c.subtle} />
            </Pressable>
          ))
        )}
      </ScrollView>
      <BottomNav active="wallet" />
      <AddPlaceModal visible={showAdd} onCancel={() => setShowAdd(false)} />
    </SafeAreaView>
  );
}
