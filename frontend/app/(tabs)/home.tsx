import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { format } from 'date-fns';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function Home() {
  const { patient } = useAuth();
  const { colors } = useTheme();
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [adherenceStats, setAdherenceStats] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMed, setSelectedMed] = useState<any>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const router = useRouter();

  const loadData = useCallback(async () => {
    if (!patient?.id) return;
    try {
      const presResponse = await fetch(`${BACKEND_URL}/api/prescriptions/patient/${patient.id}`);
      const presData = await presResponse.json();
      if (presData.success) setPrescriptions(presData.prescriptions || []);
      const adhResponse = await fetch(`${BACKEND_URL}/api/reminders/adherence/${patient.id}?days=7`);
      const adhData = await adhResponse.json();
      if (adhData.success) setAdherenceStats(adhData.stats);
    } catch (error) {
      console.error('Load data error:', error);
    }
  }, [patient?.id]);

  useEffect(() => { loadData(); }, [loadData]);
  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };
  const handleTookClick = (prescription: any) => { setSelectedMed(prescription); setShowConfirmModal(true); };

  const confirmTook = async (withFoodConfirmed: boolean) => {
    if (!selectedMed) return;
    try {
      const response = await fetch(`${BACKEND_URL}/api/reminders/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prescription_id: selectedMed.id, patient_id: patient?.id, action: 'took', with_food_confirmed: withFoodConfirmed }),
      });
      const data = await response.json();
      if (data.success) { setShowConfirmModal(false); setSelectedMed(null); Alert.alert('Success', 'Medication marked as taken!'); loadData(); }
    } catch (error) { console.error('Log action error:', error); }
  };

  const handleMissed = async (prescriptionId: string) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/reminders/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prescription_id: prescriptionId, patient_id: patient?.id, action: 'missed' }),
      });
      const data = await response.json();
      if (data.success) { Alert.alert('Noted', 'Marked as missed'); loadData(); }
    } catch (error) { console.error('Log action error:', error); }
  };

  const getTodaysMedications = () => {
    const today = format(new Date(), 'EEE');
    return prescriptions.filter((p) => { const days = p.schedule?.days || []; return days.length === 0 || days.includes(today); });
  };

  const todaysMedications = getTodaysMedications();
  const styles = createStyles(colors);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello,</Text>
            <Text style={styles.patientName}>{patient?.name || 'User'}</Text>
          </View>
          <TouchableOpacity style={styles.addButton} onPress={() => router.push('/medication/add')}>
            <Ionicons name="add-circle" size={40} color={colors.primary} />
          </TouchableOpacity>
        </View>
        {adherenceStats && (
          <View style={styles.adherenceCard}>
            <Text style={styles.cardTitle}>Weekly Adherence</Text>
            <View style={styles.adherenceStats}>
              <View style={styles.statItem}><Text style={styles.statValue}>{adherenceStats.adherence_rate}%</Text><Text style={styles.statLabel}>Adherence Rate</Text></View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}><Text style={styles.statValue}>{adherenceStats.took}</Text><Text style={styles.statLabel}>Taken</Text></View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}><Text style={styles.statValue}>{adherenceStats.missed}</Text><Text style={styles.statLabel}>Missed</Text></View>
            </View>
          </View>
        )}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Medications</Text>
          {todaysMedications.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={48} color={colors.textSecondary} />
              <Text style={styles.emptyText}>No medications scheduled for today</Text>
              <TouchableOpacity style={styles.emptyButton} onPress={() => router.push('/medication/add')}>
                <Text style={styles.emptyButtonText}>Add Medication</Text>
              </TouchableOpacity>
            </View>
          ) : (
            todaysMedications.map((prescription) => (
              <View key={prescription.id} style={styles.medicationCard}>
                <View style={styles.medicationHeader}>
                  <View style={styles.medicationIcon}><Ionicons name="medical" size={24} color={colors.primary} /></View>
                  <View style={styles.medicationInfo}>
                    <Text style={styles.medicationName}>{prescription.medication_name}</Text>
                    <Text style={styles.medicationDosage}>{prescription.dosage} - {prescription.frequency}</Text>
                    {prescription.description && <Text style={styles.medicationDescription}>{prescription.description}</Text>}
                    {prescription.schedule?.times && <Text style={styles.medicationTime}>{prescription.schedule.times.join(', ')}</Text>}
                    {prescription.expiry_date && <Text style={styles.expiryDate}>Expires: {prescription.expiry_date}</Text>}
                  </View>
                </View>
                <View style={styles.medicationActions}>
                  <TouchableOpacity style={[styles.actionButton, styles.tookButton]} onPress={() => handleTookClick(prescription)}>
                    <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                    <Text style={styles.actionButtonText}>Took</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionButton, styles.missedButton]} onPress={() => handleMissed(prescription.id)}>
                    <Ionicons name="close-circle" size={20} color="#FFF" />
                    <Text style={styles.actionButtonText}>Missed</Text>
                  </TouchableOpacity>
                </View>
                {prescription.current_stock !== undefined && (
                  <View style={styles.stockInfo}>
                    <Text style={styles.stockText}>Stock: {prescription.current_stock} remaining</Text>
                    {prescription.current_stock < 10 && <Text style={styles.lowStockWarning}>Low stock!</Text>}
                  </View>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>
      <Modal visible={showConfirmModal} transparent animationType="fade" onRequestClose={() => setShowConfirmModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Confirm Medication Taken</Text>
            {selectedMed && (
              <>
                <View style={styles.modalMedInfo}>
                  <Text style={styles.modalMedName}>{selectedMed.medication_name}</Text>
                  <Text style={styles.modalMedDosage}>{selectedMed.dosage}</Text>
                  {selectedMed.description && (
                    <View style={styles.modalDescBox}>
                      <Ionicons name="information-circle" size={20} color={colors.primary} />
                      <Text style={styles.modalDescription}>{selectedMed.description}</Text>
                    </View>
                  )}
                </View>
                {selectedMed.with_food && (
                  <View style={styles.modalFoodSection}>
                    <Ionicons name="restaurant" size={24} color={colors.warning} />
                    <Text style={styles.modalFoodText}>This medication should be taken with food</Text>
                  </View>
                )}
                <Text style={styles.modalQuestion}>Did you take this medication {selectedMed.with_food ? 'with food' : ''}?</Text>
                <View style={styles.modalButtons}>
                  <TouchableOpacity style={[styles.modalButton, styles.modalYesButton]} onPress={() => confirmTook(true)}>
                    <Text style={styles.modalButtonText}>Yes</Text>
                  </TouchableOpacity>
                  {selectedMed.with_food && (
                    <TouchableOpacity style={[styles.modalButton, styles.modalNoButton]} onPress={() => confirmTook(false)}>
                      <Text style={styles.modalButtonText}>No</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={[styles.modalButton, styles.modalCancelButton]} onPress={() => { setShowConfirmModal(false); setSelectedMed(null); }}>
                    <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  greeting: { fontSize: 16, color: colors.textSecondary },
  patientName: { fontSize: 28, fontWeight: 'bold', color: colors.text },
  addButton: { padding: 4 },
  adherenceCard: { backgroundColor: colors.card, borderRadius: 16, padding: 20, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 16 },
  adherenceStats: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 32, fontWeight: 'bold', color: colors.primary },
  statLabel: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
  statDivider: { width: 1, backgroundColor: colors.border },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 22, fontWeight: 'bold', color: colors.text, marginBottom: 16 },
  medicationCard: { backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  medicationHeader: { flexDirection: 'row', marginBottom: 12 },
  medicationIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary + '20', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  medicationInfo: { flex: 1 },
  medicationName: { fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 4 },
  medicationDosage: { fontSize: 14, color: colors.textSecondary, marginBottom: 4 },
  medicationDescription: { fontSize: 14, color: colors.primary, fontStyle: 'italic', marginBottom: 4 },
  medicationTime: { fontSize: 14, color: colors.primary, fontWeight: '600' },
  expiryDate: { fontSize: 12, color: colors.warning, marginTop: 2 },
  medicationActions: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  actionButton: { flex: 1, flexDirection: 'row', height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 6 },
  tookButton: { backgroundColor: colors.success },
  missedButton: { backgroundColor: colors.error },
  actionButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  stockInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  stockText: { fontSize: 14, color: colors.textSecondary },
  lowStockWarning: { fontSize: 14, color: colors.error, fontWeight: '600' },
  emptyState: { backgroundColor: colors.card, borderRadius: 16, padding: 40, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  emptyText: { fontSize: 16, color: colors.textSecondary, marginTop: 12, marginBottom: 20, textAlign: 'center' },
  emptyButton: { backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  emptyButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: colors.card, borderRadius: 20, padding: 24, width: '100%', maxWidth: 400 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: colors.text, marginBottom: 20, textAlign: 'center' },
  modalMedInfo: { backgroundColor: colors.background, borderRadius: 12, padding: 16, marginBottom: 16 },
  modalMedName: { fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 4 },
  modalMedDosage: { fontSize: 16, color: colors.textSecondary, marginBottom: 8 },
  modalDescBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 8, padding: 12, backgroundColor: colors.primary + '10', borderRadius: 8 },
  modalDescription: { flex: 1, fontSize: 14, color: colors.text, lineHeight: 20 },
  modalFoodSection: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.warning + '20', padding: 12, borderRadius: 12, marginBottom: 16, gap: 12 },
  modalFoodText: { flex: 1, fontSize: 14, color: colors.text, fontWeight: '600' },
  modalQuestion: { fontSize: 16, color: colors.text, textAlign: 'center', marginBottom: 20 },
  modalButtons: { flexDirection: 'row', gap: 8 },
  modalButton: { flex: 1, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  modalYesButton: { backgroundColor: colors.success },
  modalNoButton: { backgroundColor: colors.error },
  modalCancelButton: { backgroundColor: colors.border },
  modalButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
});
