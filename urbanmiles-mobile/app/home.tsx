import { Link, Redirect } from 'expo-router';
import { StyleSheet, Text, View, Button, Image } from 'react-native';

export default function Home() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.logo} />
        <Text style={styles.title}>UrbanMiles</Text>
        <Text style={styles.subtitle}>Get a ride in minutes</Text>
      </View>

      <View style={styles.content}>
        <Link href="/book" asChild>
          <Button title="Book a Ride" color="#f7931e" />
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    padding: 20,
  },
  header: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#aaaaaa',
  },
  content: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
