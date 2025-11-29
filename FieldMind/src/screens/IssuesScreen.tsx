import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import DatabaseService, { type Issue } from '../services/DatabaseService';

interface Props {
  navigation: any;
}

const SEVERITY_COLORS = {
  low: '#4CAF50',
  medium: '#FF9800',
  high: '#f44336',
  critical: '#9C27B0',
};

const TYPE_ICONS: Record<string, string> = {
  rebar: '🔩',
  electrical: '⚡',
  plumbing: '🔧',
  hvac: '❄️',
  structural: '🏗️',
  safety: '⚠️',
  quality: '✓',
  other: '📝',
};

const IssuesScreen = ({ navigation }: Props) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadIssues = useCallback(async () => {
    try {
      const dbIssues = await DatabaseService.getIssues();
      setIssues(dbIssues);
    } catch (error) {
      console.error('Failed to load issues:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Load issues when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadIssues();
    }, [loadIssues])
  );

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadIssues();
  };

  const handleDeleteIssue = (issue: Issue) => {
    Alert.alert(
      'Delete Issue',
      'Are you sure you want to delete this issue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await DatabaseService.deleteIssue(issue.id);
              loadIssues();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete issue');
            }
          },
        },
      ]
    );
  };

  const filteredIssues = issues.filter(issue => {
    const matchesSearch = issue.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         issue.location?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = !filterType || issue.type === filterType;
    return matchesSearch && matchesFilter;
  });

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const getPhotoCount = (photosJson: string): number => {
    try {
      const photos = JSON.parse(photosJson || '[]');
      return photos.length;
    } catch {
      return 0;
    }
  };

  const renderIssue = ({ item }: { item: Issue }) => (
    <TouchableOpacity 
      style={styles.issueCard}
      onPress={() => navigation.navigate('IssueDetail', { issueId: item.id })}
      onLongPress={() => handleDeleteIssue(item)}
    >
      <View style={styles.issueHeader}>
        <View style={styles.issueTypeContainer}>
          <Text style={styles.issueTypeIcon}>{TYPE_ICONS[item.type] || '📝'}</Text>
          <View style={[styles.severityBadge, { backgroundColor: SEVERITY_COLORS[item.severity] || '#888' }]}>
            <Text style={styles.severityText}>{(item.severity || 'medium').toUpperCase()}</Text>
          </View>
        </View>
        <View style={styles.issueStatus}>
          <View style={[
            styles.syncDot,
            { backgroundColor: item.syncStatus === 'synced' ? '#4CAF50' : '#FF9800' }
          ]} />
          <Text style={styles.syncText}>
            {item.syncStatus === 'synced' ? 'Synced' : 'Pending'}
          </Text>
        </View>
      </View>
      
      <Text style={styles.issueLocation}>📍 {item.location || 'No location'}</Text>
      <Text style={styles.issueDescription} numberOfLines={2}>
        {item.description || 'No description'}
      </Text>
      
      <View style={styles.issueFooter}>
        <Text style={styles.issueTime}>{formatTime(item.createdAt)}</Text>
        {getPhotoCount(item.photos) > 0 && (
          <Text style={styles.photoCount}>📷 {getPhotoCount(item.photos)}</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const pendingCount = issues.filter(i => i.syncStatus === 'pending').length;
  const highPriorityCount = issues.filter(i => i.severity === 'high' || i.severity === 'critical').length;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Issues</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => navigation.navigate('Capture')}
        >
          <Text style={styles.addButtonText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search issues..."
          placeholderTextColor="#666"
        />
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <TouchableOpacity
          style={[styles.filterChip, !filterType && styles.filterChipActive]}
          onPress={() => setFilterType(null)}
        >
          <Text style={[styles.filterText, !filterType && styles.filterTextActive]}>All</Text>
        </TouchableOpacity>
        {Object.entries(TYPE_ICONS).slice(0, 5).map(([type, icon]) => (
          <TouchableOpacity
            key={type}
            style={[styles.filterChip, filterType === type && styles.filterChipActive]}
            onPress={() => setFilterType(filterType === type ? null : type)}
          >
            <Text style={[styles.filterText, filterType === type && styles.filterTextActive]}>
              {icon}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{issues.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#FF9800' }]}>{pendingCount}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#f44336' }]}>{highPriorityCount}</Text>
          <Text style={styles.statLabel}>High Priority</Text>
        </View>
      </View>

      {/* Issues List */}
      <FlatList
        data={filteredIssues}
        renderItem={renderIssue}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#1976d2"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>
              {isLoading ? 'Loading...' : 'No issues found'}
            </Text>
            <Text style={styles.emptyText}>
              {searchQuery || filterType 
                ? 'Try adjusting your search or filters'
                : 'Tap "+ New" to capture your first issue'}
            </Text>
          </View>
        }
      />

      {/* Long press hint */}
      {issues.length > 0 && (
        <View style={styles.hintBar}>
          <Text style={styles.hintText}>Long press an issue to delete</Text>
        </View>
      )}
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
  addButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  searchContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  searchInput: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: '#fff',
  },
  filtersContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#1a1a2e',
  },
  filterChipActive: {
    backgroundColor: '#1976d2',
  },
  filterText: {
    color: '#888',
    fontSize: 14,
  },
  filterTextActive: {
    color: '#fff',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  statItem: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  issueCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  issueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  issueTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  issueTypeIcon: {
    fontSize: 20,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  severityText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  issueStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  syncDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  syncText: {
    fontSize: 12,
    color: '#888',
  },
  issueLocation: {
    fontSize: 14,
    color: '#888',
    marginBottom: 6,
  },
  issueDescription: {
    fontSize: 15,
    color: '#ddd',
    lineHeight: 22,
  },
  issueFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#2a2a4a',
  },
  issueTime: {
    fontSize: 12,
    color: '#666',
  },
  photoCount: {
    fontSize: 12,
    color: '#888',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
  hintBar: {
    padding: 8,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#1a1a2e',
  },
  hintText: {
    fontSize: 12,
    color: '#666',
  },
});

export default IssuesScreen;
