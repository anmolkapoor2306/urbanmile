import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

export default function Confirmation() {
  const { reference } = useLocalSearchParams();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Booking Confirmed!</Text>
        <Text style={styles.referenceText}>Reference: {reference}</Text>
      </View>

      <Text style={styles.message}>{"Your ride has been booked successfully. We'll send you a confirmation email."}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    padding: 20,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 10,
  },
  referenceText: {
    fontSize: 18,
    color: '#f7931e',
  },
  message: {
    fontSize: 16,
    color: '#aaaaaa',
    textAlign: 'center',
  },
});
