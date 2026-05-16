import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomNav } from '@/src/components/BottomNav';
import { useThemeColors } from '@/src/context/AppContext';
import { radius, spacing } from '@/src/constants/theme';
import { rideHistory } from '@/src/data/mock';

const tabs = ['All', 'Completed', 'Cancelled'] as const;

export function RideHistoryScreen() {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>('All');
  const rides = activeTab === 'All' ? rideHistory : rideHistory.filter((ride) => ride.status === activeTab);
  const c = useThemeColors();

  const styles = useMemo(() => StyleSheet.create({
    safeArea: {
      backgroundColor: c.background,
      flex: 1,
    },
    content: {
      padding: spacing.md,
      paddingBottom: 104,
    },
    title: {
      color: c.ink,
      fontSize: 32,
      fontWeight: '900',
      marginBottom: spacing.md,
    },
    tabs: {
      backgroundColor: c.surfaceMuted,
      borderRadius: radius.md,
      flexDirection: 'row',
      padding: spacing.xs,
    },
    tab: {
      alignItems: 'center',
      borderRadius: radius.sm,
      flex: 1,
      minHeight: 42,
      justifyContent: 'center',
    },
    tabActive: {
      backgroundColor: c.surface,
    },
    tabText: {
      color: c.muted,
      fontSize: 13,
      fontWeight: '900',
    },
    tabTextActive: {
      color: c.ink,
    },
    rideCard: {
      backgroundColor: c.surface,
      borderColor: c.border,
      borderRadius: radius.lg,
      borderWidth: 1,
      marginTop: spacing.md,
      padding: spacing.md,
    },
    rideTop: {
      flexDirection: 'row',
      gap: spacing.md,
      justifyContent: 'space-between',
    },
    rideRoute: {
      color: c.ink,
      flex: 1,
      fontSize: 15,
      fontWeight: '900',
    },
    rideFare: {
      color: c.ink,
      fontSize: 16,
      fontWeight: '900',
    },
    rideBottom: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: spacing.md,
    },
    rideDate: {
      color: c.muted,
      fontSize: 12,
      fontWeight: '700',
    },
    status: {
      color: c.green,
      fontSize: 12,
      fontWeight: '900',
    },
    statusCancelled: {
      color: c.red,
    },
  }), [c]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Ride History</Text>
        <View style={styles.tabs}>
          {tabs.map((tab) => (
            <Pressable key={tab} onPress={() => setActiveTab(tab)} style={[styles.tab, activeTab === tab && styles.tabActive]}>
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
            </Pressable>
          ))}
        </View>
        {rides.map((ride) => (
          <View key={ride.id} style={styles.rideCard}>
            <View style={styles.rideTop}>
              <Text style={styles.rideRoute}>{ride.route}</Text>
              <Text style={styles.rideFare}>{ride.fare}</Text>
            </View>
            <View style={styles.rideBottom}>
              <Text style={styles.rideDate}>{ride.date}</Text>
              <Text style={[styles.status, ride.status === 'Cancelled' && styles.statusCancelled]}>{ride.status}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
      <BottomNav active="bookings" />
    </SafeAreaView>
  );
}
