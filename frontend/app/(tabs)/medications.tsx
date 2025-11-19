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

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function Medications() {
  const { patient } = useAuth();
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const loadPrescriptions = useCallback(async () => {
    if (!patient?.id) return;

    try {
      const response = await fetch(
        `${BACKEND_URL}/api/prescriptions/patient/${patient.id}`
      );
      const data = await response.json();
      if (data.success) {
        setPrescriptions(data.prescriptions || []);
      }
    } catch (error) {
      console.error('Load prescriptions error:', error);
    }
  }, [patient?.id]);

  useEffect(() => {
    loadPrescriptions();
  }, [loadPrescriptions]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPrescriptions();
    setRefreshing(false);
  };

  const handleDelete = (prescriptionId: string, medName: string) => {
    Alert.alert(
      'Delete Medication',
      `Are you sure you want to delete ${medName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(
                `${BACKEND_URL}/api/prescriptions/${prescriptionId}`,
                { method: 'DELETE' }
              );
              const data = await response.json();
              if (data.success) {
                Alert.alert('Success', 'Medication deleted');
                loadPrescriptions();
              }
            } catch (error) {
              console.error('Delete error:', error);
              Alert.alert('Error', 'Failed to delete medication');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Medications</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/medication/add')}
        >
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {prescriptions.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="medical-outline" size={64} color="#CCC" />
            <Text style={styles.emptyText}>No medications added yet</Text>
            <Text style={styles.emptySubtext}>
              Tap the + button to add your first medication
            </Text>
          </View>
        ) : (
          prescriptions.map((prescription) => (
            <View key={prescription.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.iconContainer}>
                  <Ionicons name="medical" size={28} color="#0B6EFF" />
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.medicationName}>
                    {prescription.medication_name}
                  </Text>
                  <Text style={styles.medicationDosage}>
                    {prescription.dosage}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() =>
                    handleDelete(prescription.id, prescription.medication_name)
                  }
                >
                  <Ionicons name="trash-outline" size={24} color="#FF4D4F" />
                </TouchableOpacity>
              </View>

              <View style={styles.detailRow}>
                <Ionicons name="time-outline" size={18} color="#666" />
                <Text style={styles.detailText}>
                  {prescription.frequency} daily
                </Text>
              </View>

              {prescription.schedule?.times && (
                <View style={styles.detailRow}>
                  <Ionicons name="alarm-outline" size={18} color="#666" />
                  <Text style={styles.detailText}>
                    {prescription.schedule.times.join(', ')}
                  </Text>
                </View>
              )}

              {prescription.instructions && (
                <View style={styles.detailRow}>
                  <Ionicons name="information-circle-outline" size={18} color="#666" />
                  <Text style={styles.detailText}>
                    {prescription.instructions}
                  </Text>
                </View>
              )}

              <View style={styles.stockRow}>
                <View style={styles.stockInfo}>
                  <Ionicons
                    name="cube-outline"
                    size={18}
                    color={prescription.current_stock < 10 ? '#FF4D4F' : '#666'}
                  />
                  <Text
                    style={[
                      styles.stockText,
                      prescription.current_stock < 10 && styles.lowStockText,
                    ]}
                  >
                    Stock: {prescription.current_stock}
                  </Text>
                </View>
                {prescription.current_stock < 10 && (
                  <Text style={styles.refillText}>Refill soon</Text>
                )}
              </View>

              {prescription.start_date && (
                <Text style={styles.dateText}>
                  Started: {prescription.start_date}
                  {prescription.end_date && ` - Ends: ${prescription.end_date}`}
                </Text>
              )}
            </View>
          ))
        )}
      </ScrollView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0B6EFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 16,
  },
  card: {
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E8F4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardInfo: {
    flex: 1,
  },
  medicationName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  medicationDosage: {
    fontSize: 16,
    color: '#666',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  stockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  stockInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stockText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  lowStockText: {
    color: '#FF4D4F',
  },
  refillText: {
    fontSize: 14,
    color: '#FF4D4F',
    fontWeight: '600',
  },
  dateText: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});
