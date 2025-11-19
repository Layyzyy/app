import { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function Camera() {
  const [image, setImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [extracted, setExtracted] = useState<any>(null);
  const router = useRouter();

  const requestPermission = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Camera permission is needed to scan medicine labels'
      );
      return false;
    }
    return true;
  };

  const takePicture = async () => {
    const hasPermission = await requestPermission();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        setImage(result.assets[0].uri);
        await analyzeImage(result.assets[0].base64);
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to take picture');
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        setImage(result.assets[0].uri);
        await analyzeImage(result.assets[0].base64);
      }
    } catch (error) {
      console.error('Pick image error:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const analyzeImage = async (base64: string) => {
    setAnalyzing(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/ocr/recognize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_base64: base64 }),
      });

      const data = await response.json();

      if (data.success) {
        setExtracted(data.extracted);
        setCandidates(data.candidates || []);

        if (data.candidates && data.candidates.length > 0) {
          Alert.alert(
            'Medicine Found',
            `Found ${data.candidates.length} matching medication(s). Select one to add.`
          );
        } else {
          Alert.alert(
            'No Match Found',
            'Could not find matching medication. Please add manually.',
            [
              {
                text: 'Add Manually',
                onPress: () => router.back(),
              },
            ]
          );
        }
      } else {
        Alert.alert('Error', 'Failed to analyze image');
      }
    } catch (error) {
      console.error('Analyze error:', error);
      Alert.alert('Error', 'Failed to analyze image. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSelectCandidate = (candidate: any) => {
    // Navigate to add medication screen with pre-filled data
    router.push({
      pathname: '/medication/add',
      params: {
        medicationName: candidate.name,
        prefillDosage: candidate.strength,
      },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Scan Medicine</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        {!image ? (
          <View style={styles.instructionsContainer}>
            <Ionicons name="camera-outline" size={80} color="#0B6EFF" />
            <Text style={styles.instructionsTitle}>Scan Medicine Label</Text>
            <Text style={styles.instructionsText}>
              Take a clear photo of your medicine bottle or strip label
            </Text>

            <View style={styles.tipsContainer}>
              <Text style={styles.tipsTitle}>Tips for best results:</Text>
              <View style={styles.tipRow}>
                <Ionicons name="checkmark-circle" size={20} color="#0BCB85" />
                <Text style={styles.tipText}>Good lighting</Text>
              </View>
              <View style={styles.tipRow}>
                <Ionicons name="checkmark-circle" size={20} color="#0BCB85" />
                <Text style={styles.tipText}>Clear, focused image</Text>
              </View>
              <View style={styles.tipRow}>
                <Ionicons name="checkmark-circle" size={20} color="#0BCB85" />
                <Text style={styles.tipText}>Label visible and readable</Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.imageContainer}>
            <Image source={{ uri: image }} style={styles.image} />
            
            {analyzing && (
              <View style={styles.analyzeOverlay}>
                <ActivityIndicator size="large" color="#FFFFFF" />
                <Text style={styles.analyzingText}>Analyzing image...</Text>
              </View>
            )}

            {!analyzing && candidates.length > 0 && (
              <View style={styles.candidatesContainer}>
                <Text style={styles.candidatesTitle}>Matching Medications:</Text>
                {candidates.map((candidate, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.candidateCard}
                    onPress={() => handleSelectCandidate(candidate)}
                  >
                    <View style={styles.candidateInfo}>
                      <Text style={styles.candidateName}>{candidate.name}</Text>
                      <Text style={styles.candidateDetails}>
                        {candidate.generic_name} • {candidate.form}
                      </Text>
                      {candidate.strength && (
                        <Text style={styles.candidateStrength}>
                          {candidate.strength}
                        </Text>
                      )}
                    </View>
                    <Ionicons name="chevron-forward" size={24} color="#999" />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {!analyzing && (
              <TouchableOpacity
                style={styles.retakeButton}
                onPress={() => {
                  setImage(null);
                  setCandidates([]);
                  setExtracted(null);
                }}
              >
                <Ionicons name="refresh" size={20} color="#FFFFFF" />
                <Text style={styles.retakeButtonText}>Retake Photo</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {!image && (
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
            <Ionicons name="camera" size={32} color="#FFFFFF" />
            <Text style={styles.captureButtonText}>Take Photo</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.galleryButton} onPress={pickImage}>
            <Ionicons name="images" size={28} color="#0B6EFF" />
            <Text style={styles.galleryButtonText}>Choose from Gallery</Text>
          </TouchableOpacity>
        </View>
      )}
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
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  instructionsContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  instructionsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 24,
    marginBottom: 12,
  },
  instructionsText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  tipsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginTop: 32,
    width: '100%',
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  tipText: {
    fontSize: 14,
    color: '#666',
  },
  imageContainer: {
    flex: 1,
    padding: 20,
  },
  image: {
    width: '100%',
    height: 300,
    borderRadius: 16,
    backgroundColor: '#E0E0E0',
  },
  analyzeOverlay: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    height: 300,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  analyzingText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 12,
  },
  candidatesContainer: {
    marginTop: 20,
  },
  candidatesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  candidateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  candidateInfo: {
    flex: 1,
  },
  candidateName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  candidateDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  candidateStrength: {
    fontSize: 14,
    color: '#0B6EFF',
    fontWeight: '600',
  },
  retakeButton: {
    flexDirection: 'row',
    height: 48,
    backgroundColor: '#666',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
  },
  retakeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  actionButtons: {
    padding: 20,
    gap: 12,
  },
  captureButton: {
    flexDirection: 'row',
    height: 64,
    backgroundColor: '#0B6EFF',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  captureButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  galleryButton: {
    flexDirection: 'row',
    height: 56,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: '#0B6EFF',
  },
  galleryButtonText: {
    color: '#0B6EFF',
    fontSize: 18,
    fontWeight: '600',
  },
});
