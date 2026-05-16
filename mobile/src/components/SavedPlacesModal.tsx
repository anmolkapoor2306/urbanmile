import { Ionicons } from '@expo/vector-icons';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AddPlaceModal } from '@/src/components/AddPlaceModal';
import { useThemeColors } from '@/src/context/AppContext';
import { radius, shadow, spacing } from '@/src/constants/theme';
import type { SavedPlaceItem } from '@/src/context/AppContext';
import { useApp } from '@/src/context/AppContext';

interface SavedPlacesModalProps {
  visible: boolean;
  onClose: () => void;
}

const emptyTitle = 'No saved places yet';
const emptySubtitle = 'Add home, work, or frequently visited places for faster booking.';

export function SavedPlacesModal({ visible, onClose }: SavedPlacesModalProps) {
  const { savedPlaces, removeSavedPlace } = useApp();
  const c = useThemeColors();
  const [showAdd, setShowAdd] = useState(false);

  const handleAdd = useCallback((place: SavedPlaceItem) => {
    setShowAdd(false);
  }, []);

  const handleDelete = useCallback(
    (id: string) => {
      Alert.alert('Delete saved place', 'Remove this saved place?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => removeSavedPlace(id) },
      ]);
    },
    [removeSavedPlace]
  );

  const getIcon = (place: SavedPlaceItem) => {
    if (place.label === 'Home') return 'home';
    if (place.label === 'Work') return 'briefcase';
    return 'location';
  };

  const styles = useMemo(() => StyleSheet.create({
    overlay: {
      backgroundColor: 'rgba(0,0,0,0.4)',
      bottom: 0,
      justifyContent: 'center',
      left: 0,
      position: 'absolute',
      right: 0,
      top: 0,
      zIndex: 25,
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
    },
    card: {
      backgroundColor: c.surface,
      borderRadius: radius.xl,
      marginHorizontal: spacing.lg,
      overflow: 'hidden',
      paddingBottom: spacing.md,
      paddingTop: spacing.md,
      paddingHorizontal: spacing.lg,
      maxHeight: '70%',
      ...shadow,
    },
    modalHeader: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingBottom: spacing.md,
    },
    modalTitle: {
      color: c.ink,
      fontSize: 20,
      fontWeight: '900',
    },
    headerActions: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing.sm,
    },
    addButton: {
      alignItems: 'center',
      backgroundColor: c.yellow,
      borderRadius: 999,
      height: 28,
      justifyContent: 'center',
      width: 28,
    },
    closeButton: {
      padding: 4,
    },
    emptyState: {
      alignItems: 'center',
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
    scroll: {
      maxHeight: 300,
    },
    placeRow: {
      alignItems: 'center',
      backgroundColor: c.surfaceMuted,
      borderRadius: radius.md,
      flexDirection: 'row',
      gap: spacing.md,
      marginBottom: spacing.sm,
      minHeight: 60,
      paddingHorizontal: spacing.md,
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

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.card}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Saved Places</Text>
          <View style={styles.headerActions}>
            <Pressable onPress={() => setShowAdd(true)} style={styles.addButton}>
              <Ionicons name="add" size={18} color={c.ink} />
            </Pressable>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={22} color={c.muted} />
            </Pressable>
          </View>
        </View>

        {savedPlaces.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="bookmark-outline" size={28} color={c.subtle} />
            <Text style={styles.emptyTitle}>{emptyTitle}</Text>
            <Text style={styles.emptySubtitle}>{emptySubtitle}</Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
            {savedPlaces.map((place) => (
              <Pressable key={place.id} onLongPress={() => handleDelete(place.id)} style={styles.placeRow}>
                <View style={styles.placeIcon}>
                  <Ionicons name={getIcon(place)} size={18} color={c.ink} />
                </View>
                <View style={styles.placeCopy}>
                  <Text style={styles.placeLabel}>{place.label}</Text>
                  <Text numberOfLines={1} style={styles.placeAddress}>
                    {place.address}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={17} color={c.subtle} />
              </Pressable>
            ))}
          </ScrollView>
        )}
      </View>

      <AddPlaceModal visible={showAdd} onCancel={() => setShowAdd(false)} onSaved={handleAdd} />
    </View>
  );
}
