import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import P2PService, { type P2PPeer, type P2PMessage } from '../services/P2PService';
import DatabaseService from '../services/DatabaseService';

interface Props {
  navigation: any;
}

type ConnectionStatus = 'disconnected' | 'discovering' | 'connecting' | 'connected' | 'hosting' | 'hosting_waiting';

const SharingScreen = ({ navigation }: Props) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [peers, setPeers] = useState<P2PPeer[]>([]);
  const [connectionInfo, setConnectionInfo] = useState<any>(null);
  const [receivedCount, setReceivedCount] = useState(0);
  const [sentCount, setSentCount] = useState(0);
  const [lastMessage, setLastMessage] = useState<string>('');
  const [issueCount, setIssueCount] = useState(0);

  // Initialize P2P on mount
  useEffect(() => {
    initP2P();
    loadIssueCount();

    return () => {
      // Cleanup on unmount
      P2PService.stopDiscovery().catch(() => {});
      P2PService.leaveGroup().catch(() => {});
    };
  }, []);

  // Subscribe to P2P events
  useEffect(() => {
    if (!isInitialized) return;

    const unsubPeers = P2PService.onPeersChanged((newPeers) => {
      setPeers(newPeers);
    });

    const unsubConnection = P2PService.onConnectionChanged((info) => {
      setConnectionInfo(info);
      if (info?.groupFormed) {
        if (info.isGroupOwner) {
          // Check if we have a connected client
          setStatus(P2PService.canSendMessages() ? 'hosting' : 'hosting_waiting');
        } else {
          setStatus('connected');
        }
      }
    });

    const unsubMessage = P2PService.onMessage((message, from) => {
      setReceivedCount(c => c + 1);
      setLastMessage(`${message.type} from ${from}`);
      
      if (message.type === 'issue') {
        loadIssueCount(); // Refresh count when new issue received
      }
    });

    return () => {
      unsubPeers();
      unsubConnection();
      unsubMessage();
    };
  }, [isInitialized]);

  // Refresh issue count when screen focused
  useFocusEffect(
    useCallback(() => {
      loadIssueCount();
    }, [])
  );

  const initP2P = async () => {
    const success = await P2PService.init();
    setIsInitialized(success);
    if (!success) {
      Alert.alert('P2P Error', 'Failed to initialize WiFi Direct. Make sure WiFi is enabled and permissions are granted.');
    }
  };

  const loadIssueCount = async () => {
    const count = await DatabaseService.getIssueCount();
    setIssueCount(count);
  };

  const handleStartDiscovery = async () => {
    try {
      setStatus('discovering');
      await P2PService.startDiscovery();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to start discovery');
      setStatus('disconnected');
    }
  };

  const handleStopDiscovery = async () => {
    await P2PService.stopDiscovery();
    setStatus('disconnected');
    setPeers([]);
  };

  const handleCreateGroup = async () => {
    try {
      setStatus('hosting');
      await P2PService.createGroupAsHost();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create group');
      setStatus('disconnected');
    }
  };

  const handleLeaveGroup = async () => {
    await P2PService.leaveGroup();
    setStatus('disconnected');
    setConnectionInfo(null);
  };

  const handleConnectToPeer = async (peer: P2PPeer) => {
    try {
      setStatus('connecting');
      await P2PService.connectToPeer(peer.deviceAddress);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to connect');
      setStatus('disconnected');
    }
  };

  const handleBroadcastIssues = async () => {
    try {
      await P2PService.broadcastAllIssues();
      setSentCount(issueCount);
      Alert.alert('Success', `Sent ${issueCount} issues to connected devices`);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to broadcast');
    }
  };

  const handleSendAlert = async () => {
    Alert.prompt(
      'Send Alert',
      'Enter alert message:',
      async (message) => {
        if (message) {
          try {
            await P2PService.sendAlert({
              title: 'Site Alert',
              message,
              severity: 'high',
            });
            Alert.alert('Sent', 'Alert sent to all connected devices');
          } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to send alert');
          }
        }
      }
    );
  };

  const getStatusColor = () => {
    switch (status) {
      case 'connected':
      case 'hosting': return '#4CAF50';
      case 'hosting_waiting': return '#FF9800';
      case 'discovering':
      case 'connecting': return '#FF9800';
      default: return '#666';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'connected': return '🟢 Connected';
      case 'hosting': return '🟢 Hosting (Client Connected)';
      case 'hosting_waiting': return '🟡 Hosting (Waiting for devices...)';
      case 'discovering': return '🟡 Discovering...';
      case 'connecting': return '🟡 Connecting...';
      default: return '⚫ Disconnected';
    }
  };

  const renderPeer = ({ item }: { item: P2PPeer }) => (
    <TouchableOpacity
      style={styles.peerCard}
      onPress={() => handleConnectToPeer(item)}
    >
      <View style={styles.peerInfo}>
        <Text style={styles.peerName}>{item.deviceName}</Text>
        <Text style={styles.peerAddress}>{item.deviceAddress}</Text>
      </View>
      <Text style={styles.connectText}>Connect →</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>P2P Sharing</Text>
        <View style={{ width: 60 }} />
      </View>

      {!isInitialized ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#1976d2" />
          <Text style={styles.initText}>Initializing WiFi Direct...</Text>
        </View>
      ) : (
        <View style={styles.content}>
          {/* Status Card */}
          <View style={styles.statusCard}>
            <Text style={[styles.statusText, { color: getStatusColor() }]}>
              {getStatusText()}
            </Text>
            <Text style={styles.deviceName}>
              Device: {P2PService.getDeviceName()}
            </Text>
            {connectionInfo?.groupOwnerAddress && (
              <Text style={styles.connectionDetail}>
                Host: {typeof connectionInfo.groupOwnerAddress === 'object' 
                  ? connectionInfo.groupOwnerAddress.hostAddress 
                  : connectionInfo.groupOwnerAddress}
              </Text>
            )}
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{issueCount}</Text>
              <Text style={styles.statLabel}>Local Issues</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{sentCount}</Text>
              <Text style={styles.statLabel}>Sent</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{receivedCount}</Text>
              <Text style={styles.statLabel}>Received</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            {status === 'disconnected' && (
              <>
                <TouchableOpacity style={styles.actionButton} onPress={handleStartDiscovery}>
                  <Text style={styles.actionButtonText}>🔍 Find Nearby Devices</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionButton, styles.hostButton]} onPress={handleCreateGroup}>
                  <Text style={styles.actionButtonText}>📡 Host a Group</Text>
                </TouchableOpacity>
              </>
            )}

            {status === 'discovering' && (
              <TouchableOpacity style={[styles.actionButton, styles.stopButton]} onPress={handleStopDiscovery}>
                <Text style={styles.actionButtonText}>⏹ Stop Discovery</Text>
              </TouchableOpacity>
            )}

            {status === 'hosting_waiting' && (
              <>
                <View style={styles.waitingCard}>
                  <Text style={styles.waitingText}>📡 Group created! Waiting for devices to connect...</Text>
                  <Text style={styles.waitingHint}>Other devices should tap "Find Nearby Devices" and select this device</Text>
                </View>
                <TouchableOpacity style={[styles.actionButton, styles.stopButton]} onPress={handleLeaveGroup}>
                  <Text style={styles.actionButtonText}>🔌 Cancel Hosting</Text>
                </TouchableOpacity>
              </>
            )}

            {(status === 'connected' || status === 'hosting') && (
              <>
                <TouchableOpacity style={styles.actionButton} onPress={handleBroadcastIssues}>
                  <Text style={styles.actionButtonText}>📤 Send All Issues ({issueCount})</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionButton, styles.alertButton]} onPress={handleSendAlert}>
                  <Text style={styles.actionButtonText}>⚠️ Send Alert</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionButton, styles.stopButton]} onPress={handleLeaveGroup}>
                  <Text style={styles.actionButtonText}>🔌 Disconnect</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Nearby Devices */}
          {status === 'discovering' && (
            <View style={styles.peersSection}>
              <Text style={styles.sectionTitle}>
                Nearby Devices ({peers.length})
              </Text>
              {peers.length === 0 ? (
                <View style={styles.emptyPeers}>
                  <ActivityIndicator size="small" color="#1976d2" />
                  <Text style={styles.emptyText}>Searching for devices...</Text>
                  <Text style={styles.hintText}>
                    Make sure other devices have FieldMind open{'\n'}and are also discovering
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={peers}
                  renderItem={renderPeer}
                  keyExtractor={item => item.deviceAddress}
                  style={styles.peersList}
                />
              )}
            </View>
          )}

          {/* Last Message */}
          {lastMessage && (
            <View style={styles.lastMessageCard}>
              <Text style={styles.lastMessageLabel}>Last received:</Text>
              <Text style={styles.lastMessageText}>{lastMessage}</Text>
            </View>
          )}

          {/* Instructions */}
          <View style={styles.instructionsCard}>
            <Text style={styles.instructionsTitle}>📋 How to Share</Text>
            <Text style={styles.instructionsText}>
              1. One device taps "Host a Group"{'\n'}
              2. Other devices tap "Find Nearby Devices"{'\n'}
              3. Tap on the host device to connect{'\n'}
              4. Use "Send All Issues" to share data{'\n'}
              5. Issues sync to all connected devices
            </Text>
          </View>
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initText: {
    color: '#888',
    marginTop: 16,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  statusCard: {
    backgroundColor: '#1a1a2e',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  statusText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  deviceName: {
    color: '#888',
    fontSize: 14,
    marginTop: 8,
  },
  connectionDetail: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
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
    marginTop: 4,
  },
  actionsContainer: {
    gap: 8,
    marginBottom: 16,
  },
  actionButton: {
    backgroundColor: '#1976d2',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  hostButton: {
    backgroundColor: '#4CAF50',
  },
  alertButton: {
    backgroundColor: '#FF9800',
  },
  stopButton: {
    backgroundColor: '#666',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  peersSection: {
    flex: 1,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  peersList: {
    flex: 1,
  },
  peerCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
  },
  peerInfo: {
    flex: 1,
  },
  peerName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  peerAddress: {
    color: '#666',
    fontSize: 12,
    marginTop: 2,
  },
  connectText: {
    color: '#1976d2',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyPeers: {
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    color: '#888',
    marginTop: 12,
  },
  hintText: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
  lastMessageCard: {
    backgroundColor: '#1a237e',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  lastMessageLabel: {
    color: '#888',
    fontSize: 12,
  },
  lastMessageText: {
    color: '#fff',
    fontSize: 14,
    marginTop: 4,
  },
  instructionsCard: {
    backgroundColor: '#1a1a2e',
    padding: 16,
    borderRadius: 12,
  },
  instructionsTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  instructionsText: {
    color: '#888',
    fontSize: 14,
    lineHeight: 22,
  },
  waitingCard: {
    backgroundColor: '#1a237e',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    alignItems: 'center',
  },
  waitingText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  waitingHint: {
    color: '#aaa',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
  },
});

export default SharingScreen;

