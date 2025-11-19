import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function AIAssistant() {
  const [medicationName, setMedicationName] = useState('');
  const [queryType, setQueryType] = useState<string>('summary');
  const [customQuery, setCustomQuery] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const queryTypes = [
    { id: 'summary', label: 'Summary', icon: 'document-text' },
    { id: 'interactions', label: 'Interactions', icon: 'warning' },
    { id: 'dosage', label: 'Dosage', icon: 'fitness' },
    { id: 'side_effects', label: 'Side Effects', icon: 'medical' },
  ];

  const handleQuery = async () => {
    if (!medicationName && queryType !== 'custom') {
      return;
    }

    setLoading(true);
    setResponse(null);

    try {
      const response = await fetch(`${BACKEND_URL}/api/ai/explain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medication_name: medicationName,
          query_type: queryType,
          language: 'en',
          custom_query: customQuery || undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResponse(data.explanation);
      } else {
        setResponse('Sorry, I could not find information about this medication.');
      }
    } catch (error) {
      console.error('AI query error:', error);
      setResponse('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          <Ionicons name="sparkles" size={32} color="#0B6EFF" />
          <Text style={styles.title}>AI Assistant</Text>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.inputSection}>
            <Text style={styles.label}>Medication Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Metformin, Aspirin"
              placeholderTextColor="#999"
              value={medicationName}
              onChangeText={setMedicationName}
            />
          </View>

          <View style={styles.queryTypeSection}>
            <Text style={styles.label}>What would you like to know?</Text>
            <View style={styles.queryTypeGrid}>
              {queryTypes.map((type) => (
                <TouchableOpacity
                  key={type.id}
                  style={[
                    styles.queryTypeButton,
                    queryType === type.id && styles.queryTypeButtonActive,
                  ]}
                  onPress={() => setQueryType(type.id)}
                >
                  <Ionicons
                    name={type.icon as any}
                    size={24}
                    color={queryType === type.id ? '#0B6EFF' : '#666'}
                  />
                  <Text
                    style={[
                      styles.queryTypeText,
                      queryType === type.id && styles.queryTypeTextActive,
                    ]}
                  >
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.askButton, loading && styles.askButtonDisabled]}
            onPress={handleQuery}
            disabled={loading || !medicationName}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="send" size={20} color="#FFFFFF" />
                <Text style={styles.askButtonText}>Ask AI</Text>
              </>
            )}
          </TouchableOpacity>

          {response && (
            <View style={styles.responseSection}>
              <View style={styles.responseHeader}>
                <Ionicons name="chatbubbles" size={24} color="#0B6EFF" />
                <Text style={styles.responseTitle}>AI Response</Text>
              </View>
              <Text style={styles.responseText}>{response}</Text>
            </View>
          )}

          {!response && !loading && (
            <View style={styles.infoSection}>
              <Ionicons name="information-circle" size={24} color="#0B6EFF" />
              <Text style={styles.infoText}>
                Enter a medication name and select what you'd like to know. Our AI
                will provide helpful information in simple language.
              </Text>
            </View>
          )}
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
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    padding: 20,
  },
  inputSection: {
    marginBottom: 24,
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
  queryTypeSection: {
    marginBottom: 24,
  },
  queryTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  queryTypeButton: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  queryTypeButtonActive: {
    borderColor: '#0B6EFF',
    backgroundColor: '#E8F4FF',
  },
  queryTypeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  queryTypeTextActive: {
    color: '#0B6EFF',
  },
  askButton: {
    height: 56,
    backgroundColor: '#0B6EFF',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  askButtonDisabled: {
    opacity: 0.6,
  },
  askButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  responseSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  responseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  responseTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  responseText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
  infoSection: {
    flexDirection: 'row',
    backgroundColor: '#E8F4FF',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: '#666',
  },
});
