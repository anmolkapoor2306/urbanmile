import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { DriverDrawer, MenuButton } from '@/components/DriverDrawer';
import { colors } from '@/constants/theme';
import type { AuthenticatedDriver, DriverStatus, DriverView, TripStage } from '@/data/mockData';
import { CompletedTripsScreen } from '@/screens/CompletedTripsScreen';
import { EarningsScreen } from '@/screens/EarningsScreen';
import { HomeScreen } from '@/screens/HomeScreen';
import { LoginScreen } from '@/screens/LoginScreen';
import { MenuSectionScreen } from '@/screens/MenuSectionScreen';
import { NewTripRequestScreen } from '@/screens/NewTripRequestScreen';
import { OnTripScreen } from '@/screens/OnTripScreen';
import { ProfileScreen } from '@/screens/ProfileScreen';
import { TripAcceptedScreen } from '@/screens/TripAcceptedScreen';
import { TripCompletedScreen } from '@/screens/TripCompletedScreen';

export function DriverNavigator() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [driver, setDriver] = useState<AuthenticatedDriver | null>(null);
  const [driverStatus, setDriverStatus] = useState<DriverStatus>('offline');
  const [breakElapsedSeconds, setBreakElapsedSeconds] = useState(0);
  const [activeView, setActiveView] = useState<DriverView>('home');
  const [tripStage, setTripStage] = useState<TripStage>('request');
  const [isTripWorkflowOpen, setIsTripWorkflowOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    if (driverStatus !== 'break') return;
    const interval = window.setInterval(() => setBreakElapsedSeconds((current) => current + 1), 1000);
    return () => window.clearInterval(interval);
  }, [driverStatus]);

  if (!isLoggedIn) {
    return (
      <LoginScreen
        onLogin={(authenticatedDriver) => {
          setDriver(authenticatedDriver);
          setDriverStatus('offline');
          setIsLoggedIn(true);
        }}
      />
    );
  }

  function updateDriverStatus(status: DriverStatus) {
    setDriverStatus(status);
    if (status === 'break') {
      setBreakElapsedSeconds(0);
    }
  }

  function navigateTo(view: DriverView) {
    setIsTripWorkflowOpen(false);
    setActiveView(view);
    setIsDrawerOpen(false);
  }

  function logout() {
    setIsDrawerOpen(false);
    setIsTripWorkflowOpen(false);
    setActiveView('home');
    setDriver(null);
    setDriverStatus('offline');
    setIsLoggedIn(false);
  }

  function renderView() {
    if (isTripWorkflowOpen) {
      if (tripStage === 'request') {
        return <NewTripRequestScreen onAcknowledge={() => setTripStage('accepted')} />;
      }
      if (tripStage === 'accepted') {
        return <TripAcceptedScreen hasArrived={false} onArrived={() => setTripStage('arrived')} onStartTrip={() => setTripStage('onTrip')} />;
      }
      if (tripStage === 'arrived') {
        return <TripAcceptedScreen hasArrived onArrived={() => setTripStage('arrived')} onStartTrip={() => setTripStage('onTrip')} />;
      }
      if (tripStage === 'onTrip') {
        return <OnTripScreen onComplete={() => setTripStage('completed')} />;
      }
      return (
        <TripCompletedScreen
          onReset={() => {
            setTripStage('request');
            setIsTripWorkflowOpen(false);
            setActiveView('home');
          }}
        />
      );
    }

    if (activeView === 'home') {
      return (
        <HomeScreen
          driver={driver}
          status={driverStatus}
          breakElapsedSeconds={breakElapsedSeconds}
          onSetStatus={updateDriverStatus}
          onEndBreak={() => updateDriverStatus('online')}
          onOpenMenu={() => setIsDrawerOpen(true)}
        />
      );
    }

    if (activeView === 'trips') {
      return <CompletedTripsScreen />;
    }

    if (activeView === 'earnings') {
      return <EarningsScreen />;
    }

    if (activeView === 'profile') {
      return <ProfileScreen onLogout={logout} />;
    }

    return <MenuSectionScreen section={activeView} />;
  }

  return (
    <View style={styles.shell}>
      <View style={styles.content}>{renderView()}</View>
      {activeView !== 'home' && !isTripWorkflowOpen ? <MenuButton onPress={() => setIsDrawerOpen(true)} variant="floating" /> : null}
      {isTripWorkflowOpen ? <MenuButton onPress={() => setIsDrawerOpen(true)} variant="floating" /> : null}
      <DriverDrawer
        isOpen={isDrawerOpen}
        activeView={activeView}
        onClose={() => setIsDrawerOpen(false)}
        onNavigate={navigateTo}
        onLogout={logout}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    backgroundColor: colors.background,
    flex: 1,
  },
  content: {
    flex: 1,
  },
});
