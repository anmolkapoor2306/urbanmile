import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { forwardRef, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
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
import { useThemeColors } from '@/src/context/AppContext';
import { useApp } from '@/src/context/AppContext';
import { radius, shadow, spacing } from '@/src/constants/theme';
import { recentPlaces } from '@/src/data/mock';
import { fetchAddressSuggestions, type AddressSuggestion } from '@/src/lib/geocoding';
import {
  hasCompletePoint,
  serializeRidePlan,
  type RideField,
  type RidePlanParams,
  type RidePoint,
} from '@/src/types/ridePlan';

const defaultPickup: RidePoint = {
  label: 'Current location',
  latitude: 31.326,
  longitude: 75.5762,
};

const emptyDropoff: RidePoint = {
  label: '',
  latitude: null,
  longitude: null,
};

const savedPlacePoints: Record<string, RidePoint> = {
  home: { label: 'Home', latitude: 31.3099, longitude: 75.5762 },
  work: { label: 'Work', latitude: 31.326, longitude: 75.5762 },
};

const recentPlacePoints: Record<string, RidePoint> = {
  airport: { label: 'Amritsar Airport', latitude: 31.7096, longitude: 74.7973 },
  office: { label: 'Urban Estate Phase 2', latitude: 31.2882, longitude: 75.6237 },
  hotel: { label: 'Volga Hotel, Amritsar', latitude: 31.6355, longitude: 74.8723 },
};

export function DestinationSearchScreen() {
  const router = useRouter();
  const { savedPlaces } = useApp();
  const c = useThemeColors();
  const params = useLocalSearchParams<RidePlanParams & { activeField?: RideField }>();

  const stableParamStrs = useMemo(() => {
    const pick = (v: string | string[] | undefined) => Array.isArray(v) ? v[0] : (v || '');
    return {
      pickupLabel: pick(params.pickupLabel),
      pickupLat: pick(params.pickupLat),
      pickupLng: pick(params.pickupLng),
      dropoffLabel: pick(params.dropoffLabel),
      dropoffLat: pick(params.dropoffLat),
      dropoffLng: pick(params.dropoffLng),
      activeField: pick(params.activeField),
    };
  }, [params.pickupLabel, params.pickupLat, params.pickupLng, params.dropoffLabel, params.dropoffLat, params.dropoffLng, params.activeField]);

  const parsedPickup = useMemo(() => ({
    label: stableParamStrs.pickupLabel || defaultPickup.label,
    latitude: stableParamStrs.pickupLat ? Number(stableParamStrs.pickupLat) : defaultPickup.latitude,
    longitude: stableParamStrs.pickupLng ? Number(stableParamStrs.pickupLng) : defaultPickup.longitude,
  }), [stableParamStrs.pickupLabel, stableParamStrs.pickupLat, stableParamStrs.pickupLng]);

  const parsedDropoff = useMemo(() => ({
    label: stableParamStrs.dropoffLabel || '',
    latitude: stableParamStrs.dropoffLat ? Number(stableParamStrs.dropoffLat) : null,
    longitude: stableParamStrs.dropoffLng ? Number(stableParamStrs.dropoffLng) : null,
  }), [stableParamStrs.dropoffLabel, stableParamStrs.dropoffLat, stableParamStrs.dropoffLng]);

  const initialActiveField = useMemo(() => {
    const text = stableParamStrs.activeField;
    if (text === 'pickup' || text === 'dropoff') return text as RideField;
    if (parsedDropoff.label.trim() && parsedDropoff.latitude !== null && parsedDropoff.longitude !== null) return 'pickup' as RideField;
    return 'dropoff' as RideField;
  }, [stableParamStrs.activeField, parsedDropoff.label, parsedDropoff.latitude, parsedDropoff.longitude]);

  const [pickup, setPickup] = useState<RidePoint>(parsedPickup);
  const [dropoff, setDropoff] = useState<RidePoint>(parsedDropoff);
  const [activeField, setActiveField] = useState<RideField>(initialActiveField);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const pickupInputRef = useRef<TextInput | null>(null);
  const dropoffInputRef = useRef<TextInput | null>(null);

  const activePoint = activeField === 'pickup' ? pickup : dropoff;
  const canSeePrices = hasCompletePoint(pickup) && hasCompletePoint(dropoff);

  useEffect(() => {
    setPickup(parsedPickup);
    setDropoff(parsedDropoff);
    setActiveField(initialActiveField);
  }, [parsedPickup, parsedDropoff, initialActiveField]);

  useEffect(() => {
    const input = activeField === 'pickup' ? pickupInputRef : dropoffInputRef;
    const timeout = setTimeout(() => input.current?.focus(), 180);
    return () => clearTimeout(timeout);
  }, [activeField]);

  useEffect(() => {
    const query = activePoint.label.trim();
    const controller = new AbortController();
    if (query.length < 2 || query.toLowerCase() === 'current location') {
      setSuggestions([]);
      setIsLoadingSuggestions(false);
      return () => controller.abort();
    }
    setIsLoadingSuggestions(true);
    const timeout = setTimeout(() => {
      fetchAddressSuggestions(query, controller.signal)
        .then(setSuggestions)
        .catch((error) => {
          if (error instanceof Error && error.name === 'AbortError') return;
          setSuggestions([]);
        })
        .finally(() => setIsLoadingSuggestions(false));
    }, 260);
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [activePoint.label]);

  function updateField(field: RideField, label: string) {
    const nextPoint = { label, latitude: null, longitude: null };
    if (field === 'pickup') {
      setPickup(nextPoint);
    } else {
      setDropoff(nextPoint);
    }
  }

  function selectPoint(point: RidePoint) {
    if (activeField === 'pickup') {
      setPickup(point);
      setActiveField('dropoff');
    } else {
      setDropoff(point);
    }
  }

  function selectSuggestion(suggestion: AddressSuggestion) {
    selectPoint({
      label: suggestion.label,
      latitude: suggestion.latitude,
      longitude: suggestion.longitude,
    });
  }

  function openMapPicker(field: RideField) {
    let centerLat = '';
    let centerLng = '';
    if (suggestions.length > 0 && activeField === field) {
      const top = suggestions[0];
      centerLat = String(top.latitude);
      centerLng = String(top.longitude);
    } else if (activeField === field && activePoint.latitude !== null && activePoint.longitude !== null) {
      centerLat = String(activePoint.latitude);
      centerLng = String(activePoint.longitude);
    } else if (field === 'pickup' && pickup.latitude !== null && pickup.longitude !== null) {
      centerLat = String(pickup.latitude);
      centerLng = String(pickup.longitude);
    } else if (dropoff.latitude !== null && dropoff.longitude !== null) {
      centerLat = String(dropoff.latitude);
      centerLng = String(dropoff.longitude);
    }
    router.push({
      pathname: '/map-picker',
      params: serializeRidePlan(pickup, dropoff, {
        field,
        centerLat,
        centerLng,
      }),
    } as Href);
  }

  function seePrices() {
    if (!canSeePrices) return;
    router.push({
      pathname: '/choose-ride',
      params: serializeRidePlan(pickup, dropoff),
    } as Href);
  }

  const styles = useMemo(() => StyleSheet.create({
    safeArea: {
      backgroundColor: c.background,
      flex: 1,
    },
    keyboardView: {
      flex: 1,
    },
    header: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing.md,
      padding: spacing.md,
      paddingBottom: spacing.sm,
    },
    backButton: {
      alignItems: 'center',
      backgroundColor: c.surface,
      borderRadius: 999,
      height: 44,
      justifyContent: 'center',
      width: 44,
      ...shadow,
    },
    title: {
      color: c.ink,
      fontSize: 24,
      fontWeight: '900',
    },
    subtitle: {
      color: c.muted,
      fontSize: 12,
      fontWeight: '800',
      marginTop: 2,
    },
    content: {
      padding: spacing.md,
      paddingBottom: 112,
      paddingTop: spacing.xs,
    },
    searchCard: {
      backgroundColor: c.surface,
      borderColor: c.border,
      borderRadius: radius.lg,
      borderWidth: 1,
      padding: spacing.sm,
      ...shadow,
    },
    inputRow: {
      alignItems: 'center',
      borderColor: 'transparent',
      borderRadius: radius.md,
      borderWidth: 1,
      flexDirection: 'row',
      gap: spacing.sm,
      minHeight: 52,
      paddingHorizontal: spacing.sm,
    },
    inputRowActive: {
      backgroundColor: c.surfaceMuted,
      borderColor: c.yellowDark,
    },
    dot: {
      borderRadius: 999,
      height: 11,
      width: 11,
    },
    pickupDot: {
      backgroundColor: c.green,
    },
    dropoffDot: {
      backgroundColor: c.yellowDark,
    },
    input: {
      color: c.ink,
      flex: 1,
      fontSize: 16,
      fontWeight: '800',
      minHeight: 48,
    },
    connector: {
      backgroundColor: c.border,
      height: 16,
      marginLeft: spacing.md,
      width: 1,
    },
    suggestionCard: {
      backgroundColor: c.surface,
      borderColor: c.border,
      borderRadius: radius.lg,
      borderWidth: 1,
      marginTop: spacing.md,
      overflow: 'hidden',
    },
    loadingText: {
      color: c.muted,
      fontSize: 12,
      fontWeight: '800',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    section: {
      marginTop: spacing.lg,
    },
    sectionTitle: {
      color: c.muted,
      fontSize: 12,
      fontWeight: '900',
      letterSpacing: 1.6,
      marginBottom: spacing.sm,
      textTransform: 'uppercase',
    },
    placeRow: {
      alignItems: 'center',
      backgroundColor: c.surface,
      borderBottomColor: c.border,
      borderBottomWidth: 1,
      flexDirection: 'row',
      gap: spacing.md,
      minHeight: 64,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    placeRowHighlighted: {
      backgroundColor: '#fff8da',
    },
    placeIcon: {
      alignItems: 'center',
      backgroundColor: c.surfaceMuted,
      borderRadius: 16,
      height: 38,
      justifyContent: 'center',
      width: 38,
    },
    placeIconHighlighted: {
      backgroundColor: c.yellow,
    },
    placeCopy: {
      flex: 1,
    },
    placeTitle: {
      color: c.ink,
      fontSize: 15,
      fontWeight: '900',
    },
    placeSubtitle: {
      color: c.muted,
      fontSize: 12,
      fontWeight: '700',
      lineHeight: 17,
      marginTop: 3,
    },
    footer: {
      backgroundColor: c.background,
      borderTopColor: c.border,
      borderTopWidth: 1,
      bottom: 0,
      left: 0,
      padding: spacing.md,
      paddingBottom: spacing.lg,
      position: 'absolute',
      right: 0,
    },
  }), [c]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={c.ink} />
          </Pressable>
          <View>
            <Text style={styles.title}>Plan your ride</Text>
            <Text style={styles.subtitle}>Pickup is ready. Add where you are going.</Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.searchCard}>
            <SearchInput
              ref={pickupInputRef}
              field="pickup"
              value={pickup.label}
              isActive={activeField === 'pickup'}
              placeholder="Pickup"
              onFocus={() => setActiveField('pickup')}
              onChangeText={(text) => updateField('pickup', text)}
              inkColor={c.ink}
              subtleColor={c.subtle}
            />
            <View style={styles.connector} />
            <SearchInput
              ref={dropoffInputRef}
              field="dropoff"
              value={dropoff.label}
              isActive={activeField === 'dropoff'}
              placeholder="Drop-off"
              onFocus={() => setActiveField('dropoff')}
              onChangeText={(text) => updateField('dropoff', text)}
              inkColor={c.ink}
              subtleColor={c.subtle}
            />
          </View>

          <View style={styles.suggestionCard}>
            <PlaceRow
              icon="map"
              title="Pick on map"
              subtitle={`Choose exact ${activeField === 'pickup' ? 'pickup' : 'drop-off'} location`}
              onPress={() => openMapPicker(activeField)}
              isHighlighted
              inkColor={c.ink}
              subtleColor={c.subtle}
              surfaceMutedColor={c.surfaceMuted}
              yellowColor={c.yellow}
            />

            {isLoadingSuggestions ? <Text style={styles.loadingText}>Finding places...</Text> : null}

            {suggestions.map((suggestion) => (
              <PlaceRow
                key={suggestion.id}
                icon="search"
                title={suggestion.label}
                subtitle={suggestion.description}
                onPress={() => selectSuggestion(suggestion)}
                inkColor={c.ink}
                subtleColor={c.subtle}
                surfaceMutedColor={c.surfaceMuted}
                yellowColor={c.yellow}
              />
            ))}
          </View>

          <Section title="Saved places" color={c.muted}>
            {savedPlaces.map((place) => (
              <PlaceRow
                key={place.id}
                icon={place.id === 'home' ? 'home' : 'briefcase'}
                title={place.label}
                subtitle={place.address}
                onPress={() => selectPoint(savedPlacePoints[place.id] ?? { label: place.label, latitude: null, longitude: null })}
                inkColor={c.ink}
                subtleColor={c.subtle}
                surfaceMutedColor={c.surfaceMuted}
                yellowColor={c.yellow}
              />
            ))}
          </Section>

          <Section title="Recent places" color={c.muted}>
            {recentPlaces.map((place) => (
              <PlaceRow
                key={place.id}
                icon="time"
                title={place.title}
                subtitle={place.subtitle}
                onPress={() => selectPoint(recentPlacePoints[place.id] ?? { label: place.title, latitude: null, longitude: null })}
                inkColor={c.ink}
                subtleColor={c.subtle}
                surfaceMutedColor={c.surfaceMuted}
                yellowColor={c.yellow}
              />
            ))}
          </Section>
        </ScrollView>

        <View style={styles.footer}>
          <PrimaryButton onPress={seePrices} disabled={!canSeePrices}>
            See Prices
          </PrimaryButton>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const SearchInput = forwardRef<TextInput, {
  field: RideField;
  value: string;
  isActive: boolean;
  placeholder: string;
  onFocus: () => void;
  onChangeText: (text: string) => void;
  inkColor: string;
  subtleColor: string;
}>(function SearchInput({ field, value, isActive, placeholder, onFocus, onChangeText, inkColor, subtleColor }, ref) {
  return (
    <View style={[
      { alignItems: 'center', borderColor: 'transparent', borderRadius: 14, borderWidth: 1, flexDirection: 'row', gap: spacing.sm, minHeight: 52, paddingHorizontal: spacing.sm },
      isActive && { backgroundColor: '#f0ebe2', borderColor: '#d99b00' },
    ]}>
      <View style={[
        { borderRadius: 999, height: 11, width: 11 },
        field === 'pickup' ? { backgroundColor: '#0f9f6e' } : { backgroundColor: '#d99b00' },
      ]} />
      <TextInput
        ref={ref}
        value={value}
        placeholder={placeholder}
        placeholderTextColor={subtleColor}
        style={{ color: inkColor, flex: 1, fontSize: 16, fontWeight: '800', minHeight: 48 }}
        returnKeyType="search"
        onFocus={onFocus}
        onChangeText={onChangeText}
      />
    </View>
  );
});

function Section({ title, children, color }: { title: string; children: ReactNode; color: string }) {
  return (
    <View style={{ marginTop: spacing.lg }}>
      <Text style={{ color, fontSize: 12, fontWeight: '900', letterSpacing: 1.6, marginBottom: spacing.sm, textTransform: 'uppercase' }}>{title}</Text>
      {children}
    </View>
  );
}

function PlaceRow({
  icon,
  title,
  subtitle,
  onPress,
  isHighlighted = false,
  inkColor,
  subtleColor,
  surfaceMutedColor,
  yellowColor,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
  isHighlighted?: boolean;
  inkColor: string;
  subtleColor: string;
  surfaceMutedColor: string;
  yellowColor: string;
}) {
  return (
    <Pressable onPress={onPress} style={[
      { alignItems: 'center', backgroundColor: '#ffffff', borderBottomColor: '#e4ded3', borderBottomWidth: 1, flexDirection: 'row', gap: spacing.md, minHeight: 64, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
      isHighlighted && { backgroundColor: '#fff8da' },
    ]}>
      <View style={[
        { alignItems: 'center', backgroundColor: surfaceMutedColor, borderRadius: 16, height: 38, justifyContent: 'center', width: 38 },
        isHighlighted && { backgroundColor: yellowColor },
      ]}>
        <Ionicons name={icon} size={18} color={inkColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: inkColor, fontSize: 15, fontWeight: '900' }}>{title}</Text>
        <Text numberOfLines={2} style={{ color: subtleColor, fontSize: 12, fontWeight: '700', lineHeight: 17, marginTop: 3 }}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={subtleColor} />
    </Pressable>
  );
}
