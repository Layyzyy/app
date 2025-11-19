import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';

export default function Profile() {
  const { user, patient, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/auth/login');
          },
        },
      ]
    );
  };

  const profileItems = [
    {
      icon: 'person',
      label: 'Name',
      value: patient?.name || 'Not set',
    },
    {
      icon: 'call',
      label: 'Phone',
      value: user?.phone || 'Not set',
    },
    {
      icon: 'calendar',
      label: 'Date of Birth',
      value: patient?.dob || 'Not set',
    },
    {
      icon: 'male-female',
      label: 'Gender',
      value: patient?.gender || 'Not set',
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {patient?.name?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
          <Text style={styles.patientName}>{patient?.name || 'User'}</Text>
          <Text style={styles.userRole}>{user?.role || 'Patient'}</Text>
        </View>

        {/* Profile Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          {profileItems.map((item, index) => (
            <View key={index} style={styles.infoRow}>
              <View style={styles.infoLeft}>
                <Ionicons name={item.icon as any} size={24} color="#0B6EFF" />
                <Text style={styles.infoLabel}>{item.label}</Text>
              </View>
              <Text style={styles.infoValue}>{item.value}</Text>
            </View>
          ))}
        </View>

        {/* Emergency Contact */}
        {patient?.emergency_contact && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Emergency Contact</Text>
            <View style={styles.emergencyCard}>
              <Ionicons name="medical" size={32} color="#FF4D4F" />
              <View style={styles.emergencyInfo}>
                <Text style={styles.emergencyName}>
                  {patient.emergency_contact.name}
                </Text>
                <Text style={styles.emergencyPhone}>
                  {patient.emergency_contact.phone}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Medical Info */}
        {(patient?.allergies?.length > 0 || patient?.conditions?.length > 0) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Medical Information</Text>
            
            {patient?.allergies?.length > 0 && (
              <View style={styles.medicalItem}>
                <Text style={styles.medicalLabel}>Allergies</Text>
                <Text style={styles.medicalValue}>
                  {patient.allergies.join(', ')}
                </Text>
              </View>
            )}
            
            {patient?.conditions?.length > 0 && (
              <View style={styles.medicalItem}>
                <Text style={styles.medicalLabel}>Conditions</Text>
                <Text style={styles.medicalValue}>
                  {patient.conditions.join(', ')}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Actions */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="settings-outline" size={24} color="#333" />
            <Text style={styles.actionButtonText}>Settings</Text>
            <Ionicons name="chevron-forward" size={24} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="help-circle-outline" size={24} color="#333" />
            <Text style={styles.actionButtonText}>Help & Support</Text>
            <Ionicons name="chevron-forward" size={24} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="information-circle-outline" size={24} color="#333" />
            <Text style={styles.actionButtonText}>About</Text>
            <Ionicons name="chevron-forward" size={24} color="#999" />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="#FF4D4F" />
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>Version 1.0.0</Text>
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
  content: {
    padding: 20,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#0B6EFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  patientName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  userRole: {
    fontSize: 16,
    color: '#666',
    textTransform: 'capitalize',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  infoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoLabel: {
    fontSize: 16,
    color: '#666',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  emergencyCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF5F5',
    padding: 16,
    borderRadius: 12,
    gap: 16,
  },
  emergencyInfo: {
    flex: 1,
  },
  emergencyName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  emergencyPhone: {
    fontSize: 16,
    color: '#666',
  },
  medicalItem: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  medicalLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  medicalValue: {
    fontSize: 16,
    color: '#333',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  actionButtonText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    borderWidth: 2,
    borderColor: '#FF4D4F',
    marginTop: 16,
  },
  logoutButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF4D4F',
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#999',
    marginTop: 24,
  },
});
