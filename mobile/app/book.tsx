import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createQuickBooking } from '@/lib/api';

const destinations = ['Amritsar', 'Chandigarh', 'Delhi Airport'];

export default function BookRide() {
  const router = useRouter();
  const [pickupLocation, setPickupLocation] = useState('Jalandhar');
  const [dropoffLocation, setDropoffLocation] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleBook = async () => {
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Pickup now · Sedan</Text>
          <Text style={styles.title}>Book in seconds</Text>
          <Text style={styles.subtitle}>Enter destination and phone. We will confirm the ride right away.</Text>
        </View>

        <View style={styles.card}>
          <TextInput
            value={pickupLocation}
            onChangeText={(value) => {
              setPickupLocation(value);
              setError('');
            }}
            placeholder="Pickup location"
            placeholderTextColor="#A29A90"
            style={styles.input}
            returnKeyType="next"
          />
          <TextInput
            value={dropoffLocation}
            onChangeText={(value) => {
              setDropoffLocation(value);
              setError('');
            }}
            placeholder="Dropoff location"
            placeholderTextColor="#A29A90"
            style={styles.input}
            returnKeyType="next"
          />

          <View style={styles.chips}>
            {destinations.map((city) => (
              <Pressable
                key={city}
                style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
                onPress={() => {
                  setDropoffLocation(city);
                  setError('');
                }}>
                <Text style={styles.chipText}>{city}</Text>
              </Pressable>
            ))}
          </View>

          <TextInput
            value={phone}
            onChangeText={(value) => {
              setPhone(value);
              setError('');
            }}
            placeholder="Phone number"
            placeholderTextColor="#A29A90"
            keyboardType="phone-pad"
            style={styles.input}
            returnKeyType="done"
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Pressable
            onPress={handleBook}
            disabled={isSubmitting}
            style={({ pressed }) => [
              styles.button,
              pressed && styles.pressed,
              isSubmitting && styles.disabledButton,
            ]}>
            <Text style={styles.buttonText}>{isSubmitting ? 'Booking...' : 'Book Now'}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F3EA',
  },
  screen: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    paddingTop: 14,
    paddingBottom: 24,
  },
  eyebrow: {
    color: '#6B645A',
    fontSize: 13,
    fontWeight: '800',
  },
  title: {
    marginTop: 8,
    color: '#111111',
    fontSize: 36,
    lineHeight: 40,
    fontWeight: '900',
  },
  subtitle: {
    maxWidth: 320,
    marginTop: 10,
    color: '#6B645A',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
  card: {
    borderRadius: 30,
    backgroundColor: '#FFFDF8',
    padding: 18,
    shadowColor: '#251B10',
    shadowOpacity: 0.13,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 18 },
    elevation: 9,
  },
  input: {
    minHeight: 56,
    borderRadius: 22,
    backgroundColor: '#F8F3EA',
    borderWidth: 1,
    borderColor: '#EDE2D4',
    color: '#111111',
    fontSize: 16,
    fontWeight: '700',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: '#FFF7D7',
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#F2E1A3',
  },
  chipText: {
    color: '#5D5142',
    fontSize: 12,
    fontWeight: '800',
  },
  errorText: {
    marginBottom: 10,
    color: '#B42318',
    fontSize: 13,
    fontWeight: '700',
  },
  button: {
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
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  disabledButton: {
    opacity: 0.72,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
});
