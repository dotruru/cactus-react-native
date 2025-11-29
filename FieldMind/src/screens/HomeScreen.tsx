import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguage } from '../hooks/useLanguage';
import { SUPPORTED_LANGUAGES } from '../utils/languageCodes';
import { theme } from '../config/theme';

// Icons (text-based, could be replaced with react-native-vector-icons)
const Icons = {
  camera: '📸',
  search: '🔍',
  list: '📋',
  sync: '📡',
  settings: '⚙',
  offline: '✓',
  ai: '✨',
};

interface Props {
  navigation: any;
}

const HomeScreen = ({ navigation }: Props) => {
  const { currentLanguage, setLanguage } = useLanguage();
  
  // Get greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getDate = () => {
    return new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  // Feature cards with explanations
  const features = [
    {
      id: 'query',
      screen: 'Query',
      icon: Icons.search,
      iconBg: '#E3F2FD',
      title: 'Spec Lookup',
      subtitle: 'Ask questions',
      description: 'AI searches your project documents and answers in your language. Works offline.',
    },
    {
      id: 'issues',
      screen: 'Issues',
      icon: Icons.list,
      iconBg: '#E8F5E9',
      title: 'My Issues',
      subtitle: 'View all reports',
      description: 'See all captured issues, photos, and sync status. Tap to view details.',
    },
    {
      id: 'sharing',
      screen: 'Sharing',
      icon: Icons.sync,
      iconBg: '#F3E5F5',
      title: 'Team Sync',
      subtitle: 'Share offline',
      description: 'Send issues to nearby devices using WiFi Direct. No internet needed.',
    },
    {
      id: 'settings',
      screen: 'Settings',
      icon: Icons.settings,
      iconBg: '#ECEFF1',
      title: 'Settings',
      subtitle: 'Preferences',
      description: 'Manage AI models, language, sync options, and accessibility.',
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background} />
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.subtitle}>{getDate()}</Text>
            <Text style={styles.title}>{getGreeting()}</Text>
          </View>
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>FM</Text>
          </View>
        </View>

        {/* AI Status Badge */}
        <View style={styles.aiBadge}>
          <Text style={styles.aiBadgeIcon}>{Icons.ai}</Text>
          <Text style={styles.aiBadgeText}>AI Ready • All features work offline</Text>
        </View>

        {/* Main Action - Capture Issue */}
        <TouchableOpacity 
          style={styles.mainActionCard}
          onPress={() => navigation.navigate('Capture')}
          activeOpacity={0.9}
        >
          <View style={styles.mainActionContent}>
            <Text style={styles.mainActionTitle}>Report New Issue</Text>
            <Text style={styles.mainActionSubtitle}>
              Take photo {Icons.camera} • AI detects problems • Voice input
            </Text>
            <View style={styles.mainActionFeatures}>
              <View style={styles.featureTag}>
                <Text style={styles.featureTagText}>Vision AI</Text>
              </View>
              <View style={styles.featureTag}>
                <Text style={styles.featureTagText}>Auto-fill</Text>
              </View>
            </View>
          </View>
          <View style={styles.mainActionIconContainer}>
            <Text style={styles.mainActionIcon}>{Icons.camera}</Text>
          </View>
        </TouchableOpacity>

        {/* Feature Cards */}
        <Text style={styles.sectionTitle}>Tools</Text>
        <View style={styles.featureList}>
          {features.map((feature) => (
            <TouchableOpacity 
              key={feature.id}
              style={styles.featureCard}
              onPress={() => navigation.navigate(feature.screen)}
              activeOpacity={0.7}
            >
              <View style={[styles.featureIconContainer, { backgroundColor: feature.iconBg }]}>
                <Text style={styles.featureIcon}>{feature.icon}</Text>
              </View>
              <View style={styles.featureContent}>
                <View style={styles.featureHeader}>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  <Text style={styles.featureSubtitle}>{feature.subtitle}</Text>
                </View>
                <Text style={styles.featureDescription}>{feature.description}</Text>
              </View>
              <Text style={styles.featureArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Language Selector */}
        <Text style={styles.sectionTitle}>Language / Idioma</Text>
        <Text style={styles.sectionHint}>AI will respond in your selected language</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.langScroll}
          contentContainerStyle={styles.langScrollContent}
        >
          {Object.entries(SUPPORTED_LANGUAGES).map(([code, lang]) => (
            <TouchableOpacity
              key={code}
              style={[
                styles.langChip,
                currentLanguage === code && styles.langChipActive
              ]}
              onPress={() => setLanguage(code)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.langText,
                currentLanguage === code && styles.langTextActive
              ]}>
                {lang.nativeName}
              </Text>
              {currentLanguage === code && (
                <Text style={styles.langCheck}>{Icons.offline}</Text>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Sync Status Footer */}
        <View style={styles.footer}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>Offline Mode • All data stored locally</Text>
        </View>
        
        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.l,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing.l,
    marginBottom: theme.spacing.m,
  },
  title: {
    ...theme.typography.h1,
    color: theme.colors.text.primary,
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.text.secondary,
    fontWeight: '500',
    textTransform: 'uppercase',
    fontSize: 12,
    marginBottom: 4,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.card,
  },
  avatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: theme.spacing.l,
    gap: 6,
  },
  aiBadgeIcon: {
    fontSize: 14,
  },
  aiBadgeText: {
    fontSize: 13,
    color: theme.colors.status.success,
    fontWeight: '500',
  },
  mainActionCard: {
    backgroundColor: theme.colors.secondary,
    borderRadius: theme.borderRadius.l,
    padding: theme.spacing.l,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xl,
    ...theme.shadows.float,
  },
  mainActionContent: {
    flex: 1,
  },
  mainActionTitle: {
    ...theme.typography.h2,
    color: '#fff',
    marginBottom: 6,
  },
  mainActionSubtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    marginBottom: 10,
  },
  mainActionFeatures: {
    flexDirection: 'row',
    gap: 8,
  },
  featureTag: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  featureTagText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  mainActionIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainActionIcon: {
    fontSize: 28,
  },
  sectionTitle: {
    ...theme.typography.h3,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.s,
  },
  sectionHint: {
    fontSize: 13,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.m,
  },
  featureList: {
    marginBottom: theme.spacing.xl,
    gap: 12,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.m,
    padding: theme.spacing.m,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    ...theme.shadows.card,
  },
  featureIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  featureIcon: {
    fontSize: 22,
  },
  featureContent: {
    flex: 1,
  },
  featureHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 4,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  featureSubtitle: {
    fontSize: 12,
    color: theme.colors.text.hint,
  },
  featureDescription: {
    fontSize: 13,
    color: theme.colors.text.secondary,
    lineHeight: 18,
  },
  featureArrow: {
    fontSize: 24,
    color: theme.colors.text.hint,
    marginLeft: 8,
  },
  langScroll: {
    marginBottom: theme.spacing.xl,
  },
  langScrollContent: {
    paddingVertical: 4,
  },
  langChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    marginRight: 10,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    gap: 6,
  },
  langChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  langText: {
    color: theme.colors.text.secondary,
    fontWeight: '500',
    fontSize: 14,
  },
  langTextActive: {
    color: '#fff',
  },
  langCheck: {
    color: '#fff',
    fontSize: 14,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 'auto',
    paddingVertical: theme.spacing.m,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.status.success,
    marginRight: 8,
  },
  statusText: {
    color: theme.colors.text.secondary,
    fontSize: 12,
    fontWeight: '500',
  },
});

export default HomeScreen;
