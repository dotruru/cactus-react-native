import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { launchCamera, launchImageLibrary, ImagePickerResponse } from 'react-native-image-picker';
import { useCactusLM } from 'cactus-react-native';
import { useLanguage } from '../hooks/useLanguage';
import DatabaseService from '../services/DatabaseService';
import VisionService from '../services/VisionService';

// Simple ID generator (no crypto dependency)
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

interface CapturedIssue {
  id: string;
  location: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  trade: string;
  photos: string[];
  voiceNote?: string;
  createdAt: Date;
}

interface Props {
  navigation: any;
}

const ISSUE_TYPES = [
  { id: 'rebar', label: '🔩 Rebar', color: '#795548' },
  { id: 'electrical', label: '⚡ Electrical', color: '#FFC107' },
  { id: 'plumbing', label: '🔧 Plumbing', color: '#2196F3' },
  { id: 'hvac', label: '❄️ HVAC', color: '#00BCD4' },
  { id: 'structural', label: '🏗️ Structural', color: '#607D8B' },
  { id: 'safety', label: '⚠️ Safety', color: '#f44336' },
  { id: 'quality', label: '✓ Quality', color: '#4CAF50' },
  { id: 'other', label: '📝 Other', color: '#9E9E9E' },
];

const SEVERITY_LEVELS = [
  { id: 'low', label: 'Low', color: '#4CAF50' },
  { id: 'medium', label: 'Medium', color: '#FF9800' },
  { id: 'high', label: 'High', color: '#f44336' },
  { id: 'critical', label: 'Critical', color: '#9C27B0' },
];

interface PhotoWithAnalysis {
  uri: string;
  analysis?: string;
  isAnalyzing?: boolean;
}

