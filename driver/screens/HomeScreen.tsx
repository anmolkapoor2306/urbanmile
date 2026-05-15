import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MenuButton } from '@/components/DriverDrawer';
import { DriverMap, type DriverRegion } from '@/components/DriverMap';
import { PrimaryButton } from '@/components/PrimaryButton';
import { colors, radius, shadow, spacing } from '@/constants/theme';
import { earningsSummary, type AuthenticatedDriver, type DriverStatus } from '@/data/mockData';

type ConfirmationAction = 'online' | 'endShift' | 'break';

const defaultDriverRegion: DriverRegion = {
  latitude: 31.326,
  longitude: 75.5762,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

export function HomeScreen({
  driver,
  status,
  breakElapsedSeconds,
  onSetStatus,
  onEndBreak,
  onOpenMenu,
}: {
  driver: AuthenticatedDriver | null;
  status: DriverStatus;
  breakElapsedSeconds: number;
  onSetStatus: (status: DriverStatus) => void;
  onEndBreak: () => void;
  onOpenMenu: () => void;
}) {
  const copy = getStatusCopy(status);
  const [isBreakTimerVisible, setIsBreakTimerVisible] = useState(false);
  const [confirmationAction, setConfirmationAction] = useState<ConfirmationAction | null>(null);
  const [driverRegion, setDriverRegion] = useState(defaultDriverRegion);
  const [locationLabel, setLocationLabel] = useState('Locating driver...');
  const [isLocationDenied, setIsLocationDenied] = useState(false);
  const [recenterKey, setRecenterKey] = useState(0);
  const hasCenteredOnGpsRef = useRef(false);
  const locationSubscriptionRef = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    if (status === 'break') {
      setIsBreakTimerVisible(true);
    }
  }, [status]);

  useEffect(() => {
    let isMounted = true;

    async function startLocation() {
      await requestAndWatchLocation(() => isMounted);
    }

    void startLocation();

    return () => {
      isMounted = false;
      locationSubscriptionRef.current?.remove();
      locationSubscriptionRef.current = null;
    };
  }, []);

  async function requestAndWatchLocation(isMounted: () => boolean = () => true) {
    setLocationLabel('Locating driver...');
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!isMounted()) return null;

    if (permission.status !== 'granted') {
      setIsLocationDenied(true);
      setLocationLabel('Location permission needed');
      return null;
    }

    setIsLocationDenied(false);

    try {
      const currentLocation = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      if (!isMounted()) return null;
      updateDriverLocation(currentLocation);
    } catch {
      setLocationLabel('Waiting for GPS location...');
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
        updateDriverLocation(location);
      }
    );
    return locationSubscriptionRef.current;
  }

  function updateDriverLocation(location: Location.LocationObject) {
    const nextRegion = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      latitudeDelta: 0.045,
      longitudeDelta: 0.045,
    };
    setDriverRegion(nextRegion);
    setLocationLabel('Live location active');
    if (!hasCenteredOnGpsRef.current) {
      hasCenteredOnGpsRef.current = true;
      setRecenterKey((current) => current + 1);
    }
  }

  function toggleOnlineStatus() {
    if (status === 'online') {
      setConfirmationAction('endShift');
      return;
    }

    setConfirmationAction('online');
  }

  function confirmAction() {
    if (confirmationAction === 'online') {
      setIsBreakTimerVisible(false);
      if (status === 'break') {
        onEndBreak();
      } else {
        onSetStatus('online');
      }
    }

    if (confirmationAction === 'endShift') {
      onSetStatus('offline');
    }

    if (confirmationAction === 'break') {
      setIsBreakTimerVisible(true);
      onSetStatus('break');
    }

    setConfirmationAction(null);
  }

  function endBreak() {
    setIsBreakTimerVisible(false);
    onEndBreak();
  }

  function centerOnDriver() {
    setRecenterKey((current) => current + 1);
  }

  const confirmationCopy = confirmationAction ? getConfirmationCopy(confirmationAction) : null;

  return (
    <View style={styles.container}>
      <DriverMap region={driverRegion} recenterKey={recenterKey} />
      <SafeAreaView pointerEvents="box-none" style={styles.overlay}>
        <View pointerEvents="box-none" style={styles.topControls}>
          <MenuButton onPress={onOpenMenu} />
          <View style={styles.earningsPill}>
            <Text style={styles.earningsValue}>{earningsSummary.today}</Text>
            <Text style={styles.earningsLabel}>today</Text>
          </View>
          <Pressable onPress={centerOnDriver} style={({ pressed }) => [styles.repositionButton, pressed && styles.pressed]}>
            <Ionicons name="navigate" size={22} color={colors.text} />
          </Pressable>
        </View>

        <View pointerEvents="auto" style={styles.statusPanel}>
          <View style={styles.statusHeader}>
            <View>
              {driver ? (
                <View style={styles.driverIdentity}>
                  <Text style={styles.driverName}>{driver.fullName}</Text>
                  {driver.driverCode ? <Text style={styles.driverCode}>{driver.driverCode}</Text> : null}
                </View>
              ) : null}
              <Text style={styles.statusTitle}>{copy.title}</Text>
              <Text style={styles.statusSubtitle}>{copy.subtitle}</Text>
              <Text style={styles.locationText}>{locationLabel}</Text>
              {isLocationDenied ? (
                <Pressable onPress={() => void requestAndWatchLocation()} style={styles.enableLocationButton}>
                  <Text style={styles.enableLocationText}>Enable location</Text>
                </Pressable>
              ) : null}
            </View>
            <View style={[styles.statusLight, status === 'online' && styles.onlineLight, status === 'break' && styles.breakLight]} />
          </View>

          <View style={styles.actionRow}>
            <PrimaryButton
              onPress={toggleOnlineStatus}
              variant={status === 'online' ? 'danger' : 'primary'}
              style={styles.onlineToggleButton}
            >
              {status === 'online' ? 'End Shift' : 'Go Online'}
            </PrimaryButton>
            <Pressable
              onPress={() => {
                if (status === 'break') {
                  setIsBreakTimerVisible(true);
                } else {
                  setConfirmationAction('break');
                }
              }}
              style={({ pressed }) => [styles.breakButton, status === 'break' && styles.breakButtonActive, pressed && styles.pressed]}
            >
              <Ionicons name="time" size={18} color={status === 'break' ? colors.background : colors.yellow} />
              <Text style={[styles.breakButtonText, status === 'break' && styles.breakButtonTextActive]}>
                {status === 'break' ? formatBreakTime(breakElapsedSeconds) : 'Break'}
              </Text>
            </Pressable>
          </View>
        </View>

        {confirmationCopy ? (
          <View style={styles.modalOverlay}>
            <Pressable style={styles.modalBackdrop} onPress={() => setConfirmationAction(null)} />
            <View style={styles.modalCard}>
              <View style={styles.modalIcon}>
                <Ionicons name={confirmationCopy.icon} size={26} color={colors.background} />
              </View>
              <Text style={styles.modalTitle}>{confirmationCopy.title}</Text>
              <Text style={styles.modalText}>{confirmationCopy.message}</Text>
              <View style={styles.modalActions}>
                <PrimaryButton onPress={() => setConfirmationAction(null)} variant="secondary" style={styles.modalButton}>
                  Cancel
                </PrimaryButton>
                <PrimaryButton onPress={confirmAction} variant={confirmationAction === 'endShift' ? 'danger' : 'primary'} style={styles.modalButton}>
                  {confirmationCopy.confirmLabel}
                </PrimaryButton>
              </View>
            </View>
          </View>
        ) : null}

        {isBreakTimerVisible && status === 'break' ? (
          <View style={styles.modalOverlay}>
            <Pressable style={styles.modalBackdrop} onPress={() => setIsBreakTimerVisible(false)} />
            <View style={styles.modalCard}>
              <View style={styles.modalIcon}>
                <Ionicons name="pause" size={26} color={colors.background} />
              </View>
              <Text style={styles.modalTitle}>You are on break</Text>
              <Text style={styles.breakModalTimer}>{formatBreakTime(breakElapsedSeconds)}</Text>
              <Text style={styles.modalText}>Trips are paused until break ends.</Text>
              <PrimaryButton onPress={endBreak} style={styles.fullModalButton}>
                End Break
              </PrimaryButton>
            </View>
          </View>
        ) : null}
      </SafeAreaView>
    </View>
  );
}

