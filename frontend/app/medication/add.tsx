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
import { useTheme } from '../contexts/ThemeContext';
import * as Notifications from 'expo-notifications';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function AddMedication() {
  const { patient } = useAuth();
  const { colors } = useTheme();
  const [medicationName, setMedicationName] = useState('');
  const [dosage, setDosage] = useState('');
  const [description, setDescription] = useState('');
  const [frequency, setFrequency] = useState('Once');
  const [time1, setTime1] = useState('08:00');
  const [time2, setTime2] = useState('14:00');
  const [time3, setTime3] = useState('20:00');
  const [instructions, setInstructions] = useState('');
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [expiryDate, setExpiryDate] = useState('');
  const [currentStock, setCurrentStock] = useState('5');
  const [withFood, setWithFood] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const frequencies = ['Once', 'Twice', 'Thrice'];

  const scheduleNotifications = async (times: string[], prescriptionId: string, medName: string) => {
    try {
      const existingNotifications = await Notifications.getAllScheduledNotificationsAsync();
      const filtered = existingNotifications.filter((notif) =>
        notif.content.data?.prescriptionId === prescriptionId
      );
      for (const notif of filtered) {
        await Notifications.cancelScheduledNotificationAsync(notif.identifier);
      }

      for (const time of times) {
        const [hours, minutes] = time.split(':').map(Number);
        
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Medicine Reminder',
            body: `Time to take ${medName}`,
            data: { prescriptionId, medicationName: medName },
            sound: true,
          },
          trigger: {
            hour: hours,
            minute: minutes,
            repeats: true,
          },
        });
      }
    } catch (error) {
      console.error('Schedule notifications error:', error);
    }
  };

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
      if (frequency === 'Thrice') times.push(time1, time2, time3);

      const response = await fetch(`${BACKEND_URL}/api/prescriptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: patient?.id,
          medication_name: medicationName,
          dosage,
          description,
          frequency,
          schedule: {
            times,
            days: [],
          },
          instructions,
          start_date: startDate,
          expiry_date: expiryDate || null,
          current_stock: parseInt(currentStock) || 5,
          total_per_refill: parseInt(currentStock) || 5,
          with_food: withFood,
        }),
      });

      const data = await response.json();

      if (data.success) {
        await scheduleNotifications(times, data.prescription.id, medicationName);
        
        Alert.alert('Success', 'Medication added successfully with reminders set!', [
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

  const styles = createStyles(colors);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Add Medication</Text>
        <TouchableOpacity
          onPress={() => router.push('/medication/camera')}
          style={styles.cameraButton}
        >
          <Ionicons name="camera" size={24} color={colors.primary} />
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
              placeholderTextColor={colors.textSecondary}
              value={medicationName}
              onChangeText={setMedicationName}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Dosage *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 1 tablet"
              placeholderTextColor={colors.textSecondary}
              value={dosage}
              onChangeText={setDosage}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="What is this medicine for?"
              placeholderTextColor={colors.textSecondary}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={2}
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
                placeholder="HH:MM (e.g., 08:00)"
                placeholderTextColor={colors.textSecondary}
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
                  placeholder="08:00"
                  placeholderTextColor={colors.textSecondary}
                  value={time1}
                  onChangeText={setTime1}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Time 2</Text>
                <TextInput
                  style={styles.input}
                  placeholder="20:00"
                  placeholderTextColor={colors.textSecondary}
                  value={time2}
                  onChangeText={setTime2}
                />
              </View>
            </View>
          )}

          {frequency === 'Thrice' && (
            <View style={styles.timesColumn}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Time 1 (Morning)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="08:00"
                  placeholderTextColor={colors.textSecondary}
                  value={time1}
                  onChangeText={setTime1}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Time 2 (Afternoon)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="14:00"
                  placeholderTextColor={colors.textSecondary}
                  value={time2}
                  onChangeText={setTime2}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Time 3 (Night)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="20:00"
                  placeholderTextColor={colors.textSecondary}
                  value={time3}
                  onChangeText={setTime3}
                />
              </View>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Instructions</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="e.g., Take with water after meals"
              placeholderTextColor={colors.textSecondary}
              value={instructions}
              onChangeText={setInstructions}
              multiline
              numberOfLines={2}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Start Date</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textSecondary}
              value={startDate}
              onChangeText={setStartDate}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Expiry Date (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textSecondary}
              value={expiryDate}
              onChangeText={setExpiryDate}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Current Stock (Default: 5)</Text>
            <TextInput
              style={styles.input}
              placeholder="Number of tablets/doses"
              placeholderTextColor={colors.textSecondary}
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
              color={colors.primary}
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

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 20,
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
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
      color: colors.text,
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
      color: colors.text,
      marginBottom: 8,
    },
    input: {
      height: 52,
      borderWidth: 2,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 16,
      fontSize: 16,
      backgroundColor: colors.card,
      color: colors.text,
    },
    textArea: {
      height: 80,
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
      borderColor: colors.border,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.card,
    },
    frequencyButtonActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primary + '20',
    },
    frequencyText: {
      fontSize: 16,
      color: colors.textSecondary,
    },
    frequencyTextActive: {
      fontWeight: '600',
      color: colors.primary,
    },
    timesRow: {
      flexDirection: 'row',
      gap: 12,
    },
    timesColumn: {
      gap: 0,
    },
    checkboxRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 24,
    },
    checkboxLabel: {
      fontSize: 16,
      color: colors.text,
    },
    addButton: {
      height: 56,
      backgroundColor: colors.primary,
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
