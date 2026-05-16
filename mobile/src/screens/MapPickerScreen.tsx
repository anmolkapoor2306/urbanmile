import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '@/src/components/Buttons';
import { LocationPickerMap, type PickerCoordinate } from '@/src/components/LocationPickerMap';
import { useThemeColors } from '@/src/context/AppContext';
import { radius, shadow, spacing } from '@/src/constants/theme';
import { reverseGeocodeCoordinates } from '@/src/lib/geocoding';
import { pointFromParams, serializeRidePlan, type RideField, type RidePlanParams } from '@/src/types/ridePlan';

const defaultCoordinate = {
  latitude: 31.326,
  longitude: 75.5762,
};

const defaultPickup = {
  label: 'Current location',
  latitude: defaultCoordinate.latitude,
  longitude: defaultCoordinate.longitude,
};

const emptyDropoff = {
  label: '',
  latitude: null,
  longitude: null,
};

export function MapPickerScreen() {
  const router = useRouter();
  const c = useThemeColors();
  const params = useLocalSearchParams<RidePlanParams & { field?: RideField }>();

  const field: RideField = params.field === 'pickup' ? 'pickup' : 'dropoff';

  const parsedCenterLat = useMemo(() => {
    const raw = Array.isArray(params.centerLat) ? params.centerLat[0] : params.centerLat;
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }, [params.centerLat]);
  const parsedCenterLng = useMemo(() => {
    const raw = Array.isArray(params.centerLng) ? params.centerLng[0] : params.centerLng;
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }, [params.centerLng]);

  const initialPickup = useMemo(() => pointFromParams(params, 'pickup', defaultPickup), []);
  const initialDropoff = useMemo(() => pointFromParams(params, 'dropoff', emptyDropoff), []);
  const initialSelectedPoint = useMemo(() => (field === 'pickup' ? initialPickup : initialDropoff), [field, initialPickup, initialDropoff]);

  const initialCenter = useMemo(() => {
    if (parsedCenterLat !== null && parsedCenterLng !== null) {
      return { latitude: parsedCenterLat, longitude: parsedCenterLng };
    }
    const sel = field === 'pickup' ? initialPickup : initialDropoff;
    let latitude = sel.latitude ?? defaultCoordinate.latitude;
    let longitude = sel.longitude ?? defaultCoordinate.longitude;
    return { latitude, longitude };
  }, [parsedCenterLat, parsedCenterLng, field, initialPickup, initialDropoff]);

  const [coordinate, setCoordinate] = useState<PickerCoordinate>(initialCenter);
  const [addressPreview, setAddressPreview] = useState(initialSelectedPoint.label || 'Choosing a location');
  const [isResolvingAddress, setIsResolvingAddress] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setIsResolvingAddress(true);
    const timeout = setTimeout(() => {
      reverseGeocodeCoordinates(coordinate.latitude, coordinate.longitude)
        .then((address) => {
          if (!isMounted) return;
          setAddressPreview(address || `Pinned location (${coordinate.latitude.toFixed(4)}, ${coordinate.longitude.toFixed(4)})`);
        })
        .catch(() => {
          if (!isMounted) return;
          setAddressPreview(`Pinned location (${coordinate.latitude.toFixed(4)}, ${coordinate.longitude.toFixed(4)})`);
        })
        .finally(() => {
          if (isMounted) setIsResolvingAddress(false);
        });
    }, 450);
    return () => {
      isMounted = false;
      clearTimeout(timeout);
    };
  }, [coordinate.latitude, coordinate.longitude]);

  function confirmLocation() {
    const nextPoint = {
      label: addressPreview || `Pinned location (${coordinate.latitude.toFixed(4)}, ${coordinate.longitude.toFixed(4)})`,
      latitude: coordinate.latitude,
      longitude: coordinate.longitude,
    };
    const finalPickup = field === 'pickup' ? nextPoint : initialPickup;
    const finalDropoff = field === 'dropoff' ? nextPoint : initialDropoff;

    router.replace({
      pathname: '/destination-search',
      params: serializeRidePlan(finalPickup, finalDropoff, {
        activeField: field,
      }),
    } as Href);
  }

  const styles = useMemo(() => StyleSheet.create({
    screen: {
      backgroundColor: c.background,
      flex: 1,
    },
    overlay: {
      bottom: 0,
      left: 0,
      position: 'absolute',
      right: 0,
      top: 0,
    },
    header: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing.md,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
    },
    backButton: {
      alignItems: 'center',
      backgroundColor: c.surface,
      borderRadius: 999,
      height: 48,
      justifyContent: 'center',
      width: 48,
      ...shadow,
    },
    title: {
      backgroundColor: c.surface,
      borderRadius: 999,
      color: c.ink,
      fontSize: 16,
      fontWeight: '900',
      overflow: 'hidden',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      ...shadow,
    },
    sheet: {
      backgroundColor: c.surface,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      bottom: 0,
      left: 0,
      padding: spacing.md,
      paddingBottom: spacing.xl,
      position: 'absolute',
      right: 0,
      ...shadow,
    },
    label: {
      color: c.muted,
      fontSize: 12,
      fontWeight: '900',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
    },
    address: {
      color: c.ink,
      fontSize: 17,
      fontWeight: '900',
      lineHeight: 23,
      marginTop: spacing.xs,
    },
    helper: {
      color: c.muted,
      fontSize: 13,
      fontWeight: '700',
      lineHeight: 19,
      marginTop: spacing.sm,
    },
    confirmButton: {
      marginTop: spacing.md,
    },
  }), [c]);

  return (
    <View style={styles.screen}>
      <LocationPickerMap coordinate={coordinate} onCoordinateChange={setCoordinate} />
      <SafeAreaView pointerEvents="box-none" style={styles.overlay}>
        <View pointerEvents="box-none" style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={c.ink} />
          </Pressable>
          <Text style={styles.title}>Pick on map</Text>
        </View>

        <View style={styles.sheet}>
          <Text style={styles.label}>{field === 'pickup' ? 'Pickup location' : 'Drop-off location'}</Text>
          <Text numberOfLines={2} style={styles.address}>
            {isResolvingAddress ? 'Finding selected address...' : addressPreview}
          </Text>
          <Text style={styles.helper}>Drag the pin or tap the map to adjust the exact location.</Text>
          <PrimaryButton onPress={confirmLocation} style={styles.confirmButton}>
            {field === 'pickup' ? 'Confirm pickup' : 'Confirm drop-off'}
          </PrimaryButton>
        </View>
      </SafeAreaView>
    </View>
  );
}
