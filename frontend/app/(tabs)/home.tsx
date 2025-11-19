import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function Home() {
  const { patient } = useAuth();
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [adherenceStats, setAdherenceStats] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const loadData = useCallback(async () => {
    if (!patient?.id) return;

    try {
      // Load prescriptions
      const presResponse = await fetch(
        `${BACKEND_URL}/api/prescriptions/patient/${patient.id}`
      );
      const presData = await presResponse.json();
      if (presData.success) {
        setPrescriptions(presData.prescriptions || []);
      }

      // Load adherence stats
      const adhResponse = await fetch(
        `${BACKEND_URL}/api/reminders/adherence/${patient.id}?days=7`
      );
      const adhData = await adhResponse.json();
      if (adhData.success) {
        setAdherenceStats(adhData.stats);
      }
    } catch (error) {
      console.error('Load data error:', error);
    }
  }, [patient?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleMedicationAction = async (
    prescriptionId: string,
    action: 'took' | 'missed' | 'snoozed'
  ) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/reminders/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prescription_id: prescriptionId,
          patient_id: patient?.id,
          action,
        }),
      });

      const data = await response.json();
      if (data.success) {
        Alert.alert('Success', `Marked as ${action}`);
        loadData();
      }
    } catch (error) {
      console.error('Log action error:', error);
    }
  };

  // Get today's medications based on schedule
  const getTodaysMedications = () => {
    const today = format(new Date(), 'EEE');
    return prescriptions.filter((p) => {
      const days = p.schedule?.days || [];
      return days.length === 0 || days.includes(today);
    });
  };

  const todaysMedications = getTodaysMedications();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello,</Text>
            <Text style={styles.patientName}>{patient?.name || 'User'}</Text>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push('/medication/add')}
          >
            <Ionicons name="add-circle" size={40} color="#0B6EFF" />
          </TouchableOpacity>
        </View>

        {/* Adherence Card */}
        {adherenceStats && (
          <View style={styles.adherenceCard}>
            <Text style={styles.cardTitle}>Weekly Adherence</Text>
            <View style={styles.adherenceStats}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {adherenceStats.adherence_rate}%
                </Text>
                <Text style={styles.statLabel}>Adherence Rate</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{adherenceStats.took}</Text>
                <Text style={styles.statLabel}>Taken</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{adherenceStats.missed}</Text>
                <Text style={styles.statLabel}>Missed</Text>
              </View>
            </View>
          </View>
        )}

        {/* Today's Medications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Medications</Text>
          
          {todaysMedications.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={48} color="#CCC" />
              <Text style={styles.emptyText}>No medications scheduled for today</Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => router.push('/medication/add')}
              >
                <Text style={styles.emptyButtonText}>Add Medication</Text>
              </TouchableOpacity>
            </View>
          ) : (
            todaysMedications.map((prescription) => (
              <View key={prescription.id} style={styles.medicationCard}>
                <View style={styles.medicationHeader}>
                  <View style={styles.medicationIcon}>
                    <Ionicons name="medical" size={24} color="#0B6EFF" />
                  </View>
                  <View style={styles.medicationInfo}>
                    <Text style={styles.medicationName}>
                      {prescription.medication_name}
                    </Text>
                    <Text style={styles.medicationDosage}>
                      {prescription.dosage} - {prescription.frequency}
                    </Text>
                    {prescription.schedule?.times && (
                      <Text style={styles.medicationTime}>
                        {prescription.schedule.times.join(', ')}
                      </Text>
                    )}
                  </View>
                </View>

                <View style={styles.medicationActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.tookButton]}
                    onPress={() => handleMedicationAction(prescription.id, 'took')}
                  >
                    <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                    <Text style={styles.actionButtonText}>Took</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.missedButton]}
                    onPress={() => handleMedicationAction(prescription.id, 'missed')}
                  >
                    <Ionicons name="close-circle" size={20} color="#FFF" />
                    <Text style={styles.actionButtonText}>Missed</Text>
                  </TouchableOpacity>
                </View>

                {prescription.current_stock !== undefined && (
                  <View style={styles.stockInfo}>
                    <Text style={styles.stockText}>
                      Stock: {prescription.current_stock} remaining
                    </Text>
                    {prescription.current_stock < 10 && (
                      <Text style={styles.lowStockWarning}>
                        ⚠️ Running low!
                      </Text>
                    )}
                  </View>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 16,
    color: '#666',
  },
  patientName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    padding: 4,
  },
  adherenceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  adherenceStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#0B6EFF',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E0E0E0',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  medicationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  medicationHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  medicationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8F4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  medicationInfo: {
    flex: 1,
  },
  medicationName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  medicationDosage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  medicationTime: {
    fontSize: 14,
    color: '#0B6EFF',
    fontWeight: '600',
  },
  medicationActions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  tookButton: {
    backgroundColor: '#0BCB85',
  },
  missedButton: {
    backgroundColor: '#FF4D4F',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  stockInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  stockText: {
    fontSize: 14,
    color: '#666',
  },
  lowStockWarning: {
    fontSize: 14,
    color: '#FF4D4F',
    fontWeight: '600',
  },
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 12,
    marginBottom: 20,
    textAlign: 'center',
  },
  emptyButton: {
    backgroundColor: '#0B6EFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
