import { useRouter } from 'expo-router';
import { StyleSheet, Text, View, Pressable, ScrollView } from 'react-native';

export default function Home() {
  const router = useRouter();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <View style={styles.logoIcon}></View>
          <Text style={styles.title}>UrbanMiles</Text>
        </View>

        <Text style={styles.headline}>Book reliable rides in minutes</Text>
        <Text style={styles.subtitle}>Fast, professional rides with simple booking.</Text>
      </View>

<View style={styles.buttons}>
  <Pressable 
    onPress={() => router.push('/book')}
    style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
  >
    <Text style={styles.buttonText}>Book a Ride</Text>
  </Pressable>
</View>

      <View style={styles.features}>
        <View style={styles.featureCard}>
          <Text style={styles.featureTitle}>24/7 Availability</Text>
          <Text style={styles.featureDescription}>Book rides anytime, day or night</Text>
        </View>

        <View style={styles.featureCard}>
          <Text style={styles.featureTitle}>Professional Drivers</Text>
          <Text style={styles.featureDescription}>Experienced drivers you can trust</Text>
        </View>

        <View style={styles.featureCard}>
          <Text style={styles.featureTitle}>Simple Booking</Text>
          <Text style={styles.featureDescription}>Fast, easy booking process</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  logoIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#f7931e',
    borderRadius: 8,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  headline: {
    fontSize: 24,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#aaaaaa',
    textAlign: 'center',
    marginBottom: 30,
  },
  button: {
    backgroundColor: '#f7931e',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonPressed: {
    opacity: 0.7,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  features: {
    gap: 20,
    paddingHorizontal: 10,
  },
  featureCard: {
    backgroundColor: '#1e1e1e',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  featureDescription: {
    fontSize: 14,
    color: '#aaaaaa',
  },
});