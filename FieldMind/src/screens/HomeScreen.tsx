import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCactusSTT } from 'cactus-react-native';
import { useLanguage } from '../hooks/useLanguage';
import { SUPPORTED_LANGUAGES } from '../utils/languageCodes';

type ModelStatus = 'not_downloaded' | 'downloading' | 'downloaded' | 'initializing' | 'ready' | 'error';

interface Props {
  navigation: any;
}

const HomeScreen = ({ navigation }: Props) => {
  const { currentLanguage, setLanguage } = useLanguage();
  const stt = useCactusSTT({ model: 'whisper-tiny' });
  
  const [sttStatus, setSttStatus] = useState<ModelStatus>('not_downloaded');
  const [sttReady, setSttReady] = useState(false);

  useEffect(() => {
    if (stt.error) {
      setSttStatus('error');
    } else if (stt.isInitializing) {
      setSttStatus('initializing');
    } else if (stt.isDownloaded && sttReady) {
      setSttStatus('ready');
    } else if (stt.isDownloaded) {
      setSttStatus('downloaded');
    } else if (stt.isDownloading) {
      setSttStatus('downloading');
    } else {
      setSttStatus('not_downloaded');
    }
  }, [stt.isDownloading, stt.isDownloaded, stt.isInitializing, stt.error, sttReady]);

  const handleSetupAI = async () => {
    if (sttStatus === 'not_downloaded') {
      await stt.download();
    } else if (sttStatus === 'downloaded') {
      try {
        await stt.init();
        setSttReady(true);
      } catch (e) {
        console.error('Init failed:', e);
      }
    }
  };

  const getStatusColor = () => {
    switch (sttStatus) {
      case 'ready': return '#4CAF50';
      case 'downloading':
      case 'initializing': return '#FF9800';
      case 'error': return '#f44336';
      default: return '#9E9E9E';
    }
  };

  const getStatusText = () => {
    switch (sttStatus) {
      case 'ready': return 'AI Ready';
      case 'downloading': return `Downloading ${Math.round(stt.downloadProgress * 100)}%`;
      case 'downloaded': return 'Tap to Initialize';
      case 'initializing': return 'Initializing...';
      case 'error': return 'Error';
      default: return 'Setup Required';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a1a" />
      
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>FieldMind</Text>
          <Text style={styles.subtitle}>AI Field Assistant</Text>
        </View>
        <TouchableOpacity 
          style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}
          onPress={handleSetupAI}
        >
          {(sttStatus === 'downloading' || sttStatus === 'initializing') && (
            <ActivityIndicator size="small" color="#fff" style={{ marginRight: 6 }} />
          )}
          <Text style={styles.statusText}>{getStatusText()}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity 
            style={[styles.actionCard, styles.actionQuery]}
            onPress={() => navigation.navigate('Query')}
          >
            <Text style={styles.actionIcon}>🔍</Text>
            <Text style={styles.actionTitle}>Spec Lookup</Text>
            <Text style={styles.actionDesc}>Ask questions about specs & drawings</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionCard, styles.actionCapture]}
            onPress={() => navigation.navigate('Capture')}
          >
            <Text style={styles.actionIcon}>📸</Text>
            <Text style={styles.actionTitle}>Capture Issue</Text>
            <Text style={styles.actionDesc}>Report issues with voice & photo</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionCard, styles.actionIssues]}
            onPress={() => navigation.navigate('Issues')}
          >
            <Text style={styles.actionIcon}>📋</Text>
            <Text style={styles.actionTitle}>View Issues</Text>
            <Text style={styles.actionDesc}>Browse captured issues</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionCard, styles.actionSharing]}
            onPress={() => navigation.navigate('Sharing')}
          >
            <Text style={styles.actionIcon}>📡</Text>
            <Text style={styles.actionTitle}>P2P Sharing</Text>
            <Text style={styles.actionDesc}>Share issues with nearby devices</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionCard, styles.actionSettings]}
            onPress={() => navigation.navigate('Settings')}
          >
            <Text style={styles.actionIcon}>⚙️</Text>
            <Text style={styles.actionTitle}>Settings</Text>
            <Text style={styles.actionDesc}>Language, models & sync</Text>
          </TouchableOpacity>
        </View>

        {/* Language Selection */}
        <Text style={styles.sectionTitle}>Your Language</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.languageScroll}>
          {Object.entries(SUPPORTED_LANGUAGES).map(([code, lang]) => (
            <TouchableOpacity
              key={code}
              style={[
                styles.languageChip,
                currentLanguage === code && styles.languageChipActive
              ]}
              onPress={() => setLanguage(code)}
            >
              <Text style={[
                styles.languageChipText,
                currentLanguage === code && styles.languageChipTextActive
              ]}>
                {lang.nativeName}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Status Cards */}
        <Text style={styles.sectionTitle}>System Status</Text>
        <View style={styles.statusCards}>
          <View style={styles.statusCard}>
            <Text style={styles.statusCardIcon}>🎤</Text>
            <View style={styles.statusCardContent}>
              <Text style={styles.statusCardTitle}>Voice Recognition</Text>
              <Text style={[styles.statusCardValue, { color: sttReady ? '#4CAF50' : '#FF9800' }]}>
                {sttReady ? 'Ready' : 'Not Ready'}
              </Text>
            </View>
          </View>

          <View style={styles.statusCard}>
            <Text style={styles.statusCardIcon}>📡</Text>
            <View style={styles.statusCardContent}>
              <Text style={styles.statusCardTitle}>Sync Status</Text>
              <Text style={[styles.statusCardValue, { color: '#4CAF50' }]}>Offline Mode</Text>
            </View>
          </View>

          <View style={styles.statusCard}>
            <Text style={styles.statusCardIcon}>📍</Text>
            <View style={styles.statusCardContent}>
              <Text style={styles.statusCardTitle}>Current Zone</Text>
              <Text style={styles.statusCardValue}>Not Set</Text>
            </View>
          </View>
        </View>

        {/* Info Box */}
        {!sttReady && (
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>🚀 Getting Started</Text>
            <Text style={styles.infoText}>
              1. Tap the status badge above to download & initialize AI{'\n'}
              2. Select your preferred language{'\n'}
              3. Use Spec Lookup or Capture Issue to get started
            </Text>
          </View>
        )}

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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a2e',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginTop: 24,
    marginBottom: 12,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    width: '47%',
    padding: 16,
    borderRadius: 16,
    minHeight: 120,
  },
  actionQuery: {
    backgroundColor: '#1a237e',
  },
  actionCapture: {
    backgroundColor: '#b71c1c',
  },
  actionIssues: {
    backgroundColor: '#004d40',
  },
  actionSharing: {
    backgroundColor: '#6a1b9a',
  },
  actionSettings: {
    backgroundColor: '#37474f',
  },
  actionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  actionDesc: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  languageScroll: {
    marginBottom: 8,
  },
  languageChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#1a1a2e',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#2a2a4a',
  },
  languageChipActive: {
    backgroundColor: '#1976d2',
    borderColor: '#1976d2',
  },
  languageChipText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '500',
  },
  languageChipTextActive: {
    color: '#fff',
  },
  statusCards: {
    gap: 8,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    padding: 16,
    borderRadius: 12,
  },
  statusCardIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  statusCardContent: {
    flex: 1,
  },
  statusCardTitle: {
    fontSize: 14,
    color: '#888',
  },
  statusCardValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginTop: 2,
  },
  infoBox: {
    backgroundColor: '#1a237e',
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 22,
  },
});

export default HomeScreen;
