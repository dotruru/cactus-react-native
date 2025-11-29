import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { launchCamera, launchImageLibrary, ImagePickerResponse } from 'react-native-image-picker';
import { useCactusLM } from 'cactus-react-native';
import { useLanguage } from '../hooks/useLanguage';
import DatabaseService from '../services/DatabaseService';
import VisionService from '../services/VisionService';
import { theme } from '../config/theme';

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

// Icons as text (could be replaced with react-native-vector-icons)
const Icons = {
  camera: '📷',
  gallery: '🖼',
  sparkle: '✨',
  mic: '🎤',
  close: '✕',
  check: '✓',
  warning: '⚠',
  info: 'ℹ',
  location: '📍',
  tag: '🏷',
  alert: '🔔',
};

const ISSUE_TYPES = [
  { id: 'rebar', label: 'Rebar', icon: '🔩' },
  { id: 'electrical', label: 'Electrical', icon: '⚡' },
  { id: 'plumbing', label: 'Plumbing', icon: '🔧' },
  { id: 'hvac', label: 'HVAC', icon: '❄' },
  { id: 'structural', label: 'Structural', icon: '🏗' },
  { id: 'safety', label: 'Safety', icon: '⚠' },
  { id: 'quality', label: 'Quality', icon: '✓' },
  { id: 'other', label: 'Other', icon: '📝' },
];

