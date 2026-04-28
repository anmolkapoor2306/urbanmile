import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View, TextInput, ScrollView, Pressable } from 'react-native';

export default function BookRide() {
  const router = useRouter();
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    pickupDate: '',
    pickupTime: '',
    pickupLocation: '',
    dropLocation: '',
    vehicleType: 'Economy',
    specialInstructions: '',
  });

  const handleSubmit = () => {
    router.push('/confirmation');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>Book Your Ride</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Full Name</Text>
        <TextInput style={styles.input} value={form.fullName} onChangeText={(text) => setForm({ ...form, fullName: text })} placeholder="John Doe" placeholderTextColor="#aaaaaa" />

        <Text style={styles.label}>Email</Text>
        <TextInput style={styles.input} value={form.email} onChangeText={(text) => setForm({ ...form, email: text })} placeholder="email@example.com" placeholderTextColor="#aaaaaa" keyboardType="email-address" />

        <Text style={styles.label}>Phone</Text>
        <TextInput style={styles.input} value={form.phone} onChangeText={(text) => setForm({ ...form, phone: text })} placeholder="(123) 456-7890" placeholderTextColor="#aaaaaa" keyboardType="phone-pad" />

        <Text style={styles.label}>Pickup Date</Text>
        <TextInput style={styles.input} value={form.pickupDate} onChangeText={(text) => setForm({ ...form, pickupDate: text })} placeholder="YYYY-MM-DD" placeholderTextColor="#aaaaaa" />

        <Text style={styles.label}>Pickup Time</Text>
        <TextInput style={styles.input} value={form.pickupTime} onChangeText={(text) => setForm({ ...form, pickupTime: text })} placeholder="HH:MM AM/PM" placeholderTextColor="#aaaaaa" />

        <Text style={styles.label}>Pickup Location</Text>
        <TextInput style={styles.input} value={form.pickupLocation} onChangeText={(text) => setForm({ ...form, pickupLocation: text })} placeholder="Street address or landmark" placeholderTextColor="#aaaaaa" />

        <Text style={styles.label}>Drop Location</Text>
        <TextInput style={styles.input} value={form.dropLocation} onChangeText={(text) => setForm({ ...form, dropLocation: text })} placeholder="Destination address" placeholderTextColor="#aaaaaa" />

        <Text style={styles.label}>Vehicle Type</Text>
        <TextInput style={styles.input} value={form.vehicleType} onChangeText={(text) => setForm({ ...form, vehicleType: text })} placeholder="Economy/SUV/Luxury" placeholderTextColor="#aaaaaa" />

        <Text style={styles.label}>Special Instructions</Text>
        <TextInput style={[styles.input, styles.textArea]} value={form.specialInstructions} onChangeText={(text) => setForm({ ...form, specialInstructions: text })} placeholder="Accessibility needs, luggage, etc." placeholderTextColor="#aaaaaa" multiline />

        <Pressable onPress={handleSubmit} style={styles.button}>
          <Text style={styles.buttonText}>Book Now</Text>
        </Pressable>
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
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  form: {
    gap: 15,
  },
  label: {
    fontSize: 16,
    color: '#ffffff',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#333333',
    color: '#ffffff',
    padding: 16,
    borderRadius: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#444444',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: '#f7931e',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
});