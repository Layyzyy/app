import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function AddMedication() {
  const { patient } = useAuth();
  const [medicationName, setMedicationName] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState('Once');
  const [time1, setTime1] = useState('08:00');
  const [time2, setTime2] = useState('20:00');
  const [instructions, setInstructions] = useState('');
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [currentStock, setCurrentStock] = useState('30');
  const [withFood, setWithFood] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const frequencies = ['Once', 'Twice', 'Thrice'];

  const handleAdd = async () => {
    if (!medicationName || !dosage) {
      Alert.alert('Error', 'Please fill in medication name and dosage');
      return;
    }

    setLoading(true);
    try {
      const times = [];
      if (frequency === 'Once') times.push(time1);
      if (frequency === 'Twice') times.push(time1, time2);
      if (frequency === 'Thrice') times.push('08:00', '14:00', '20:00');

      const response = await fetch(`${BACKEND_URL}/api/prescriptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: patient?.id,
          medication_name: medicationName,
          dosage,
          frequency,
          schedule: {
            times,
            days: [], // Empty means all days
          },
          instructions,
          start_date: startDate,
          current_stock: parseInt(currentStock) || 0,
          total_per_refill: parseInt(currentStock) || 0,
          with_food: withFood,
        }),
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert('Success', 'Medication added successfully', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        Alert.alert('Error', 'Failed to add medication');
      }
    } catch (error) {
      console.error('Add medication error:', error);
      Alert.alert('Error', 'Failed to add medication. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Add Medication</Text>
        <TouchableOpacity
          onPress={() => router.push('/medication/camera')}
          style={styles.cameraButton}
        >
          <Ionicons name="camera" size={24} color="#0B6EFF" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Medication Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Metformin 500mg"
              placeholderTextColor="#999"
              value={medicationName}
              onChangeText={setMedicationName}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Dosage *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 1 tablet"
              placeholderTextColor="#999"
              value={dosage}
              onChangeText={setDosage}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Frequency</Text>
            <View style={styles.frequencyRow}>
              {frequencies.map((freq) => (
                <TouchableOpacity
                  key={freq}
                  style={[
                    styles.frequencyButton,
                    frequency === freq && styles.frequencyButtonActive,
                  ]}
                  onPress={() => setFrequency(freq)}
                >
                  <Text
                    style={[
                      styles.frequencyText,
                      frequency === freq && styles.frequencyTextActive,
                    ]}
                  >
                    {freq}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {frequency === 'Once' && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Time</Text>
              <TextInput
                style={styles.input}
                placeholder="HH:MM"
                placeholderTextColor="#999"
                value={time1}
                onChangeText={setTime1}
              />
            </View>
          )}

          {frequency === 'Twice' && (
            <View style={styles.timesRow}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Time 1</Text>
                <TextInput
                  style={styles.input}
                  placeholder="HH:MM"
                  placeholderTextColor="#999"
                  value={time1}
                  onChangeText={setTime1}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Time 2</Text>
                <TextInput
                  style={styles.input}
                  placeholder="HH:MM"
                  placeholderTextColor="#999"
                  value={time2}
                  onChangeText={setTime2}
                />
              </View>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Instructions</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="e.g., Take with water after meals"
              placeholderTextColor="#999"
              value={instructions}
              onChangeText={setInstructions}
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Start Date</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#999"
              value={startDate}
              onChangeText={setStartDate}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Current Stock</Text>
            <TextInput
              style={styles.input}
              placeholder="Number of tablets/doses"
              placeholderTextColor="#999"
              value={currentStock}
              onChangeText={setCurrentStock}
              keyboardType="numeric"
            />
          </View>

          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setWithFood(!withFood)}
          >
            <Ionicons
              name={withFood ? 'checkbox' : 'square-outline'}
              size={24}
              color="#0B6EFF"
            />
            <Text style={styles.checkboxLabel}>Take with food</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.addButton, loading && styles.addButtonDisabled]}
            onPress={handleAdd}
            disabled={loading}
          >
            <Text style={styles.addButtonText}>
              {loading ? 'Adding...' : 'Add Medication'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  cameraButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    height: 52,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },
  textArea: {
    height: 100,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  frequencyRow: {
    flexDirection: 'row',
    gap: 8,
  },
  frequencyButton: {
    flex: 1,
    height: 48,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  frequencyButtonActive: {
    borderColor: '#0B6EFF',
    backgroundColor: '#E8F4FF',
  },
  frequencyText: {
    fontSize: 16,
    color: '#666',
  },
  frequencyTextActive: {
    fontWeight: '600',
    color: '#0B6EFF',
  },
  timesRow: {
    flexDirection: 'row',
    gap: 12,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#333',
  },
  addButton: {
    height: 56,
    backgroundColor: '#0B6EFF',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  addButtonDisabled: {
    opacity: 0.6,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
