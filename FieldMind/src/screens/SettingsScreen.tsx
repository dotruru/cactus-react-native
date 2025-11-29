import React, { useState, useEffect } from 'react';
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
import { useCactusSTT, useCactusLM } from 'cactus-react-native';
import { useLanguage } from '../hooks/useLanguage';
import { SUPPORTED_LANGUAGES } from '../utils/languageCodes';

interface Props {
  navigation: any;
}

const SettingsScreen = ({ navigation }: Props) => {
  const { currentLanguage, setLanguage } = useLanguage();
  
  // AI Models
  const stt = useCactusSTT({ model: 'whisper-tiny' });
  const lm = useCactusLM({ model: 'qwen3-0.6' });
  
  const [sttReady, setSttReady] = useState(false);
  const [lmReady, setLmReady] = useState(false);
  
  // Settings
  const [autoSync, setAutoSync] = useState(true);
  const [hapticFeedback, setHapticFeedback] = useState(true);
  const [highContrast, setHighContrast] = useState(false);

  const handleDownloadSTT = async () => {
    try {
      await stt.download();
    } catch (e) {
      Alert.alert('Error', 'Failed to download voice model');
    }
  };

  const handleInitSTT = async () => {
    try {
      await stt.init();
      setSttReady(true);
    } catch (e) {
      Alert.alert('Error', 'Failed to initialize voice model');
    }
  };

  const handleDownloadLM = async () => {
    try {
      await lm.download();
    } catch (e) {
      Alert.alert('Error', 'Failed to download language model');
    }
  };

  const handleInitLM = async () => {
    try {
      await lm.init();
      setLmReady(true);
    } catch (e) {
      Alert.alert('Error', 'Failed to initialize language model');
    }
  };

  const getModelStatus = (isDownloading: boolean, isDownloaded: boolean, isInitializing: boolean, isReady: boolean, progress: number) => {
    if (isReady) return { text: 'Ready', color: '#4CAF50' };
    if (isInitializing) return { text: 'Initializing...', color: '#2196F3' };
    if (isDownloading) return { text: `Downloading ${Math.round(progress * 100)}%`, color: '#FF9800' };
    if (isDownloaded) return { text: 'Downloaded', color: '#9E9E9E' };
    return { text: 'Not Downloaded', color: '#f44336' };
  };

  const sttStatus = getModelStatus(stt.isDownloading, stt.isDownloaded, stt.isInitializing, sttReady, stt.downloadProgress);
  const lmStatus = getModelStatus(lm.isDownloading, lm.isDownloaded, lm.isInitializing, lmReady, lm.downloadProgress);

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
        
        {/* STT Model */}
        <View style={styles.card}>
          <View style={styles.modelHeader}>
            <View>
              <Text style={styles.modelName}>Voice Recognition</Text>
              <Text style={styles.modelDescription}>Whisper Tiny (~40MB)</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: sttStatus.color }]}>
              <Text style={styles.statusBadgeText}>{sttStatus.text}</Text>
            </View>
          </View>
          
          <View style={styles.modelActions}>
            {!stt.isDownloaded && !stt.isDownloading && (
              <TouchableOpacity style={styles.actionButton} onPress={handleDownloadSTT}>
                <Text style={styles.actionButtonText}>Download</Text>
              </TouchableOpacity>
            )}
            {stt.isDownloading && (
              <View style={styles.progressContainer}>
                <View style={[styles.progressBar, { width: `${stt.downloadProgress * 100}%` }]} />
              </View>
            )}
            {stt.isDownloaded && !sttReady && !stt.isInitializing && (
              <TouchableOpacity style={styles.actionButton} onPress={handleInitSTT}>
                <Text style={styles.actionButtonText}>Initialize</Text>
              </TouchableOpacity>
            )}
            {stt.isInitializing && (
              <ActivityIndicator size="small" color="#1976d2" />
            )}
          </View>
        </View>

        {/* LM Model */}
        <View style={styles.card}>
          <View style={styles.modelHeader}>
            <View>
              <Text style={styles.modelName}>Language Model</Text>
              <Text style={styles.modelDescription}>Qwen3 0.6B (~400MB)</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: lmStatus.color }]}>
              <Text style={styles.statusBadgeText}>{lmStatus.text}</Text>
            </View>
          </View>
          
          <View style={styles.modelActions}>
            {!lm.isDownloaded && !lm.isDownloading && (
              <TouchableOpacity style={styles.actionButton} onPress={handleDownloadLM}>
                <Text style={styles.actionButtonText}>Download</Text>
              </TouchableOpacity>
            )}
            {lm.isDownloading && (
              <View style={styles.progressContainer}>
                <View style={[styles.progressBar, { width: `${lm.downloadProgress * 100}%` }]} />
              </View>
            )}
            {lm.isDownloaded && !lmReady && !lm.isInitializing && (
              <TouchableOpacity style={styles.actionButton} onPress={handleInitLM}>
                <Text style={styles.actionButtonText}>Initialize</Text>
              </TouchableOpacity>
            )}
            {lm.isInitializing && (
              <ActivityIndicator size="small" color="#1976d2" />
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
              trackColor={{ false: '#333', true: '#1976d2' }}
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
            <Text style={[styles.settingAction, { color: '#f44336' }]}>Clear</Text>
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
              trackColor={{ false: '#333', true: '#1976d2' }}
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
              trackColor={{ false: '#333', true: '#1976d2' }}
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginTop: 20,
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
  },
  cardDescription: {
    fontSize: 14,
    color: '#888',
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
    backgroundColor: '#0a0a1a',
    borderWidth: 1,
    borderColor: '#2a2a4a',
  },
  languageOptionActive: {
    backgroundColor: '#1976d2',
    borderColor: '#1976d2',
  },
  languageNative: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  languageEnglish: {
    fontSize: 12,
    color: '#888',
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
    color: '#fff',
  },
  modelDescription: {
    fontSize: 12,
    color: '#888',
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
    backgroundColor: '#1976d2',
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
    backgroundColor: '#0a0a1a',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#1976d2',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  settingLabel: {
    fontSize: 16,
    color: '#fff',
  },
  settingDescription: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  settingAction: {
    fontSize: 14,
    color: '#1976d2',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#2a2a4a',
    marginVertical: 12,
  },
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  aboutLabel: {
    fontSize: 14,
    color: '#888',
  },
  aboutValue: {
    fontSize: 14,
    color: '#fff',
  },
});

export default SettingsScreen;