function getStatusCopy(status: DriverStatus) {
  if (status === 'offline') {
    return {
      title: 'You are offline',
      subtitle: 'Go online to receive assigned trips.',
    };
  }
  if (status === 'break') {
    return {
      title: 'You are on break',
      subtitle: 'Trips are paused until break ends.',
    };
  }
  return {
    title: 'You are online',
    subtitle: 'Waiting for assigned trips.',
  };
}

function getConfirmationCopy(action: ConfirmationAction): {
  title: string;
  message: string;
  confirmLabel: string;
  icon: keyof typeof Ionicons.glyphMap;
} {
  if (action === 'endShift') {
    return {
      title: 'End shift?',
      message: 'Are you sure that you want to end the shift? You will stop receiving assigned trips.',
      confirmLabel: 'End Shift',
      icon: 'power',
    };
  }

  if (action === 'online') {
    return {
      title: 'Go online?',
      message: 'Are you sure that you want to go online and start receiving assigned trips?',
      confirmLabel: 'Go Online',
      icon: 'radio',
    };
  }

  return {
    title: 'Start break?',
    message: 'Are you sure that you want to start the break? Trips will be paused until you end it.',
    confirmLabel: 'Start Break',
    icon: 'time',
  };
}

function formatBreakTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },
  map: {
    backgroundColor: '#050506',
    bottom: 0,
    left: 0,
    overflow: 'hidden',
    position: 'absolute',
    right: 0,
    top: 0,
  },
  road: {
    backgroundColor: '#26262a',
    borderRadius: 999,
    height: 38,
    opacity: 0.95,
    position: 'absolute',
  },
  roadOne: {
    left: -40,
    right: -40,
    top: 230,
    transform: [{ rotate: '-23deg' }],
  },
  roadTwo: {
    left: -80,
    right: 80,
    top: 420,
    transform: [{ rotate: '28deg' }],
  },
  roadThree: {
    bottom: 260,
    left: 170,
    right: -120,
    transform: [{ rotate: '88deg' }],
  },
  routeGlow: {
    backgroundColor: colors.yellow,
    borderRadius: 999,
    height: 7,
    left: 60,
    opacity: 0.78,
    position: 'absolute',
    right: 70,
    top: 320,
    transform: [{ rotate: '-23deg' }],
  },
  mapPin: {
    borderColor: '#fff',
    borderRadius: 999,
    borderWidth: 3,
    height: 18,
    position: 'absolute',
    width: 18,
  },
  mapPinOne: {
    backgroundColor: colors.green,
    left: 82,
    top: 345,
  },
  mapPinTwo: {
    backgroundColor: colors.yellow,
    right: 86,
    top: 273,
  },
  vehicleMarker: {
    alignItems: 'center',
    backgroundColor: colors.yellow,
    borderColor: '#fff',
    borderRadius: 999,
    borderWidth: 3,
    height: 54,
    justifyContent: 'center',
    width: 54,
    ...shadow,
  },
  mapLabel: {
    bottom: 248,
    color: colors.subtle,
    fontSize: 12,
    fontWeight: '900',
    left: spacing.md,
    letterSpacing: 1,
    position: 'absolute',
    textTransform: 'uppercase',
  },
  overlay: {
    flex: 1,
  },
  topControls: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  earningsPill: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...shadow,
  },
  earningsValue: {
    color: colors.yellow,
    fontSize: 16,
    fontWeight: '900',
  },
  earningsLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  repositionButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 15,
    borderWidth: 1,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  tripCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    bottom: 236,
    left: spacing.md,
    padding: spacing.md,
    position: 'absolute',
    right: spacing.md,
    ...shadow,
  },
  tripHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  tripTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
  },
  tripMeta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2,
  },
  tripFare: {
    color: colors.yellow,
    fontSize: 18,
    fontWeight: '900',
  },
  routeLine: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  routeDot: {
    borderRadius: 999,
    height: 10,
    marginTop: 5,
    width: 10,
  },
  pickupDot: {
    backgroundColor: colors.green,
  },
  dropoffDot: {
    backgroundColor: colors.yellow,
  },
  routeCopy: {
    flex: 1,
  },
  routeLabel: {
    color: colors.subtle,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  routeValue: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
    marginTop: 2,
  },
  tripButton: {
    marginTop: spacing.md,
    minHeight: 44,
  },
  statusPanel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 28,
    borderWidth: 1,
    bottom: spacing.md,
    left: spacing.md,
    padding: spacing.md,
    position: 'absolute',
    right: spacing.md,
    ...shadow,
  },
  statusHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statusTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
  },
  driverIdentity: {
    marginBottom: spacing.sm,
  },
  driverName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900',
  },
  driverCode: {
    color: colors.yellow,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
    marginTop: 2,
  },
  statusSubtitle: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 4,
  },
  locationText: {
    color: colors.subtle,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 6,
  },
  enableLocationButton: {
    alignSelf: 'flex-start',
    backgroundColor: colors.yellow,
    borderRadius: radius.sm,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  enableLocationText: {
    color: colors.background,
    fontSize: 12,
    fontWeight: '900',
  },
  statusLight: {
    backgroundColor: colors.subtle,
    borderRadius: 999,
    height: 14,
    width: 14,
  },
  onlineLight: {
    backgroundColor: colors.green,
  },
  breakLight: {
    backgroundColor: colors.yellow,
  },
  actionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  onlineToggleButton: {
    flex: 1,
  },
  breakButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.yellowDark,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: spacing.md,
  },
  breakButtonActive: {
    backgroundColor: colors.yellow,
    borderColor: colors.yellow,
  },
  breakButtonText: {
    color: colors.yellow,
    fontSize: 14,
    fontWeight: '900',
  },
  breakButtonTextActive: {
    color: colors.background,
  },
  modalOverlay: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    padding: spacing.md,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 60,
  },
  modalBackdrop: {
    backgroundColor: 'rgba(0,0,0,0.68)',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  modalCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    maxWidth: 360,
    padding: spacing.lg,
    width: '100%',
    ...shadow,
  },
  modalIcon: {
    alignItems: 'center',
    backgroundColor: colors.yellow,
    borderRadius: 999,
    height: 56,
    justifyContent: 'center',
    marginBottom: spacing.md,
    width: 56,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
  },
  modalText: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 21,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
    width: '100%',
  },
  modalButton: {
    flex: 1,
  },
  fullModalButton: {
    marginTop: spacing.lg,
    width: '100%',
  },
  breakModalTimer: {
    color: colors.yellow,
    fontSize: 42,
    fontWeight: '900',
    marginTop: spacing.sm,
  },
  pressed: {
    opacity: 0.82,
  },
});
