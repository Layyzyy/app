import { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from './contexts/AuthContext';

export default function Index() {
  const { user, patient, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        if (patient) {
          router.replace('/(tabs)/home');
        } else {
          router.replace('/onboarding/setup');
        }
      } else {
        router.replace('/auth/login');
      }
    }
  }, [user, patient, isLoading]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#0B6EFF" />
      <Text style={styles.text}>MediMinder</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    marginTop: 16,
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0B6EFF',
  },
});
