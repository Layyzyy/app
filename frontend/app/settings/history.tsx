import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { format } from 'date-fns';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function MedicationHistory() {
  const { patient } = useAuth();
  const { colors } = useTheme();
  const [logs, setLogs] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const loadHistory = async () => {
    if (!patient?.id) return;

    try {
      const response = await fetch(
        `${BACKEND_URL}/api/reminders/logs/patient/${patient.id}?days=30`
      );
      const data = await response.json();
      if (data.success) {
        setLogs(data.logs || []);
      }
    } catch (error) {
      console.error('Load history error:', error);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [patient?.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'took':
        return { name: 'checkmark-circle', color: colors.success };
      case 'missed':
        return { name: 'close-circle', color: colors.error };
      case 'snoozed':
        return { name: 'time', color: colors.warning };
      default:
        return { name: 'help-circle', color: colors.textSecondary };
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy h:mm a');
    } catch {
      return dateString;
    }
  };

  const styles = createStyles(colors);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Medication History</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {logs.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="time-outline" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyText}>No medication history yet</Text>
            <Text style={styles.emptySubtext}>
              Your medication logs will appear here
            </Text>
          </View>
        ) : (
          logs.map((log, index) => {
            const actionIcon = getActionIcon(log.action);
            return (
              <View key={log.id || index} style={styles.logCard}>
                <View style={styles.logHeader}>
                  <View
                    style={[
                      styles.actionIcon,
                      { backgroundColor: actionIcon.color + '20' },
                    ]}
                  >
                    <Ionicons
                      name={actionIcon.name as any}
                      size={24}
                      color={actionIcon.color}
                    />
                  </View>
                  <View style={styles.logInfo}>
                    <Text style={styles.logAction}>
                      {log.action.charAt(0).toUpperCase() + log.action.slice(1)}
                    </Text>
                    <Text style={styles.logDate}>
                      {formatDate(log.created_at)}
                    </Text>
                  </View>
                </View>

                {log.with_food_confirmed !== null &&
                  log.with_food_confirmed !== undefined && (
                    <View style={styles.foodInfo}>
                      <Ionicons
                        name="restaurant"
                        size={16}
                        color={colors.textSecondary}
                      />
                      <Text style={styles.foodText}>
                        {log.with_food_confirmed ? 'Taken with food' : 'Not taken with food'}
                      </Text>
                    </View>
                  )}

                {log.note && (
                  <Text style={styles.logNote}>{log.note}</Text>
                )}
              </View>
            );
          })
        )}
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
    placeholder: {
      width: 40,
    },
    content: {
      padding: 20,
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 80,
    },
    emptyText: {
      fontSize: 18,
      color: colors.text,
      marginTop: 16,
      marginBottom: 8,
    },
    emptySubtext: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    logCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    logHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    actionIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    logInfo: {
      flex: 1,
    },
    logAction: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 4,
    },
    logDate: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    foodInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 8,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    foodText: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    logNote: {
      fontSize: 14,
      color: colors.text,
      marginTop: 8,
      fontStyle: 'italic',
    },
  });
