import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '@/src/components/Buttons';
import { useApp, useThemeColors } from '@/src/context/AppContext';
import { radius, spacing } from '@/src/constants/theme';
import type { SavedPlaceItem } from '@/src/context/AppContext';

const placeLabels = ['Home', 'Work', 'Other'] as const;

interface AddPlaceModalProps {
  visible: boolean;
  onCancel: () => void;
  onSaved?: (place: SavedPlaceItem) => void;
}

export function AddPlaceModal({ visible, onCancel, onSaved }: AddPlaceModalProps) {
  const { addSavedPlace } = useApp();
  const c = useThemeColors();
  const [label, setLabel] = useState('Home');
  const [address, setAddress] = useState('');
  const [note, setNote] = useState('');
  const addressInputRef = useRef<TextInput | null>(null);

  useEffect(() => {
    if (visible) {
      const timeout = setTimeout(() => addressInputRef.current?.focus(), 200);
      return () => clearTimeout(timeout);
    }
  }, [visible]);

  useEffect(() => {
    if (visible) {
      setLabel('Home');
      setAddress('');
      setNote('');
    }
  }, [visible]);

  const handleSave = useCallback(() => {
    const trimmed = address.trim();
    if (!trimmed) return;
    const place: SavedPlaceItem = {
      id: `place-${Date.now()}`,
      label,
      address: trimmed,
      note: note.trim() || undefined,
    };
    addSavedPlace(place);
    onSaved?.(place);
    onCancel();
  }, [label, address, note, addSavedPlace, onSaved, onCancel]);

  const styles = useMemo(() => StyleSheet.create({
    overlay: {
      backgroundColor: 'rgba(0,0,0,0.4)',
      bottom: 0,
      justifyContent: 'flex-end',
      left: 0,
      position: 'absolute',
      right: 0,
      top: 0,
      zIndex: 30,
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
    },
    card: {
      backgroundColor: c.surface,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      paddingBottom: spacing.lg,
      paddingTop: spacing.md,
      paddingHorizontal: spacing.lg,
    },
    scroll: {
      maxHeight: 350,
    },
    header: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingBottom: spacing.md,
    },
    title: {
      color: c.ink,
      fontSize: 20,
      fontWeight: '900',
    },
    closeButton: {
      padding: 4,
    },
    fieldLabel: {
      color: c.muted,
      fontSize: 12,
      fontWeight: '900',
      letterSpacing: 1.2,
      marginBottom: spacing.xs,
      textTransform: 'uppercase',
    },
    labelPills: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginBottom: spacing.lg,
    },
    labelPill: {
      alignItems: 'center',
      backgroundColor: c.surfaceMuted,
      borderColor: c.border,
      borderRadius: radius.md,
      borderWidth: 1.5,
      flexDirection: 'row',
      gap: 6,
      paddingHorizontal: spacing.sm,
      paddingVertical: 8,
    },
    labelPillActive: {
      borderColor: c.yellow,
      backgroundColor: '#fff8da',
    },
    labelPillText: {
      color: c.muted,
      fontSize: 13,
      fontWeight: '900',
    },
    labelPillTextActive: {
      color: c.ink,
    },
    input: {
      backgroundColor: c.surfaceMuted,
      borderColor: c.border,
      borderRadius: radius.md,
      borderWidth: 1.5,
      color: c.ink,
      fontSize: 15,
      fontWeight: '700',
      minHeight: 52,
      paddingHorizontal: spacing.md,
    },
    actions: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.lg,
      paddingBottom: 8,
    },
    cancelButton: {
      alignItems: 'center',
      backgroundColor: c.surfaceMuted,
      borderColor: c.border,
      borderRadius: radius.md,
      borderWidth: 1,
      flex: 1,
      justifyContent: 'center',
      minHeight: 54,
    },
    cancelText: {
      color: c.ink,
      fontSize: 15,
      fontWeight: '900',
    },
    saveButton: {
      flex: 2,
    },
  }), [c]);

  if (!visible) return null;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.overlay}>
      <Pressable style={styles.backdrop} onPress={onCancel} />
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.title}>Add saved place</Text>
          <Pressable onPress={onCancel} style={styles.closeButton}>
            <Ionicons name="close" size={22} color={c.muted} />
          </Pressable>
        </View>

        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} style={styles.scroll}>
          <Text style={styles.fieldLabel}>Place label</Text>
          <View style={styles.labelPills}>
            {placeLabels.map((l) => (
              <Pressable
                key={l}
                onPress={() => setLabel(l)}
                style={[styles.labelPill, label === l && styles.labelPillActive]}>
                <Ionicons
                  name={l === 'Home' ? 'home' : l === 'Work' ? 'briefcase' : 'location'}
                  size={16}
                  color={label === l ? c.ink : c.muted}
                />
                <Text style={[styles.labelPillText, label === l && styles.labelPillTextActive]}>{l}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.fieldLabel}>Address</Text>
          <TextInput
            ref={addressInputRef}
            value={address}
            placeholder="Search address..."
            placeholderTextColor={c.subtle}
            style={styles.input}
            onChangeText={setAddress}
            returnKeyType="next"
          />

          <Text style={[styles.fieldLabel, { marginTop: spacing.sm }]}>Note (optional)</Text>
          <TextInput
            value={note}
            placeholder="e.g., Main building, Gate 2"
            placeholderTextColor={c.subtle}
            style={[styles.input, { marginTop: spacing.xs }]}
            onChangeText={setNote}
            returnKeyType="done"
          />

          <View style={styles.actions}>
            <Pressable onPress={onCancel} style={styles.cancelButton}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <PrimaryButton
              onPress={handleSave}
              disabled={!address.trim()}
              style={styles.saveButton}>
              Save Place
            </PrimaryButton>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}


