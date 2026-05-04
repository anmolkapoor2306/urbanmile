import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { createQuickBooking } from '@/lib/api';

const PHONE_HREF = 'tel:+918146606635';
const heroCarImage = require('@/assets/images/urbanmiles-hero-car.png');
const quickDestinations = ['Amritsar', 'Chandigarh', 'Delhi Airport'];

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <Header />
        <Hero />
        <BookingCard />
      </ScrollView>
      <BottomNav />
    </SafeAreaView>
  );
}

function Header() {
  return (
    <View style={styles.header}>
      <View style={styles.brand}>
        <View style={styles.logoMark}>
          <Ionicons name="navigate" size={17} color="#111111" />
        </View>
        <Text style={styles.brandText}>UrbanMiles</Text>
      </View>

      <View style={styles.headerActions}>
        <Pressable style={styles.iconButton} accessibilityRole="button" accessibilityLabel="Toggle theme">
          <Ionicons name="moon-outline" size={18} color="#111111" />
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.callButton, pressed && styles.pressed]}
          onPress={() => Linking.openURL(PHONE_HREF)}
          accessibilityRole="button">
          <Text style={styles.callButtonText}>Call Now</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Hero() {
  return (
    <View style={styles.hero}>
      <View style={styles.statusBadge}>
        <View style={styles.statusDot} />
        <Text style={styles.statusText}>Available 24/7</Text>
      </View>

      <View style={styles.heroCopy}>
        <Text style={styles.heroTitle}>Your Ride. Our Responsibility.</Text>
        <Text style={styles.heroSubtitle}>
          Clean cars, clear pricing, and quick support for city, airport, and outstation rides.
        </Text>
      </View>

      <View style={styles.heroImageFrame}>
        <Image source={heroCarImage} style={styles.heroImage} resizeMode="cover" />
      </View>
    </View>
  );
}