const CaptureScreen = ({ navigation }: Props) => {
  const { currentLanguage } = useLanguage();
  
  // Single LLM for both vision (photo analysis) and text enhancement
  const lm = useCactusLM({ model: 'lfm2-vl-450m' });
  
  const [photos, setPhotos] = useState<PhotoWithAnalysis[]>([]);
  const [location, setLocation] = useState('');
  const [issueType, setIssueType] = useState('');
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [description, setDescription] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [isAnalyzingPhoto, setIsAnalyzingPhoto] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  
  // Track initialization state ourselves since hook state may not update
  const [lmInitialized, setLmInitialized] = useState(false);
  const [lmStatus, setLmStatus] = useState<'not_ready' | 'downloading' | 'ready'>('not_ready');

  // Request camera permission on Android
  const requestCameraPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Camera Permission',
            message: 'FieldMind needs camera access to capture site photos',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.error('Camera permission error:', err);
        return false;
      }
    }
    return true;
  };

  // Initialize LLM (for both vision and text enhancement)
  useEffect(() => {
    const initLM = async () => {
      // Skip if already initialized
      if (lmInitialized) {
        console.log('CaptureScreen: LM already initialized, skipping');
        return;
      }
      
      console.log('CaptureScreen: LM state - downloaded:', lm.isDownloaded, 
                  'downloading:', lm.isDownloading);
      
      if (!lm.isDownloaded && !lm.isDownloading) {
        setLmStatus('downloading');
        console.log('CaptureScreen: Starting LM download...');
        try {
          await lm.download();
          console.log('CaptureScreen: LM downloaded');
        } catch (e) {
          console.error('LM download error:', e);
          return;
        }
      }
      
      if (lm.isDownloaded && !lmInitialized) {
        console.log('CaptureScreen: Initializing LM...');
        try {
          await lm.init();
          setLmInitialized(true);
          setLmStatus('ready');
          console.log('CaptureScreen: LM initialized and ready');
        } catch (e) {
          console.error('LM init error:', e);
        }
      }
    };
    
    initLM();
  }, [lm.isDownloaded, lmInitialized]);

  // Analyze photo with Vision AI
  const analyzePhoto = async (photoUri: string, index: number) => {
    console.log('CaptureScreen: analyzePhoto - lmStatus:', lmStatus, 'lmInitialized:', lmInitialized);
    
    if (!lmInitialized) {
      Alert.alert('AI Not Ready', 'Please wait for the AI model to initialize.');
      return;
    }

    setIsAnalyzingPhoto(true);
    setPhotos(prev => prev.map((p, i) => 
      i === index ? { ...p, isAnalyzing: true } : p
    ));

    try {
      const result = await VisionService.analyzePhoto(lm, photoUri, location);
      
      setPhotos(prev => prev.map((p, i) => 
        i === index ? { ...p, analysis: result.description, isAnalyzing: false } : p
      ));

      // Auto-fill fields based on analysis
      if (!issueType && result.trade !== 'general') {
        const tradeToType: Record<string, string> = {
          electrical: 'electrical',
          plumbing: 'plumbing',
          structural: 'structural',
          hvac: 'hvac',
          safety: 'safety',
        };
        if (tradeToType[result.trade]) {
          setIssueType(tradeToType[result.trade]);
        }
      }

      if (result.severity !== 'none') {
        setSeverity(result.severity);
      }

      // Append analysis to description
      if (result.issues.length > 0) {
        const issueText = result.issues.join('. ');
        setDescription(prev => prev + (prev ? '\n\n📸 Photo analysis: ' : '📸 Photo analysis: ') + issueText);
      }

      console.log('Photo analyzed:', result);
    } catch (error) {
      console.error('Photo analysis error:', error);
      setPhotos(prev => prev.map((p, i) => 
        i === index ? { ...p, isAnalyzing: false } : p
      ));
      Alert.alert('Analysis Error', 'Failed to analyze photo');
    } finally {
      setIsAnalyzingPhoto(false);
    }
  };

  const handleTakePhoto = async () => {
    // Request camera permission first
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      Alert.alert('Permission Required', 'Camera permission is needed to take photos');
      return;
    }

    try {
      const result: ImagePickerResponse = await launchCamera({
        mediaType: 'photo',
        quality: 0.1, // Lower quality for vision model compatibility
        saveToPhotos: false,
        cameraType: 'back',
      });
      
      if (result.didCancel) {
        console.log('User cancelled camera');
        return;
      }
      
      if (result.errorCode) {
        console.error('Camera error:', result.errorMessage);
        Alert.alert('Camera Error', result.errorMessage || 'Failed to open camera');
        return;
      }
      
      if (result.assets && result.assets[0]?.uri) {
        const newPhoto: PhotoWithAnalysis = { uri: result.assets[0].uri };
        const newIndex = photos.length;
        setPhotos(prev => [...prev, newPhoto]);
        console.log('CaptureScreen: Photo added at index', newIndex);
        
        // Auto-analyze if vision is ready
        if (lmInitialized) {
          console.log('CaptureScreen: Auto-analyzing photo...');
          setTimeout(() => analyzePhoto(result.assets![0].uri!, newIndex), 500);
        } else {
          console.log('CaptureScreen: Vision not ready, skipping auto-analyze');
        }
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const handlePickImage = async () => {
    try {
      const result: ImagePickerResponse = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.1, // Lower quality for vision model compatibility
        selectionLimit: 5,
      });
      
      if (result.assets) {
        const newPhotos: PhotoWithAnalysis[] = result.assets
          .map(a => a.uri!)
          .filter(Boolean)
          .map(uri => ({ uri }));
        setPhotos(prev => [...prev, ...newPhotos]);
      }
    } catch (error) {
      console.error('Gallery error:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handlePhotoPress = (index: number) => {
    setSelectedPhotoIndex(index);
  };

  /**
   * Enhance the description with AI:
   * - Translate to English if needed
   * - Make it concise and professional
   * - Extract issue type, severity, location
   */
  const handleEnhanceWithAI = async () => {
    if (!description.trim()) {
      Alert.alert('No Text', 'Please enter or dictate a description first using the keyboard microphone.');
      return;
    }

    if (!lmInitialized) {
      Alert.alert('AI Not Ready', 'Please wait for the AI model to initialize.');
      return;
    }

    setIsEnhancing(true);

    try {
      console.log('CaptureScreen: Enhancing description with AI...');
      
      // Get photo analysis if available
      const photoAnalysis = photos.find(p => p.analysis)?.analysis;
      
      const systemPrompt = `Extract and rewrite construction issue. Output ONLY valid JSON, nothing else.

{"type":"electrical|plumbing|structural|hvac|safety|rebar|quality|other","severity":"low|medium|high|critical","location":"string","description":"string","action":"string"}

Rules:
- description: 1-2 factual sentences. No greetings, no "I", no filler words. State the problem directly.
- Translate non-English to English
- Extract location from text if mentioned
- action: brief next step (e.g. "Inspect immediately", "Schedule repair")

Example output:
{"type":"structural","severity":"high","location":"Level 2, East wing","description":"Visible crack in load-bearing wall, approximately 15cm long. Concrete spalling observed.","action":"Structural engineer inspection required"}`;

      let userPrompt = `Worker's input: "${description}"`;
      if (photoAnalysis) {
        userPrompt += `\n\nPhoto analysis: ${photoAnalysis}`;
      }
      if (location) {
        userPrompt += `\n\nKnown location: ${location}`;
      }

      const result = await lm.complete({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      });

      console.log('CaptureScreen: AI enhancement result:', result.response);

      // Parse JSON from response
      const jsonMatch = result.response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const enhanced = JSON.parse(jsonMatch[0]);
          
          // Update fields
          if (enhanced.description) {
            setDescription(enhanced.description);
          }
          if (enhanced.type && ISSUE_TYPES.find(t => t.id === enhanced.type)) {
            setIssueType(enhanced.type);
          }
          if (enhanced.severity) {
            setSeverity(enhanced.severity);
          }
          if (enhanced.location && !location) {
            setLocation(enhanced.location);
          }

          Alert.alert('✨ Enhanced', 'Description improved and fields auto-filled!');
        } catch (parseError) {
          console.error('CaptureScreen: Failed to parse AI response:', parseError);
          Alert.alert('Enhancement Partial', 'Could not fully parse AI response, but description may have been improved.');
        }
      } else {
        // If no JSON, just use the response as description
        if (result.response.trim()) {
          setDescription(result.response.trim().replace(/<\|[^>]+\|>/g, ''));
        }
      }
    } catch (error) {
      console.error('CaptureScreen: Enhancement error:', error);
      Alert.alert('Error', 'Failed to enhance description. Please try again.');
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      Alert.alert('Missing Info', 'Please provide a description of the issue');
      return;
    }

    setIsProcessing(true);

    try {
      // Save to database
      await DatabaseService.saveIssue({
        id: generateId(),
        syncStatus: 'pending',
        zone: '',
        location: location || 'Unknown',
        type: issueType || 'other',
        trade: issueType || 'general',
        severity,
        description: description.trim(),
        descriptionOriginal: description.trim(),
        descriptionLanguage: currentLanguage,
        photos: JSON.stringify(photos.map(p => p.uri)),
        voiceNotes: '[]',
        actionRequired: '',
        assignedTo: '',
        reportedBy: '',
        deviceId: '',
      });

      console.log('Issue saved to database');
      
      Alert.alert(
        'Issue Captured',
        'The issue has been saved locally and will sync when connected.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Submit error:', error);
      Alert.alert('Error', `Failed to save issue: ${error}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Capture Issue</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Photos Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>📸 Photos</Text>
          {lmStatus === 'downloading' && (
            <Text style={styles.visionStatus}>🔄 Loading AI...</Text>
          )}
          {lmStatus === 'ready' && (
            <Text style={styles.visionStatusReady}>✨ AI Ready</Text>
          )}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosScroll}>
          <TouchableOpacity style={styles.addPhotoButton} onPress={handleTakePhoto}>
            <Text style={styles.addPhotoIcon}>📷</Text>
            <Text style={styles.addPhotoText}>Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addPhotoButton} onPress={handlePickImage}>
            <Text style={styles.addPhotoIcon}>🖼️</Text>
            <Text style={styles.addPhotoText}>Gallery</Text>
          </TouchableOpacity>
          {photos.map((photo, index) => (
            <TouchableOpacity 
              key={index} 
              style={styles.photoContainer}
              onPress={() => handlePhotoPress(index)}
            >
              <Image source={{ uri: photo.uri }} style={styles.photo} />
              {photo.isAnalyzing && (
                <View style={styles.photoAnalyzing}>
                  <ActivityIndicator size="small" color="#fff" />
                </View>
              )}
              {photo.analysis && !photo.isAnalyzing && (
                <View style={styles.photoAnalyzed}>
                  <Text style={styles.photoAnalyzedIcon}>✓</Text>
                </View>
              )}
              <TouchableOpacity
                style={styles.removePhotoButton}
                onPress={() => handleRemovePhoto(index)}
              >
                <Text style={styles.removePhotoText}>✕</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Photo Detail Modal */}
        <Modal
          visible={selectedPhotoIndex !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedPhotoIndex(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              {selectedPhotoIndex !== null && photos[selectedPhotoIndex] && (
                <>
                  <Image 
                    source={{ uri: photos[selectedPhotoIndex].uri }} 
                    style={styles.modalPhoto}
                    resizeMode="contain"
                  />
                  
                  {photos[selectedPhotoIndex].analysis ? (
                    <ScrollView style={styles.analysisContainer}>
                      <Text style={styles.analysisTitle}>🔍 AI Analysis</Text>
                      <Text style={styles.analysisText}>
                        {photos[selectedPhotoIndex].analysis}
                      </Text>
                    </ScrollView>
                  ) : (
                    <TouchableOpacity
                      style={[
                        styles.analyzeButton,
                        (!lmInitialized || isAnalyzingPhoto) && styles.analyzeButtonDisabled
                      ]}
                      onPress={() => analyzePhoto(photos[selectedPhotoIndex].uri, selectedPhotoIndex)}
                      disabled={!lmInitialized || isAnalyzingPhoto}
                    >
                      {isAnalyzingPhoto ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.analyzeButtonText}>
                          {lmInitialized ? '🔍 Analyze with AI' : '⏳ AI loading...'}
                        </Text>
                      )}
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={styles.closeModalButton}
                    onPress={() => setSelectedPhotoIndex(null)}
                  >
                    <Text style={styles.closeModalText}>Close</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </Modal>

        {/* Location */}
        <Text style={styles.sectionTitle}>📍 Location</Text>
        <TextInput
          style={styles.textInput}
          value={location}
          onChangeText={setLocation}
          placeholder="e.g., Zone A, Level 2, Room 205"
          placeholderTextColor="#666"
        />

        {/* Issue Type */}
        <Text style={styles.sectionTitle}>🏷️ Issue Type</Text>
        <View style={styles.typeGrid}>
          {ISSUE_TYPES.map((type) => (
            <TouchableOpacity
              key={type.id}
              style={[
                styles.typeChip,
                issueType === type.id && { backgroundColor: type.color }
              ]}
              onPress={() => setIssueType(type.id)}
            >
              <Text style={[
                styles.typeChipText,
                issueType === type.id && styles.typeChipTextActive
              ]}>
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Severity */}
        <Text style={styles.sectionTitle}>⚠️ Severity</Text>
        <View style={styles.severityRow}>
          {SEVERITY_LEVELS.map((level) => (
            <TouchableOpacity
              key={level.id}
              style={[
                styles.severityButton,
                severity === level.id && { backgroundColor: level.color }
              ]}
              onPress={() => setSeverity(level.id as any)}
            >
              <Text style={[
                styles.severityText,
                severity === level.id && styles.severityTextActive
              ]}>
                {level.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Description */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>📝 Description</Text>
          <Text style={styles.voiceHint}>💡 Tap keyboard 🎤 to dictate</Text>
        </View>
        <View style={styles.descriptionContainer}>
          <TextInput
            style={styles.descriptionInput}
            value={description}
            onChangeText={setDescription}
            placeholder="Tap here and use the keyboard microphone 🎤 to speak, or type..."
            placeholderTextColor="#666"
            multiline
            textAlignVertical="top"
          />
          
          {/* Enhance with AI Button */}
          <View style={styles.enhanceContainer}>
            <TouchableOpacity
              style={[
                styles.enhanceButton,
                (!lmInitialized || isEnhancing || !description.trim()) && styles.enhanceButtonDisabled
              ]}
              onPress={handleEnhanceWithAI}
              disabled={!lmInitialized || isEnhancing || !description.trim()}
            >
              {isEnhancing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Text style={styles.enhanceButtonIcon}>✨</Text>
                  <Text style={styles.enhanceButtonText}>Enhance with AI</Text>
                </>
              )}
            </TouchableOpacity>
            
            <Text style={styles.enhanceHint}>
              {lmStatus === 'downloading' ? `Downloading AI ${Math.round(lm.downloadProgress * 100)}%` :
               lm.isInitializing ? 'Initializing AI...' :
               !lmInitialized ? 'AI loading...' :
               isEnhancing ? 'Enhancing...' :
               'Translates, improves & auto-fills fields'}
            </Text>
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, isProcessing && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Save Issue</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a1a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a2e',
  },
  backButton: {
    padding: 4,
  },
  backText: {
    color: '#1976d2',
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  visionStatus: {
    fontSize: 12,
    color: '#FF9800',
  },
  visionStatusReady: {
    fontSize: 12,
    color: '#4CAF50',
  },
  photosScroll: {
    marginBottom: 8,
  },
  addPhotoButton: {
    width: 80,
    height: 80,
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#2a2a4a',
    borderStyle: 'dashed',
  },
  addPhotoIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  addPhotoText: {
    fontSize: 12,
    color: '#888',
  },
  photoContainer: {
    position: 'relative',
    marginRight: 12,
  },
  photo: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  removePhotoButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f44336',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removePhotoText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  photoAnalyzing: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoAnalyzed: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoAnalyzedIcon: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxHeight: '90%',
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalPhoto: {
    width: '100%',
    height: 300,
    backgroundColor: '#000',
  },
  analysisContainer: {
    maxHeight: 200,
    padding: 16,
  },
  analysisTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  analysisText: {
    fontSize: 14,
    color: '#ccc',
    lineHeight: 20,
  },
  analyzeButton: {
    backgroundColor: '#1976d2',
    padding: 14,
    margin: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  analyzeButtonDisabled: {
    backgroundColor: '#444',
  },
  analyzeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  closeModalButton: {
    padding: 14,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#2a2a4a',
  },
  closeModalText: {
    color: '#1976d2',
    fontSize: 16,
  },
  textInput: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#fff',
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#1a1a2e',
    borderWidth: 1,
    borderColor: '#2a2a4a',
  },
  typeChipText: {
    color: '#888',
    fontSize: 14,
  },
  typeChipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  severityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  severityButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a4a',
  },
  severityText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '500',
  },
  severityTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  descriptionContainer: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 14,
  },
  descriptionInput: {
    fontSize: 16,
    color: '#fff',
    minHeight: 100,
  },
  enhanceContainer: {
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#2a2a4a',
  },
  enhanceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#9C27B0',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    marginBottom: 8,
  },
  enhanceButtonDisabled: {
    backgroundColor: '#444',
  },
  enhanceButtonIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  enhanceButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  enhanceHint: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
  },
  voiceHint: {
    fontSize: 11,
    color: '#4CAF50',
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  submitButtonDisabled: {
    backgroundColor: '#2a5a2a',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default CaptureScreen;

