import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DatabaseService, { type Issue } from '../services/DatabaseService';
import { theme } from '../config/theme';

const { width } = Dimensions.get('window');

interface Props {
  navigation: any;
  route: {
    params: {
      issueId: string;
    };
  };
}

const SEVERITY_COLORS = {
  low: theme.colors.status.success,
  medium: theme.colors.status.warning,
  high: theme.colors.status.error,
  critical: '#9C27B0',
};

const TYPE_LABELS: Record<string, string> = {
  rebar: '🔩 Rebar',
  electrical: '⚡ Electrical',
  plumbing: '🔧 Plumbing',
  hvac: '❄️ HVAC',
  structural: '🏗️ Structural',
  safety: '⚠️ Safety',
  quality: '✓ Quality',
  other: '📝 Other',
};

const IssueDetailScreen = ({ navigation, route }: Props) => {
  const { issueId } = route.params;
  const [issue, setIssue] = useState<Issue | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);

  useEffect(() => {
    loadIssue();
  }, [issueId]);

  const loadIssue = async () => {
    try {
      const loadedIssue = await DatabaseService.getIssueById(issueId);
      if (loadedIssue) {
        setIssue(loadedIssue);
        // Parse photos JSON
        try {
          const parsedPhotos = JSON.parse(loadedIssue.photos || '[]');
          setPhotos(parsedPhotos);
        } catch {
          setPhotos([]);
        }
      }
    } catch (error) {
      console.error('Failed to load issue:', error);
      Alert.alert('Error', 'Failed to load issue details');
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Issue',
      'Are you sure you want to delete this issue? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await DatabaseService.deleteIssue(issueId);
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete issue');
            }
          },
        },
      ]
    );
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (!issue) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Issue Details</Text>
          <View style={{ width: 60 }} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Issue Details</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status Banner */}
        <View style={[styles.statusBanner, { backgroundColor: SEVERITY_COLORS[issue.severity] || '#888' }]}>
          <Text style={styles.statusText}>
            {(issue.severity || 'medium').toUpperCase()} PRIORITY
          </Text>
          <View style={styles.syncBadge}>
            <View style={[
              styles.syncDot,
              { backgroundColor: issue.syncStatus === 'synced' ? '#4CAF50' : '#fff' }
            ]} />
            <Text style={styles.syncText}>
              {issue.syncStatus === 'synced' ? 'Synced' : 'Pending Sync'}
            </Text>
          </View>
        </View>

        {/* Photos Section */}
        {photos.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📷 Photos ({photos.length})</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosScroll}>
              {photos.map((uri, index) => (
                <TouchableOpacity 
                  key={index} 
                  onPress={() => setSelectedPhotoIndex(index)}
                  style={styles.photoContainer}
                >
                  <Image source={{ uri }} style={styles.photo} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Full-size Photo Modal */}
        {selectedPhotoIndex !== null && (
          <TouchableOpacity 
            style={styles.photoModal}
            onPress={() => setSelectedPhotoIndex(null)}
            activeOpacity={1}
          >
            <View style={styles.photoModalContent}>
              <Image 
                source={{ uri: photos[selectedPhotoIndex] }} 
                style={styles.fullPhoto}
                resizeMode="contain"
              />
              <Text style={styles.photoModalHint}>Tap anywhere to close</Text>
              <View style={styles.photoNavigation}>
                {selectedPhotoIndex > 0 && (
                  <TouchableOpacity 
                    style={styles.photoNavButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      setSelectedPhotoIndex(selectedPhotoIndex - 1);
                    }}
                  >
                    <Text style={styles.photoNavText}>← Prev</Text>
                  </TouchableOpacity>
                )}
                <Text style={styles.photoCounter}>
                  {selectedPhotoIndex + 1} / {photos.length}
                </Text>
                {selectedPhotoIndex < photos.length - 1 && (
                  <TouchableOpacity 
                    style={styles.photoNavButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      setSelectedPhotoIndex(selectedPhotoIndex + 1);
                    }}
                  >
                    <Text style={styles.photoNavText}>Next →</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </TouchableOpacity>
        )}

        {/* Type & Trade */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏷️ Classification</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Type:</Text>
            <Text style={styles.infoValue}>{TYPE_LABELS[issue.type] || issue.type}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Trade:</Text>
            <Text style={styles.infoValue}>{issue.trade || 'General'}</Text>
          </View>
        </View>

        {/* Location */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📍 Location</Text>
          <Text style={styles.locationText}>{issue.location || 'No location specified'}</Text>
          {issue.zone && (
            <Text style={styles.zoneText}>Zone: {issue.zone}</Text>
          )}
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📝 Description</Text>
          <Text style={styles.descriptionText}>
            {issue.description || 'No description provided'}
          </Text>
          {issue.descriptionOriginal && issue.descriptionOriginal !== issue.description && (
            <View style={styles.originalBox}>
              <Text style={styles.originalLabel}>Original ({issue.descriptionLanguage}):</Text>
              <Text style={styles.originalText}>{issue.descriptionOriginal}</Text>
            </View>
          )}
        </View>

        {/* Action Required */}
        {issue.actionRequired && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⚡ Action Required</Text>
            <Text style={styles.actionText}>{issue.actionRequired}</Text>
          </View>
        )}

        {/* Assignment */}
        {issue.assignedTo && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>👤 Assigned To</Text>
            <Text style={styles.assignedText}>{issue.assignedTo}</Text>
          </View>
        )}

        {/* Metadata */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ℹ️ Details</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Created:</Text>
            <Text style={styles.infoValue}>{formatDate(issue.createdAt)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Updated:</Text>
            <Text style={styles.infoValue}>{formatDate(issue.updatedAt)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>ID:</Text>
            <Text style={styles.infoValueSmall}>{issue.id}</Text>
          </View>
        </View>

        {/* Delete Button */}
        <TouchableOpacity style={styles.deleteButtonBottom} onPress={handleDelete}>
          <Text style={styles.deleteButtonText}>Delete Issue</Text>
        </TouchableOpacity>

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
  deleteButton: {
    padding: 4,
  },
  deleteText: {
    color: theme.colors.status.error,
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: theme.colors.text.secondary,
    fontSize: 16,
  },
  content: {
    flex: 1,
  },
  statusBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  statusText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  syncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  syncDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  syncText: {
    color: '#fff',
    fontSize: 12,
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 12,
  },
  photosScroll: {
    marginHorizontal: -4,
  },
  photoContainer: {
    marginHorizontal: 4,
    borderRadius: 8,
    overflow: 'hidden',
    ...theme.shadows.card,
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 8,
  },
  photoModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.95)',
    zIndex: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoModalContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullPhoto: {
    width: width - 32,
    height: width - 32,
    borderRadius: 8,
  },
  photoModalHint: {
    color: '#fff',
    fontSize: 14,
    marginTop: 16,
  },
  photoNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    gap: 20,
  },
  photoNavButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  photoNavText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  photoCounter: {
    color: '#fff',
    fontSize: 16,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  infoLabel: {
    color: theme.colors.text.secondary,
    fontSize: 14,
    width: 80,
  },
  infoValue: {
    color: theme.colors.text.primary,
    fontSize: 14,
    flex: 1,
  },
  infoValueSmall: {
    color: theme.colors.text.hint,
    fontSize: 12,
    flex: 1,
  },
  locationText: {
    color: theme.colors.text.primary,
    fontSize: 16,
  },
  zoneText: {
    color: theme.colors.text.secondary,
    fontSize: 14,
    marginTop: 4,
  },
  descriptionText: {
    color: theme.colors.text.primary,
    fontSize: 15,
    lineHeight: 24,
  },
  originalBox: {
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  originalLabel: {
    color: theme.colors.text.secondary,
    fontSize: 12,
    marginBottom: 4,
  },
  originalText: {
    color: theme.colors.text.secondary,
    fontSize: 14,
    fontStyle: 'italic',
  },
  actionText: {
    color: theme.colors.status.warning,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
  assignedText: {
    color: theme.colors.status.success,
    fontSize: 15,
    fontWeight: '500',
  },
  deleteButtonBottom: {
    marginTop: 24,
    marginHorizontal: 16,
    backgroundColor: '#FFEBEE',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.status.error,
  },
  deleteButtonText: {
    color: theme.colors.status.error,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default IssueDetailScreen;