const SEVERITY_LEVELS = [
  { id: 'low', label: 'Low', color: theme.colors.status.success },
  { id: 'medium', label: 'Medium', color: theme.colors.status.warning },
  { id: 'high', label: 'High', color: theme.colors.status.error },
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
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  
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

  // Analyze photo with Vision AI - using useCallback to avoid stale closure
  const analyzePhoto = useCallback(async (photoUri: string, photoIndex: number) => {
    console.log('CaptureScreen: analyzePhoto - lmStatus:', lmStatus, 'lmInitialized:', lmInitialized, 'index:', photoIndex);
    
    if (!lmInitialized) {
      Alert.alert('AI Not Ready', 'Please wait for the AI model to initialize.');
      return;
    }

    setIsAnalyzingPhoto(true);
    setPhotos(prev => prev.map((p, i) => 
      i === photoIndex ? { ...p, isAnalyzing: true } : p
    ));

    try {
      const result = await VisionService.analyzePhoto(lm, photoUri, location);
      
      setPhotos(prev => prev.map((p, i) => 
        i === photoIndex ? { ...p, analysis: result.description, isAnalyzing: false } : p
      ));

      const analysisText = (result.description || '').toLowerCase();

      // Auto-detect type from keywords in the analysis
      if (!issueType || issueType === 'other') {
        if (analysisText.includes('electrical') || analysisText.includes('wiring') || analysisText.includes('outlet') || analysisText.includes('circuit') || analysisText.includes('wire')) {
          setIssueType('electrical');
        } else if (analysisText.includes('plumbing') || analysisText.includes('pipe') || analysisText.includes('leak') || analysisText.includes('drain') || analysisText.includes('water') || analysisText.includes('faucet')) {
          setIssueType('plumbing');
        } else if (analysisText.includes('structural') || analysisText.includes('crack') || analysisText.includes('foundation') || analysisText.includes('wall') || analysisText.includes('ceiling') || analysisText.includes('floor') || analysisText.includes('concrete') || analysisText.includes('beam')) {
          setIssueType('structural');
        } else if (analysisText.includes('hvac') || analysisText.includes('heating') || analysisText.includes('cooling') || analysisText.includes('ventilation') || analysisText.includes('duct') || analysisText.includes('air')) {
          setIssueType('hvac');
        } else if (analysisText.includes('safety') || analysisText.includes('hazard') || analysisText.includes('danger') || analysisText.includes('fire') || analysisText.includes('fall') || analysisText.includes('trip')) {
          setIssueType('safety');
        } else if (analysisText.includes('rebar') || analysisText.includes('reinforcement') || analysisText.includes('steel')) {
          setIssueType('rebar');
        } else if (analysisText.includes('quality') || analysisText.includes('finish') || analysisText.includes('paint') || analysisText.includes('surface') || analysisText.includes('cosmetic')) {
          setIssueType('quality');
        }
      }
      
      // Auto-detect severity from keywords
      if (analysisText.includes('critical') || analysisText.includes('immediate') || analysisText.includes('dangerous') || analysisText.includes('urgent') || analysisText.includes('severe')) {
        setSeverity('critical');
      } else if (analysisText.includes('serious') || analysisText.includes('significant') || analysisText.includes('major') || analysisText.includes('large')) {
        setSeverity('high');
      } else if (analysisText.includes('moderate') || analysisText.includes('notable') || analysisText.includes('visible') || analysisText.includes('noticeable')) {
        setSeverity('medium');
      } else if (analysisText.includes('minor') || analysisText.includes('small') || analysisText.includes('cosmetic') || analysisText.includes('slight')) {
        setSeverity('low');
      } else {
        // Default to medium if no severity keywords found
        setSeverity('medium');
      }

      // Set description if empty
      if (result.description && !description) {
        // Clean and shorten the description
        let cleanDesc = result.description
          .replace(/<\|[^>]+\|>/g, '')
          .replace(/\*\*/g, '')
          .replace(/\*/g, '')
          .trim();
        
        // Take first 2-3 sentences
        const sentences = cleanDesc.split(/(?<=[.!?])\s+/);
        cleanDesc = sentences.slice(0, 3).join(' ').trim();
        
        if (cleanDesc.length > 10) {
          setDescription(cleanDesc);
        }
      }
      
      console.log('CaptureScreen: Photo analyzed, fields updated:', {
        type: issueType,
        severity: severity,
        hasDescription: !!result.description
      });
    } catch (error) {
      console.error('Photo analysis error:', error);
      Alert.alert('Analysis Error', 'Could not analyze photo. You can still fill details manually.');
      setPhotos(prev => prev.map((p, i) => 
        i === photoIndex ? { ...p, isAnalyzing: false } : p
      ));
    } finally {
      setIsAnalyzingPhoto(false);
    }
  }, [lmInitialized, lmStatus, lm, location, issueType, description, severity]);

  const handleTakePhoto = async () => {
    if (!(await requestCameraPermission())) {
      Alert.alert('Permission Denied', 'Camera permission is required to take photos.');
      return;
    }
    try {
      const result: ImagePickerResponse = await launchCamera({
        mediaType: 'photo',
        quality: 0.5,
        saveToPhotos: false,
      });
      
      if (result.assets && result.assets[0]?.uri) {
        const newPhotoUri = result.assets[0].uri!;
        const newIndex = photos.length;
        
        setPhotos(prev => [...prev, { uri: newPhotoUri }]);
        
        // Auto-analyze if AI is ready
        if (lmInitialized) {
          console.log('CaptureScreen: Auto-analyzing photo at index:', newIndex);
          // Use setTimeout to ensure state has updated
          setTimeout(() => {
            analyzePhoto(newPhotoUri, newIndex);
          }, 100);
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
        quality: 0.5,
        selectionLimit: 5,
      });
      
      if (result.assets) {
        const startIndex = photos.length;
        const newPhotos: PhotoWithAnalysis[] = result.assets
          .map(a => a.uri!)
          .filter(Boolean)
          .map(uri => ({ uri }));
        
        setPhotos(prev => [...prev, ...newPhotos]);
        
        // Auto-analyze first photo if AI is ready
        if (lmInitialized && newPhotos.length > 0) {
          setTimeout(() => {
            analyzePhoto(newPhotos[0].uri, startIndex);
          }, 100);
        }
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

  // Helper to clean markdown and artifacts
  const cleanText = (text: string) => {
    return text
      .replace(/<\|[^>]+\|>/g, '')  // Remove LLM artifacts
      .replace(/\*\*/g, '')          // Remove bold markdown
      .replace(/\*/g, '')            // Remove italic markdown
      .replace(/#{1,6}\s/g, '')      // Remove heading markdown
      .replace(/`/g, '')             // Remove code markdown
      .replace(/^(Professional report|Report|Summary|Description)[:\s]*/i, '') // Remove prefix
      .trim();
  };

  /**
   * Enhance the description with AI:
   * - Make it concise and professional
   */
  const handleEnhanceDescription = async () => {
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
      
      // Very simple prompt - just ask for a professional rewrite
      const userPrompt = `Rewrite this construction issue report professionally in 1-2 sentences. Be specific about the defect.

Input: "${description}"${photoAnalysis ? `\nPhoto observation: ${photoAnalysis}` : ''}

Professional report:`;

      const result = await lm.complete({
        messages: [
          { role: 'user', content: userPrompt }
        ],
      });

      console.log('CaptureScreen: AI enhancement result:', result.response);

      const response = cleanText(result.response || '');
      
      // Update description with cleaned response
      if (response.length > 10 && response.length < 1000) {
        // Take only first 2-3 sentences
        const sentences = response.split(/(?<=[.!?])\s+/);
        const shortDescription = sentences.slice(0, 3).join(' ').trim();
        if (shortDescription.length > 10) {
          setDescription(shortDescription);
        }
      }

      Alert.alert('Enhanced', 'Description improved!');
    } catch (error) {
      console.error('CaptureScreen: Enhancement error:', error);
      Alert.alert('Error', 'Failed to enhance description. Please try again.');
    } finally {
      setIsEnhancing(false);
    }
  };

  /**
   * Auto-fill type and severity based on description and photo analysis
   */
  const handleAutoFill = async () => {
    const textToAnalyze = description.trim() || photos.find(p => p.analysis)?.analysis || '';
    
    if (!textToAnalyze) {
      Alert.alert('No Content', 'Please add a description or photo first.');
      return;
    }

    setIsAutoFilling(true);

    try {
      const lowerText = textToAnalyze.toLowerCase();
      
      // Auto-detect type from keywords
      if (lowerText.includes('electrical') || lowerText.includes('wiring') || lowerText.includes('outlet') || lowerText.includes('circuit') || lowerText.includes('wire') || lowerText.includes('socket')) {
        setIssueType('electrical');
      } else if (lowerText.includes('plumbing') || lowerText.includes('pipe') || lowerText.includes('leak') || lowerText.includes('drain') || lowerText.includes('water') || lowerText.includes('faucet')) {
        setIssueType('plumbing');
      } else if (lowerText.includes('structural') || lowerText.includes('crack') || lowerText.includes('foundation') || lowerText.includes('wall') || lowerText.includes('ceiling') || lowerText.includes('floor') || lowerText.includes('beam') || lowerText.includes('column')) {
        setIssueType('structural');
      } else if (lowerText.includes('hvac') || lowerText.includes('heating') || lowerText.includes('cooling') || lowerText.includes('ventilation') || lowerText.includes('duct') || lowerText.includes('air condition')) {
        setIssueType('hvac');
      } else if (lowerText.includes('safety') || lowerText.includes('hazard') || lowerText.includes('danger') || lowerText.includes('fire') || lowerText.includes('fall') || lowerText.includes('trip')) {
        setIssueType('safety');
      } else if (lowerText.includes('rebar') || lowerText.includes('reinforcement') || lowerText.includes('concrete') || lowerText.includes('steel')) {
        setIssueType('rebar');
      } else if (lowerText.includes('quality') || lowerText.includes('finish') || lowerText.includes('paint') || lowerText.includes('surface') || lowerText.includes('cosmetic')) {
        setIssueType('quality');
      } else {
        setIssueType('other');
      }
      
      // Auto-detect severity from keywords
      if (lowerText.includes('critical') || lowerText.includes('immediate') || lowerText.includes('dangerous') || lowerText.includes('urgent') || lowerText.includes('severe')) {
        setSeverity('critical');
      } else if (lowerText.includes('serious') || lowerText.includes('significant') || lowerText.includes('major') || lowerText.includes('large')) {
        setSeverity('high');
      } else if (lowerText.includes('moderate') || lowerText.includes('notable') || lowerText.includes('visible') || lowerText.includes('noticeable')) {
        setSeverity('medium');
      } else if (lowerText.includes('minor') || lowerText.includes('small') || lowerText.includes('cosmetic') || lowerText.includes('slight')) {
        setSeverity('low');
      } else {
        setSeverity('medium'); // Default
      }

      Alert.alert('Auto-Filled', 'Type and severity updated based on content!');
    } catch (error) {
      console.error('CaptureScreen: Auto-fill error:', error);
      Alert.alert('Error', 'Failed to auto-fill. Please select manually.');
    } finally {
      setIsAutoFilling(false);
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
        photos: JSON.stringify(photos.map(p => ({ uri: p.uri, analysis: p.analysis }))),
        voiceNotes: '[]',
        actionRequired: '',
        assignedTo: '',
        reportedBy: '',
        deviceId: '',
      });

      Alert.alert(
        'Issue Saved',
        'The issue has been saved locally.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Submit error:', error);
      Alert.alert('Error', `Failed to save issue: ${error}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const selectedPhoto = selectedPhotoIndex !== null ? photos[selectedPhotoIndex] : null;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Report Issue</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Feature Explanation */}
      <View style={styles.explainerBar}>
        <Text style={styles.explainerIcon}>{Icons.info}</Text>
        <Text style={styles.explainerText}>
          Take photos • AI detects issues • Voice input via keyboard mic
        </Text>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }}
      >
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* 1. Photos Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionNumber}>1</Text>
              <View>
                <Text style={styles.sectionTitle}>Add Photos</Text>
                <Text style={styles.sectionSubtitle}>AI will analyze for issues automatically</Text>
              </View>
            </View>
            
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosScroll}>
              <TouchableOpacity 
                style={styles.addPhotoButton} 
                onPress={handleTakePhoto}
                activeOpacity={0.7}
              >
                <Text style={styles.addPhotoIcon}>{Icons.camera}</Text>
                <Text style={styles.addPhotoText}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.addPhotoButton} 
                onPress={handlePickImage}
                activeOpacity={0.7}
              >
                <Text style={styles.addPhotoIcon}>{Icons.gallery}</Text>
                <Text style={styles.addPhotoText}>Gallery</Text>
              </TouchableOpacity>
              {photos.map((photo, index) => (
                <TouchableOpacity 
                  key={index} 
                  style={styles.photoContainer} 
                  onPress={() => handlePhotoPress(index)}
                  activeOpacity={0.8}
                >
                  <Image source={{ uri: photo.uri }} style={styles.photo} />
                  {photo.isAnalyzing && (
                    <View style={styles.photoOverlay}>
                      <ActivityIndicator size="small" color="#fff" />
                      <Text style={styles.analyzingText}>Analyzing...</Text>
                    </View>
                  )}
                  {photo.analysis && !photo.isAnalyzing && (
                    <View style={styles.analyzedBadge}>
                      <Text style={styles.analyzedBadgeText}>{Icons.check}</Text>
                    </View>
                  )}
                  <TouchableOpacity 
                    style={styles.removePhotoButton}
                    onPress={() => handleRemovePhoto(index)}
                  >
                    <Text style={styles.removePhotoText}>{Icons.close}</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            {lmStatus === 'downloading' && (
              <View style={styles.downloadingBar}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text style={styles.downloadingText}>
                  Downloading Vision AI... {Math.round(lm.downloadProgress * 100)}%
                </Text>
              </View>
            )}
          </View>

          {/* 2. Description Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionNumber}>2</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionTitle}>Describe Issue</Text>
                <Text style={styles.sectionSubtitle}>Type or tap {Icons.mic} on keyboard for voice</Text>
              </View>
            </View>
            
            <TextInput
              style={styles.textInput}
              value={description}
              onChangeText={setDescription}
              placeholder="What's the problem? Speak or type here..."
              placeholderTextColor={theme.colors.text.hint}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            
            <View style={styles.aiButtonsRow}>
              <TouchableOpacity 
                style={[
                  styles.enhanceButton, 
                  styles.enhanceButtonHalf,
                  (!lmInitialized || isEnhancing || !description) && styles.enhanceButtonDisabled
                ]}
                onPress={handleEnhanceDescription}
                disabled={!lmInitialized || isEnhancing || !description}
                activeOpacity={0.8}
              >
                {isEnhancing ? (
                  <>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text style={styles.enhanceButtonText}> ...</Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.enhanceButtonIcon}>{Icons.sparkle}</Text>
                    <Text style={styles.enhanceButtonText}>Enhance Text</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity 
                style={[
                  styles.autoFillButton, 
                  (!description && !photos.find(p => p.analysis)) && styles.autoFillButtonDisabled,
                  isAutoFilling && styles.autoFillButtonDisabled
                ]}
                onPress={handleAutoFill}
                disabled={isAutoFilling || (!description && !photos.find(p => p.analysis))}
                activeOpacity={0.8}
              >
                {isAutoFilling ? (
                  <>
                    <ActivityIndicator size="small" color={theme.colors.primary} />
                    <Text style={styles.autoFillButtonText}> ...</Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.autoFillButtonIcon}>{Icons.tag}</Text>
                    <Text style={styles.autoFillButtonText}>Auto-Fill</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* 3. Details Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionNumber}>3</Text>
              <View>
                <Text style={styles.sectionTitle}>Details</Text>
                <Text style={styles.sectionSubtitle}>Auto-filled by AI, tap to change</Text>
              </View>
            </View>
            
            <Text style={styles.fieldLabel}>{Icons.location} Location</Text>
            <TextInput
              style={styles.simpleInput}
              value={location}
              onChangeText={setLocation}
              placeholder="e.g. Zone A, Level 2, Room 101"
              placeholderTextColor={theme.colors.text.hint}
            />

            <Text style={styles.fieldLabel}>{Icons.tag} Issue Type</Text>
            <View style={styles.typeGrid}>
              {ISSUE_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.id}
                  style={[
                    styles.typeChip,
                    issueType === type.id && styles.typeChipActive
                  ]}
                  onPress={() => setIssueType(type.id)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.typeChipIcon}>{type.icon}</Text>
                  <Text style={[
                    styles.typeChipText,
                    issueType === type.id && styles.typeChipTextActive
                  ]}>
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>{Icons.alert} Severity</Text>
            <View style={styles.severityRow}>
              {SEVERITY_LEVELS.map((level) => (
                <TouchableOpacity
                  key={level.id}
                  style={[
                    styles.severityChip,
                    severity === level.id && { backgroundColor: level.color, borderColor: level.color }
                  ]}
                  onPress={() => setSeverity(level.id as any)}
                  activeOpacity={0.7}
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
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom Action Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity 
          style={styles.cancelButton} 
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.saveButton, isProcessing && styles.saveButtonDisabled]} 
          onPress={handleSubmit}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Save Issue</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Photo Modal */}
      <Modal
        visible={selectedPhotoIndex !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedPhotoIndex(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Photo {(selectedPhotoIndex ?? 0) + 1}</Text>
              <TouchableOpacity style={styles.modalClose} onPress={() => setSelectedPhotoIndex(null)}>
                <Text style={styles.modalCloseText}>{Icons.close}</Text>
              </TouchableOpacity>
            </View>
            {selectedPhoto && (
              <>
                <Image source={{ uri: selectedPhoto.uri }} style={styles.modalImage} resizeMode="contain" />
                {selectedPhoto.analysis ? (
                  <View style={styles.modalInfo}>
                    <Text style={styles.modalInfoTitle}>{Icons.check} AI Analysis</Text>
                    <Text style={styles.modalInfoText}>{selectedPhoto.analysis}</Text>
                  </View>
                ) : (
                  <TouchableOpacity 
                    style={styles.analyzeButton}
                    onPress={() => {
                      if (selectedPhotoIndex !== null) {
                        setSelectedPhotoIndex(null);
                        analyzePhoto(selectedPhoto.uri, selectedPhotoIndex);
                      }
                    }}
                    disabled={!lmInitialized}
                  >
                    <Text style={styles.analyzeButtonText}>
                      {lmInitialized ? `${Icons.sparkle} Analyze Photo` : 'AI Loading...'}
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    padding: 4,
  },
  backText: {
    color: theme.colors.text.secondary,
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  saveButtonHeader: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  saveButtonHeaderText: {
    color: '#fff',
    fontWeight: '600',
  },
  explainerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  explainerIcon: {
    fontSize: 16,
  },
  explainerText: {
    fontSize: 13,
    color: theme.colors.primary,
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 20,
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: theme.borderRadius.m,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    ...theme.shadows.card,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  sectionNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 28,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
  photosScroll: {
    flexDirection: 'row',
  },
  addPhotoButton: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#F5F7FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
  },
  addPhotoIcon: {
    fontSize: 28,
    marginBottom: 4,
  },
  addPhotoText: {
    fontSize: 11,
    color: theme.colors.text.secondary,
    fontWeight: '500',
  },
  photoContainer: {
    marginRight: 12,
    position: 'relative',
  },
  photo: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  photoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  analyzingText: {
    color: '#fff',
    fontSize: 10,
    marginTop: 4,
  },
  analyzedBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: theme.colors.status.success,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  analyzedBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  removePhotoButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#fff',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.card,
  },
  removePhotoText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: theme.colors.status.error,
  },
  downloadingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 8,
    backgroundColor: '#F5F7FA',
    borderRadius: 8,
    gap: 8,
  },
  downloadingText: {
    fontSize: 12,
    color: theme.colors.text.secondary,
  },
  textInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: theme.colors.text.primary,
    minHeight: 100,
    marginBottom: 12,
  },
  aiButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  enhanceButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.secondary,
    paddingVertical: 14,
    borderRadius: 12,
  },
  enhanceButtonHalf: {
    flex: 1,
  },
  enhanceButtonDisabled: {
    backgroundColor: '#CFD8DC',
  },
  enhanceButtonIcon: {
    fontSize: 18,
    marginRight: 6,
  },
  enhanceButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  autoFillButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  autoFillButtonDisabled: {
    backgroundColor: '#F5F5F5',
    borderColor: '#CFD8DC',
  },
  autoFillButtonIcon: {
    fontSize: 18,
    marginRight: 6,
  },
  autoFillButtonText: {
    color: theme.colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.secondary,
    marginTop: 16,
    marginBottom: 10,
  },
  simpleInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: theme.colors.text.primary,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: '#fff',
    gap: 6,
  },
  typeChipActive: {
    backgroundColor: '#E3F2FD',
    borderColor: theme.colors.primary,
  },
  typeChipIcon: {
    fontSize: 16,
  },
  typeChipText: {
    color: theme.colors.text.secondary,
    fontSize: 14,
  },
  typeChipTextActive: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  severityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  severityChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  severityText: {
    color: theme.colors.text.secondary,
    fontSize: 14,
    fontWeight: '500',
  },
  severityTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  modalClose: {
    padding: 4,
  },
  modalCloseText: {
    fontSize: 20,
    color: theme.colors.text.secondary,
  },
  modalImage: {
    width: '100%',
    height: 300,
    backgroundColor: '#f0f0f0',
  },
  modalInfo: {
    padding: 16,
    backgroundColor: '#F5F7FA',
  },
  modalInfoTitle: {
    fontWeight: '600',
    marginBottom: 8,
    color: theme.colors.status.success,
    fontSize: 15,
  },
  modalInfoText: {
    color: theme.colors.text.primary,
    lineHeight: 22,
    fontSize: 14,
  },
  analyzeButton: {
    margin: 16,
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  analyzeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomBar: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: 24,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  cancelButtonText: {
    color: theme.colors.text.secondary,
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#CFD8DC',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default CaptureScreen;