function BookingCard() {
  const router = useRouter();
  const [pickupLocation, setPickupLocation] = useState('Jalandhar');
  const [dropoffLocation, setDropoffLocation] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState('');

  const handleQuickBook = async () => {
    if (isSubmitting) {
      return;
    }

    const phoneDigits = phone.replace(/\D/g, '');

    if (!pickupLocation.trim()) {
      setError('Enter pickup location');
      return;
    }

    if (!dropoffLocation.trim()) {
      setError('Enter dropoff location');
      return;
    }

    if (phoneDigits.length < 10) {
      setError('Enter a valid phone number');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const result = await createQuickBooking({
        pickupLocation: pickupLocation.trim(),
        dropoffLocation: dropoffLocation.trim(),
        phone: phoneDigits,
      });

      if (!result.success || !result.data?.bookingReference) {
        throw new Error(result.error || 'Could not create booking');
      }

      router.push({
        pathname: '/confirmation',
        params: { reference: result.data.bookingReference },
      });
    } catch {
      setError('Could not book right now. Call support or try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUseCurrentLocation = async () => {
    if (isLocating) {
      return;
    }

    setIsLocating(true);
    setError('');

    try {
      const permission = await Location.requestForegroundPermissionsAsync();

      if (permission.status !== 'granted') {
        setError('Location permission was denied');
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const latitude = position.coords.latitude.toFixed(5);
      const longitude = position.coords.longitude.toFixed(5);

      setPickupLocation(`Current Location (${latitude}, ${longitude})`);
    } catch {
      setError('Could not get current location');
    } finally {
      setIsLocating(false);
    }
  };

  return (
    <View style={styles.bookingCard}>
      <View style={styles.quickHeader}>
        <Text style={styles.quickTitle}>Quick booking</Text>
        <Text style={styles.quickMeta}>Pickup now · Sedan</Text>
      </View>

      <View style={styles.segmentedControl}>
        <Pressable style={[styles.segment, styles.segmentActive]}>
          <Text style={[styles.segmentText, styles.segmentTextActive]}>One Way</Text>
        </Pressable>
        <Pressable style={styles.segment}>
          <Text style={styles.segmentText}>Round Trip</Text>
        </Pressable>
      </View>

      <Pressable style={styles.selectorRow}>
        <View style={styles.selectorIcon}>
          <Ionicons name="time-outline" size={18} color="#111111" />
        </View>
        <Text style={styles.selectorText}>Pickup now</Text>
        <Ionicons name="chevron-down" size={18} color="#6F6A60" />
      </Pressable>

      <View style={styles.locationGroup}>
        <LocationInput
          iconColor="#111111"
          value={pickupLocation}
          onChangeText={(value) => {
            setPickupLocation(value);
            setError('');
          }}
          returnKeyType="next"
        />
        <View style={styles.locationConnector} />
        <LocationInput
          iconColor="#F0B429"
          placeholder="Dropoff location"
          value={dropoffLocation}
          onChangeText={(value) => {
            setDropoffLocation(value);
            setError('');
          }}
          returnKeyType="next"
        />
      </View>

      <View style={styles.destinationChips}>
        {quickDestinations.map((city) => (
          <Pressable
            key={city}
            style={({ pressed }) => [styles.destinationChip, pressed && styles.pressed]}
            onPress={() => {
              setDropoffLocation(city);
              setError('');
            }}>
            <Text style={styles.destinationChipText}>{city}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.phoneInputWrap}>
        <Ionicons name="call-outline" size={17} color="#6B645A" />
        <TextInput
          value={phone}
          onChangeText={(value) => {
            setPhone(value);
            setError('');
          }}
          placeholder="Phone number"
          placeholderTextColor="#A29A90"
          keyboardType="phone-pad"
          returnKeyType="done"
          style={styles.phoneInput}
        />
      </View>

      <Pressable
        style={styles.currentLocationButton}
        onPress={handleUseCurrentLocation}
        disabled={isLocating}>
        <Ionicons name="locate-outline" size={15} color="#6B645A" />
        <Text style={styles.currentLocationText}>
          {isLocating ? 'Getting current location...' : 'Use current location'}
        </Text>
      </Pressable>

      {error ? <Text style={styles.inlineError}>{error}</Text> : null}

      <Pressable
        onPress={handleQuickBook}
        disabled={isSubmitting}
        style={({ pressed }) => [
          styles.primaryButton,
          pressed && styles.pressed,
          isSubmitting && styles.disabledButton,
        ]}>
        <Text style={styles.primaryButtonText}>{isSubmitting ? 'Booking...' : 'Book Now'}</Text>
      </Pressable>
    </View>
  );
}

function LocationInput({
  iconColor,
  placeholder,
  value,
  onChangeText,
  returnKeyType,
}: {
  iconColor: string;
  placeholder?: string;
  value?: string;
  onChangeText?: (value: string) => void;
  returnKeyType?: 'done' | 'go' | 'next' | 'search' | 'send';
}) {
  return (
    <View style={styles.locationInput}>
      <View style={[styles.locationDot, { backgroundColor: iconColor }]} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#A29A90"
        returnKeyType={returnKeyType}
        style={styles.locationTextInput}
      />
    </View>
  );
}

function BottomNav() {
  const tabs = [
    { label: 'Home', icon: 'home' },
    { label: 'My Rides', icon: 'receipt-outline' },
    { label: 'Wallet', icon: 'wallet-outline' },
    { label: 'Profile', icon: 'person-outline' },
  ] as const;

  return (
    <View style={styles.bottomNavShell}>
      <View style={styles.bottomNav}>
        {tabs.map((tab, index) => {
          const isActive = index === 0;

          return (
            <Pressable key={tab.label} style={styles.navItem}>
              <View style={[styles.navIconWrap, isActive && styles.navIconWrapActive]}>
                <Ionicons name={tab.icon} size={20} color={isActive ? '#111111' : '#8E877E'} />
              </View>
              <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F3EA',
  },
  screen: {
    flex: 1,
    backgroundColor: '#F8F3EA',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 122,
  },
  header: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
  },
  brand: {
    minWidth: 0,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoMark: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#F2C94C',
    shadowColor: '#B88B12',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 7 },
    elevation: 4,
  },
  brandText: {
    color: '#111111',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: '#FFFDF8',
    borderWidth: 1,
    borderColor: '#E9DFD0',
  },
  callButton: {
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: '#111111',
    paddingHorizontal: 16,
  },
  callButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  hero: {
    paddingTop: 18,
    paddingBottom: 42,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    backgroundColor: '#FFF7D7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#F2E1A3',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F2C94C',
  },
  statusText: {
    color: '#4F473C',
    fontSize: 12,
    fontWeight: '800',
  },
  heroCopy: {
    paddingTop: 24,
  },
  heroTitle: {
    color: '#111111',
    fontSize: 42,
    lineHeight: 46,
    fontWeight: '900',
    letterSpacing: 0,
  },
  heroSubtitle: {
    maxWidth: 316,
    paddingTop: 14,
    color: '#6B645A',
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '500',
  },
  heroImageFrame: {
    width: '100%',
    height: 260,
    marginTop: 24,
    overflow: 'hidden',
    borderRadius: 30,
    backgroundColor: '#EFE5D8',
    shadowColor: '#251B10',
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 16 },
    elevation: 7,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  bookingCard: {
    marginTop: -22,
    borderRadius: 30,
    backgroundColor: '#FFFDF8',
    padding: 18,
    shadowColor: '#251B10',
    shadowOpacity: 0.13,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 18 },
    elevation: 9,
  },
  quickHeader: {
    marginBottom: 14,
  },
  quickTitle: {
    color: '#111111',
    fontSize: 21,
    fontWeight: '900',
  },
  quickMeta: {
    marginTop: 4,
    color: '#766E63',
    fontSize: 13,
    fontWeight: '700',
  },
  segmentedControl: {
    flexDirection: 'row',
    gap: 6,
    borderRadius: 24,
    backgroundColor: '#F1E8DC',
    padding: 5,
  },
  segment: {
    minHeight: 42,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  segmentActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#36291B',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  segmentText: {
    color: '#766E63',
    fontSize: 14,
    fontWeight: '800',
  },
  segmentTextActive: {
    color: '#111111',
  },
  selectorRow: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 14,
    borderRadius: 22,
    backgroundColor: '#F8F3EA',
    paddingHorizontal: 14,
  },
  selectorIcon: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
  },
  selectorText: {
    flex: 1,
    color: '#171513',
    fontSize: 15,
    fontWeight: '800',
  },
  locationGroup: {
    marginTop: 14,
    gap: 10,
  },
  locationInput: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 22,
    backgroundColor: '#F8F3EA',
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#EDE2D4',
  },
  locationDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  locationConnector: {
    position: 'absolute',
    left: 21,
    top: 50,
    width: 1,
    height: 24,
    backgroundColor: '#D9CEC0',
  },
  locationTextInput: {
    flex: 1,
    minHeight: 44,
    color: '#111111',
    fontSize: 16,
    fontWeight: '700',
    paddingVertical: 0,
  },
  destinationChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  destinationChip: {
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: '#FFF7D7',
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#F2E1A3',
  },
  destinationChipText: {
    color: '#5D5142',
    fontSize: 12,
    fontWeight: '800',
  },
  phoneInputWrap: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
    borderRadius: 22,
    backgroundColor: '#F8F3EA',
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#EDE2D4',
  },
  phoneInput: {
    flex: 1,
    minHeight: 44,
    color: '#111111',
    fontSize: 16,
    fontWeight: '700',
    paddingVertical: 0,
  },
  currentLocationButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 14,
    paddingHorizontal: 3,
  },
  currentLocationText: {
    color: '#6B645A',
    fontSize: 13,
    fontWeight: '800',
  },
  inlineError: {
    marginBottom: 10,
    color: '#B42318',
    fontSize: 13,
    fontWeight: '700',
  },
  primaryButton: {
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 28,
    backgroundColor: '#111111',
    shadowColor: '#111111',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  disabledButton: {
    opacity: 0.72,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  bottomNavShell: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 18,
    paddingBottom: 16,
  },
  bottomNav: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 30,
    backgroundColor: '#FFFDF8',
    paddingHorizontal: 10,
    shadowColor: '#251B10',
    shadowOpacity: 0.12,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  navItem: {
    minWidth: 64,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  navIconWrap: {
    width: 34,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  navIconWrapActive: {
    backgroundColor: '#F2C94C',
  },
  navLabel: {
    color: '#8E877E',
    fontSize: 11,
    fontWeight: '800',
  },
  navLabelActive: {
    color: '#111111',
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
});
