import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomNav } from '@/src/components/BottomNav';
import { CustomerMap, type CustomerRegion } from '@/src/components/CustomerMap';
import { SideDrawer } from '@/src/components/SideDrawer';
import { SavedPlacesModal } from '@/src/components/SavedPlacesModal';
import { useThemeColors } from '@/src/context/AppContext';
import { radius, shadow, spacing } from '@/src/constants/theme';
import { customer, recentPlaces } from '@/src/data/mock';
import { serializeRidePlan, type RidePoint } from '@/src/types/ridePlan';

const categories = [
  { label: 'City Ride', icon: 'car' },
  { label: 'Airport', icon: 'airplane' },
  { label: 'Outstation', icon: 'trail-sign' },
] as const;

const defaultCustomerRegion: CustomerRegion = {
  latitude: 31.326,
  longitude: 75.5762,
  latitudeDelta: 0.07,
  longitudeDelta: 0.07,
};

const emptyDropoff: RidePoint = {
  label: '',
  latitude: null,
  longitude: null,
};

export function HomeMapScreen() {
  const router = useRouter();
  const c = useThemeColors();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showSavedPlaces, setShowSavedPlaces] = useState(false);
  const [customerRegion, setCustomerRegion] = useState(defaultCustomerRegion);
  const [currentArea, setCurrentArea] = useState(customer.pickupArea);
  const [isLocationDenied, setIsLocationDenied] = useState(false);
  const [locationMessage, setLocationMessage] = useState('Waiting for GPS location...');
  const [recenterKey, setRecenterKey] = useState(0);
  const hasCenteredOnGpsRef = useRef(false);
  const locationSubscriptionRef = useRef<Location.LocationSubscription | null>(null);

  const updateCustomerLocation = useCallback((location: Location.LocationObject) => {
    const nextRegion = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      latitudeDelta: 0.045,
      longitudeDelta: 0.045,
    };
    setCustomerRegion(nextRegion);
    setCurrentArea('Current location');
    setLocationMessage('Location active');
    if (!hasCenteredOnGpsRef.current) {
      hasCenteredOnGpsRef.current = true;
      setRecenterKey((current) => current + 1);
    }
  }, []);

  const requestAndWatchLocation = useCallback(async (isMounted: () => boolean = () => true) => {
    setLocationMessage('Waiting for GPS location...');
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!isMounted()) return null;
    if (permission.status !== 'granted') {
      setIsLocationDenied(true);
      setLocationMessage('Enable location to center the booking map.');
      return null;
    }
    setIsLocationDenied(false);
    try {
      const currentLocation = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      if (!isMounted()) return null;
      updateCustomerLocation(currentLocation);
    } catch {
      setLocationMessage('Waiting for GPS location...');
    }
    locationSubscriptionRef.current?.remove();
    locationSubscriptionRef.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        distanceInterval: 10,
        timeInterval: 3000,
      },
      (location) => {
        if (!isMounted()) return;
        updateCustomerLocation(location);
      }
    );
    return locationSubscriptionRef.current;
  }, [updateCustomerLocation]);

  useEffect(() => {
    let isMounted = true;
    async function startLocation() {
      await requestAndWatchLocation(() => isMounted);
    }
    if (Platform.OS !== 'web') {
      void startLocation();
    }
    return () => {
      isMounted = false;
      locationSubscriptionRef.current?.remove();
      locationSubscriptionRef.current = null;
    };
  }, [requestAndWatchLocation]);

  function centerOnCustomer() {
    if (isLocationDenied) {
      void requestAndWatchLocation();
      return;
    }
    setRecenterKey((current) => current + 1);
  }

  function getPickupPoint(): RidePoint {
    return {
      label: currentArea || 'Current location',
      latitude: customerRegion.latitude,
      longitude: customerRegion.longitude,
    };
  }

  function openPlanRide(dropoff: RidePoint = emptyDropoff) {
    router.push({
      pathname: '/destination-search',
      params: serializeRidePlan(getPickupPoint(), dropoff),
    } as Href);
  }

  function openDestinationSearch() {
    router.push({
      pathname: '/destination-search',
      params: serializeRidePlan(getPickupPoint(), emptyDropoff),
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
    topBar: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
    },
    roundButton: {
      alignItems: 'center',
      backgroundColor: c.surface,
      borderRadius: 999,
      height: 48,
      justifyContent: 'center',
      width: 48,
      ...shadow,
    },
    searchPill: {
      alignItems: 'center',
      backgroundColor: c.surface,
      borderRadius: 999,
      flex: 1,
      flexDirection: 'row',
      gap: spacing.xs,
      minHeight: 48,
      paddingHorizontal: spacing.md,
      ...shadow,
    },
    searchText: {
      color: c.ink,
      flex: 1,
      fontSize: 14,
      fontWeight: '900',
    },
    sheet: {
      alignItems: 'center',
      backgroundColor: c.surface,
      borderRadius: radius.xl,
      bottom: 92,
      left: spacing.md,
      padding: spacing.md,
      position: 'absolute',
      right: spacing.md,
      ...shadow,
    },
    locationNotice: {
      alignItems: 'center',
      backgroundColor: c.surface,
      borderColor: c.border,
      borderRadius: radius.lg,
      borderWidth: 1,
      flexDirection: 'row',
      gap: spacing.sm,
      left: spacing.md,
      padding: spacing.md,
      position: 'absolute',
      right: spacing.md,
      top: 92,
      ...shadow,
    },
    noticeCopy: {
      flex: 1,
    },
    noticeTitle: {
      color: c.ink,
      fontSize: 13,
      fontWeight: '900',
    },
    noticeSubtitle: {
      color: c.muted,
      fontSize: 11,
      fontWeight: '700',
      marginTop: 2,
    },
    enableLocationButton: {
      backgroundColor: c.yellow,
      borderRadius: 999,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    enableLocationText: {
      color: c.ink,
      fontSize: 12,
      fontWeight: '900',
    },
    destinationInput: {
      alignItems: 'center',
      backgroundColor: c.surfaceMuted,
      borderRadius: radius.xl,
      flexDirection: 'row',
      gap: spacing.md,
      minHeight: 54,
      paddingHorizontal: spacing.lg,
      width: '100%',
    },
    destinationText: {
      color: c.ink,
      fontSize: 18,
      fontWeight: '900',
    },
    recentRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing.md,
      paddingVertical: spacing.md,
    },
    recentCopy: {
      flex: 1,
    },
    recentTitle: {
      color: c.ink,
      fontSize: 15,
      fontWeight: '900',
    },
    recentSubtitle: {
      color: c.muted,
      fontSize: 12,
      fontWeight: '700',
      marginTop: 2,
    },
    categories: {
      flexDirection: 'row',
      gap: spacing.sm,
      width: '100%',
    },
    categoryCard: {
      alignItems: 'center',
      backgroundColor: c.surfaceMuted,
      borderColor: c.border,
      borderRadius: radius.md,
      borderWidth: 1,
      flex: 1,
      gap: spacing.xs,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.xs,
    },
    categoryIcon: {
      alignItems: 'center',
      backgroundColor: c.yellow,
      borderRadius: 16,
      height: 38,
      justifyContent: 'center',
      width: 38,
    },
    categoryText: {
      color: c.ink,
      fontSize: 12,
      fontWeight: '900',
      textAlign: 'center',
    },
  }), [c]);

  return (
    <View style={styles.screen}>
      <CustomerMap region={customerRegion} recenterKey={recenterKey} />
      <SafeAreaView pointerEvents="box-none" style={styles.overlay}>
        <View pointerEvents="box-none" style={styles.topBar}>
          <Pressable onPress={() => setIsDrawerOpen(true)} style={styles.roundButton}>
            <Ionicons name="menu" size={24} color={c.ink} />
          </Pressable>
          <Pressable onPress={() => openPlanRide()} style={styles.searchPill}>
            <Ionicons name="location" size={17} color={c.green} />
            <Text numberOfLines={1} style={styles.searchText}>{currentArea}</Text>
          </Pressable>
          <Pressable onPress={centerOnCustomer} style={styles.roundButton}>
            <Ionicons name="navigate" size={21} color={c.ink} />
          </Pressable>
          <Pressable style={styles.roundButton}>
            <Ionicons name="heart" size={21} color={c.red} />
          </Pressable>
        </View>

        {isLocationDenied ? (
          <View pointerEvents="auto" style={styles.locationNotice}>
            <View style={styles.noticeCopy}>
              <Text style={styles.noticeTitle}>Location permission needed</Text>
              <Text style={styles.noticeSubtitle}>{locationMessage}</Text>
            </View>
            <Pressable onPress={() => void requestAndWatchLocation()} style={styles.enableLocationButton}>
              <Text style={styles.enableLocationText}>Enable location</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.sheet}>
          <Pressable onPress={openDestinationSearch} style={styles.destinationInput}>
            <Ionicons name="search" size={20} color={c.ink} />
            <Text style={styles.destinationText}>Where are you going?</Text>
          </Pressable>

          {recentPlaces.length > 0 ? (
            <Pressable
              onPress={() =>
                openPlanRide({
                  label: recentPlaces[0].title,
                  latitude: 31.7096,
                  longitude: 74.7973,
                })
              }
              style={styles.recentRow}>
              <Ionicons name="time" size={20} color={c.muted} />
              <View style={styles.recentCopy}>
                <Text style={styles.recentTitle}>{recentPlaces[0].title}</Text>
                <Text style={styles.recentSubtitle}>{recentPlaces[0].subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={c.subtle} />
            </Pressable>
          ) : null}

          <View style={styles.categories}>
            {categories.map((category) => (
              <Pressable key={category.label} onPress={() => openPlanRide()} style={styles.categoryCard}>
                <View style={styles.categoryIcon}>
                  <Ionicons name={category.icon} size={21} color={c.ink} />
                </View>
                <Text style={styles.categoryText}>{category.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </SafeAreaView>
      <BottomNav active="home" />
      <SideDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} onOpenSavedPlaces={() => setShowSavedPlaces(true)} />
      <SavedPlacesModal visible={showSavedPlaces} onClose={() => setShowSavedPlaces(false)} />
    </View>
  );
}
