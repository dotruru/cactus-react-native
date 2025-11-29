import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCactusLM } from 'cactus-react-native';
import { useLanguage } from '../hooks/useLanguage';
import { SUPPORTED_LANGUAGES } from '../utils/languageCodes';
import { theme } from '../config/theme';

interface Props {
  navigation: any;
}

const SettingsScreen = ({ navigation }: Props) => {
  const { currentLanguage, setLanguage } = useLanguage();
  
  // Vision Model (Capture)
  const visionLm = useCactusLM({ model: 'lfm2-vl-450m' });
  // RAG Model (Query)
  const ragLm = useCactusLM({ model: 'lfm2-1.2b-rag' });
  
  const [visionReady, setVisionReady] = useState(false);
  const [ragReady, setRagReady] = useState(false);
  
  // Settings
  const [autoSync, setAutoSync] = useState(true);
  const [hapticFeedback, setHapticFeedback] = useState(true);
  const [highContrast, setHighContrast] = useState(false);

  const handleDownloadVision = async () => {
    try {
      await visionLm.download();
    } catch (e) {
      Alert.alert('Error', 'Failed to download vision model');
    }
  };

  const handleInitVision = async () => {
    try {
      await visionLm.init();
      setVisionReady(true);
    } catch (e) {
      Alert.alert('Error', 'Failed to initialize vision model');
    }
  };

  const handleDownloadRAG = async () => {
    try {
      await ragLm.download();
    } catch (e) {
      Alert.alert('Error', 'Failed to download RAG model');
    }
  };

  const handleInitRAG = async () => {
    try {
      await ragLm.init();
      setRagReady(true);
    } catch (e) {
      Alert.alert('Error', 'Failed to initialize RAG model');
    }
  };

  const getModelStatus = (isDownloading: boolean, isDownloaded: boolean, isInitializing: boolean, isReady: boolean, progress: number) => {
    if (isReady) return { text: 'Ready', color: theme.colors.status.success };
    if (isInitializing) return { text: 'Initializing...', color: theme.colors.status.info };
    if (isDownloading) return { text: `Downloading ${Math.round(progress * 100)}%`, color: theme.colors.status.warning };
    if (isDownloaded) return { text: 'Downloaded', color: theme.colors.text.secondary };
    return { text: 'Not Downloaded', color: theme.colors.status.error };
  };

  const visionStatus = getModelStatus(visionLm.isDownloading, visionLm.isDownloaded, visionLm.isInitializing, visionReady, visionLm.downloadProgress);
  const ragStatus = getModelStatus(ragLm.isDownloading, ragLm.isDownloaded, ragLm.isInitializing, ragReady, ragLm.downloadProgress);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Language Section */}
        <Text style={styles.sectionTitle}>🌐 Language</Text>
        <View style={styles.card}>
          <Text style={styles.cardDescription}>
            Select your preferred language for voice input and responses.
          </Text>
          <View style={styles.languageGrid}>
            {Object.entries(SUPPORTED_LANGUAGES).map(([code, lang]) => (
              <TouchableOpacity
                key={code}
                style={[
                  styles.languageOption,
                  currentLanguage === code && styles.languageOptionActive
                ]}
                onPress={() => setLanguage(code)}
              >
                <Text style={[
                  styles.languageNative,
                  currentLanguage === code && styles.languageTextActive
                ]}>
                  {lang.nativeName}
                </Text>
                <Text style={[
                  styles.languageEnglish,
                  currentLanguage === code && styles.languageTextActive
                ]}>
                  {lang.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* AI Models Section */}
        <Text style={styles.sectionTitle}>🤖 AI Models</Text>
        
        {/* Vision Model */}
        <View style={styles.card}>
          <View style={styles.modelHeader}>
            <View>
              <Text style={styles.modelName}>Vision & Enhance</Text>
              <Text style={styles.modelDescription}>lfm2-vl-450m (~450MB)</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: visionStatus.color }]}>
              <Text style={styles.statusBadgeText}>{visionStatus.text}</Text>
            </View>
          </View>
          
          <View style={styles.modelActions}>
            {!visionLm.isDownloaded && !visionLm.isDownloading && (
              <TouchableOpacity style={styles.actionButton} onPress={handleDownloadVision}>
                <Text style={styles.actionButtonText}>Download</Text>
              </TouchableOpacity>
            )}
            {visionLm.isDownloading && (
              <View style={styles.progressContainer}>
                <View style={[styles.progressBar, { width: `${visionLm.downloadProgress * 100}%` }]} />
              </View>
            )}
            {visionLm.isDownloaded && !visionReady && !visionLm.isInitializing && (
              <TouchableOpacity style={styles.actionButton} onPress={handleInitVision}>
                <Text style={styles.actionButtonText}>Initialize</Text>
              </TouchableOpacity>
            )}
            {visionLm.isInitializing && (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            )}
          </View>
        </View>

        {/* RAG Model */}
        <View style={styles.card}>
          <View style={styles.modelHeader}>
            <View>
              <Text style={styles.modelName}>Spec Lookup (RAG)</Text>
              <Text style={styles.modelDescription}>lfm2-1.2b-rag (~800MB)</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: ragStatus.color }]}>
              <Text style={styles.statusBadgeText}>{ragStatus.text}</Text>
            </View>
          </View>
          
          <View style={styles.modelActions}>
            {!ragLm.isDownloaded && !ragLm.isDownloading && (
              <TouchableOpacity style={styles.actionButton} onPress={handleDownloadRAG}>
                <Text style={styles.actionButtonText}>Download</Text>
              </TouchableOpacity>
            )}
            {ragLm.isDownloading && (
              <View style={styles.progressContainer}>
                <View style={[styles.progressBar, { width: `${ragLm.downloadProgress * 100}%` }]} />
              </View>
            )}
            {ragLm.isDownloaded && !ragReady && !ragLm.isInitializing && (
              <TouchableOpacity style={styles.actionButton} onPress={handleInitRAG}>
                <Text style={styles.actionButtonText}>Initialize</Text>
              </TouchableOpacity>
            )}
            {ragLm.isInitializing && (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            )}
          </View>
        </View>

        {/* Sync Section */}
        <Text style={styles.sectionTitle}>📡 Sync & Data</Text>
        <View style={styles.card}>
          <View style={styles.settingRow}>
            <View>
              <Text style={styles.settingLabel}>Auto Sync</Text>
              <Text style={styles.settingDescription}>Sync issues when connected</Text>
            </View>
            <Switch
              value={autoSync}
              onValueChange={setAutoSync}
              trackColor={{ false: '#333', true: theme.colors.primary }}
              thumbColor="#fff"
            />
          </View>
          
          <View style={styles.divider} />
          
          <TouchableOpacity style={styles.settingRow}>
            <View>
              <Text style={styles.settingLabel}>Sync Now</Text>
              <Text style={styles.settingDescription}>0 items pending</Text>
            </View>
            <Text style={styles.settingAction}>Sync</Text>
          </TouchableOpacity>
          
          <View style={styles.divider} />
          
          <TouchableOpacity style={styles.settingRow}>
            <View>
              <Text style={styles.settingLabel}>Clear Local Data</Text>
              <Text style={styles.settingDescription}>Remove all local issues</Text>
            </View>
            <Text style={[styles.settingAction, { color: theme.colors.status.error }]}>Clear</Text>
          </TouchableOpacity>
        </View>

        {/* Accessibility Section */}
        <Text style={styles.sectionTitle}>♿ Accessibility</Text>
        <View style={styles.card}>
          <View style={styles.settingRow}>
            <View>
              <Text style={styles.settingLabel}>Haptic Feedback</Text>
              <Text style={styles.settingDescription}>Vibrate on actions</Text>
            </View>
            <Switch
              value={hapticFeedback}
              onValueChange={setHapticFeedback}
              trackColor={{ false: '#333', true: theme.colors.primary }}
              thumbColor="#fff"
            />
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.settingRow}>
            <View>
              <Text style={styles.settingLabel}>High Contrast</Text>
              <Text style={styles.settingDescription}>Increase text contrast</Text>
            </View>
            <Switch
              value={highContrast}
              onValueChange={setHighContrast}
              trackColor={{ false: '#333', true: theme.colors.primary }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* About Section */}
        <Text style={styles.sectionTitle}>ℹ️ About</Text>
        <View style={styles.card}>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>Version</Text>
            <Text style={styles.aboutValue}>1.0.0</Text>
          </View>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>Powered by</Text>
            <Text style={styles.aboutValue}>cactus-react-native</Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
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
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
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
  content: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginTop: 20,
    marginBottom: 12,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    ...theme.shadows.card,
  },
  cardDescription: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginBottom: 16,
  },
  languageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  languageOption: {
    width: '48%',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#F5F7FA',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  languageOptionActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  languageNative: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  languageEnglish: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
  languageTextActive: {
    color: '#fff',
  },
  modelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  modelName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  modelDescription: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
  },
  modelActions: {
    marginTop: 16,
    alignItems: 'flex-start',
  },
  actionButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  progressContainer: {
    width: '100%',
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: theme.colors.primary,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  settingLabel: {
    fontSize: 16,
    color: theme.colors.text.primary,
  },
  settingDescription: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
  settingAction: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 12,
  },
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  aboutLabel: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  aboutValue: {
    fontSize: 14,
    color: theme.colors.text.primary,
  },
});

export default SettingsScreen;

