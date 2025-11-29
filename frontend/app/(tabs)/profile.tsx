import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

export default function Profile() {
  const { user, patient, logout } = useAuth();
  const { colors, isDark, toggleTheme } = useTheme();
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

  const styles = createStyles(colors);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {patient?.name?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
          <Text style={styles.patientName}>{patient?.name || 'User'}</Text>
          <Text style={styles.userRole}>{user?.role || 'Patient'}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          {profileItems.map((item, index) => (
            <View key={index} style={styles.infoRow}>
              <View style={styles.infoLeft}>
                <Ionicons name={item.icon as any} size={24} color={colors.primary} />
                <Text style={styles.infoLabel}>{item.label}</Text>
              </View>
              <Text style={styles.infoValue}>{item.value}</Text>
            </View>
          ))}
        </View>

        {patient?.emergency_contact && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Emergency Contact</Text>
            <View style={styles.emergencyCard}>
              <Ionicons name="medical" size={32} color={colors.error} />
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

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name="moon" size={24} color={colors.primary} />
              <Text style={styles.settingLabel}>Dark Mode</Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => router.push('/settings/history')}
          >
            <Ionicons name="time-outline" size={24} color={colors.text} />
            <Text style={styles.actionButtonText}>Medication History</Text>
            <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="notifications-outline" size={24} color={colors.text} />
            <Text style={styles.actionButtonText}>Notifications</Text>
            <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="help-circle-outline" size={24} color={colors.text} />
            <Text style={styles.actionButtonText}>Help & Support</Text>
            <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="information-circle-outline" size={24} color={colors.text} />
            <Text style={styles.actionButtonText}>About</Text>
            <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color={colors.error} />
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>Version 1.0.0</Text>
      </ScrollView>
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
      padding: 20,
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
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
      backgroundColor: colors.primary,
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
      color: colors.text,
      marginBottom: 4,
    },
    userRole: {
      fontSize: 16,
      color: colors.textSecondary,
      textTransform: 'capitalize',
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 12,
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.card,
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
      color: colors.textSecondary,
    },
    infoValue: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    emergencyCard: {
      flexDirection: 'row',
      backgroundColor: colors.error + '15',
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
      color: colors.text,
      marginBottom: 4,
    },
    emergencyPhone: {
      fontSize: 16,
      color: colors.textSecondary,
    },
    medicalItem: {
      backgroundColor: colors.card,
      padding: 16,
      borderRadius: 12,
      marginBottom: 8,
    },
    medicalLabel: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 4,
    },
    medicalValue: {
      fontSize: 16,
      color: colors.text,
    },
    settingRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.card,
      padding: 16,
      borderRadius: 12,
      marginBottom: 8,
    },
    settingLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    settingLabel: {
      fontSize: 16,
      color: colors.text,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      padding: 16,
      borderRadius: 12,
      marginBottom: 8,
      gap: 12,
    },
    actionButtonText: {
      flex: 1,
      fontSize: 16,
      color: colors.text,
    },
    logoutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.card,
      padding: 16,
      borderRadius: 12,
      gap: 8,
      borderWidth: 2,
      borderColor: colors.error,
      marginTop: 16,
    },
    logoutButtonText: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.error,
    },
    versionText: {
      textAlign: 'center',
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 24,
    },
  });
