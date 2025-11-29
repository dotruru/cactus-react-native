import {
  initialize,
  startDiscoveringPeers,
  stopDiscoveringPeers,
  subscribeOnPeersUpdates,
  subscribeOnConnectionInfoUpdates,
  connect,
  disconnect,
  sendMessage,
  receiveMessage,
  getAvailablePeers,
  getConnectionInfo,
  createGroup,
  removeGroup,
  subscribeOnThisDeviceChanged,
} from 'react-native-wifi-p2p';
import { PermissionsAndroid, Platform } from 'react-native';
import DatabaseService, { type Issue } from './DatabaseService';

export interface P2PPeer {
  deviceName: string;
  deviceAddress: string;
  isGroupOwner: boolean;
  status: number;
}

export interface P2PMessage {
  type: 'issue' | 'alert' | 'sync_request' | 'sync_response';
  payload: any;
  senderId: string;
  senderName: string;
  timestamp: number;
}

type MessageCallback = (message: P2PMessage, from: string) => void;
type PeerCallback = (peers: P2PPeer[]) => void;
type ConnectionCallback = (info: any) => void;

class P2PService {
  private isInitialized = false;
  private messageCallbacks: MessageCallback[] = [];
  private peerCallbacks: PeerCallback[] = [];
  private connectionCallbacks: ConnectionCallback[] = [];
  private deviceName: string = 'FieldMind-' + Math.random().toString(36).substr(2, 4);
  private isReceiving = false;
  private currentConnectionInfo: any = null;
  private hasActiveClient = false;

  async init(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      console.log('P2P: Only supported on Android');
      return false;
    }

    try {
      // Request required permissions
      const granted = await this.requestPermissions();
      if (!granted) {
        console.log('P2P: Permissions not granted');
        return false;
      }

      // Initialize WiFi P2P
      await initialize();
      this.isInitialized = true;
      console.log('P2P: Initialized successfully');

      // Subscribe to peer updates
      subscribeOnPeersUpdates(({ devices }) => {
        console.log('P2P: Peers updated:', devices);
        this.peerCallbacks.forEach(cb => cb(devices as P2PPeer[]));
      });

      // Subscribe to connection updates
      subscribeOnConnectionInfoUpdates((info) => {
        console.log('P2P: Connection info updated:', info);
        this.currentConnectionInfo = info;
        
        // Track if we have an active client connection
        // When hosting: groupFormed=true, isGroupOwner=true, and groupOwnerAddress exists
        // When connected as client: groupFormed=true, isGroupOwner=false
        if (info.groupFormed && info.groupOwnerAddress) {
          this.hasActiveClient = true;
        } else {
          this.hasActiveClient = false;
        }
        
        this.connectionCallbacks.forEach(cb => cb(info));
        
        // Start receiving messages when connected
        if (info.groupFormed && !this.isReceiving) {
          this.startReceiving();
        }
      });

      return true;
    } catch (error) {
      console.error('P2P: Init error:', error);
      return false;
    }
  }

  private async requestPermissions(): Promise<boolean> {
    try {
      const permissions = [
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
        PermissionsAndroid.PERMISSIONS.NEARBY_WIFI_DEVICES,
      ].filter(Boolean); // Filter out undefined for older Android versions

      const results = await PermissionsAndroid.requestMultiple(permissions as any);
      
      const allGranted = Object.values(results).every(
        result => result === PermissionsAndroid.RESULTS.GRANTED
      );
      
      console.log('P2P: Permissions:', results);
      return allGranted;
    } catch (error) {
      console.error('P2P: Permission error:', error);
      return false;
    }
  }

  // ==================== DISCOVERY ====================

  async startDiscovery(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('P2P not initialized');
    }
    
    try {
      await startDiscoveringPeers();
      console.log('P2P: Discovery started');
    } catch (error) {
      console.error('P2P: Discovery error:', error);
      throw error;
    }
  }

  async stopDiscovery(): Promise<void> {
    try {
      await stopDiscoveringPeers();
      console.log('P2P: Discovery stopped');
    } catch (error) {
      console.error('P2P: Stop discovery error:', error);
    }
  }

  async getPeers(): Promise<P2PPeer[]> {
    try {
      const peers = await getAvailablePeers();
      return peers.devices as P2PPeer[];
    } catch (error) {
      console.error('P2P: Get peers error:', error);
      return [];
    }
  }

  // ==================== CONNECTION ====================

  async connectToPeer(deviceAddress: string): Promise<void> {
    try {
      await connect(deviceAddress);
      console.log('P2P: Connected to', deviceAddress);
    } catch (error) {
      console.error('P2P: Connect error:', error);
      throw error;
    }
  }

  async disconnectFromPeer(): Promise<void> {
    try {
      await disconnect();
      this.isReceiving = false;
      console.log('P2P: Disconnected');
    } catch (error) {
      console.error('P2P: Disconnect error:', error);
    }
  }

  async createGroupAsHost(): Promise<void> {
    try {
      await createGroup();
      console.log('P2P: Group created (this device is host)');
    } catch (error) {
      console.error('P2P: Create group error:', error);
      throw error;
    }
  }

  async leaveGroup(): Promise<void> {
    try {
      await removeGroup();
      this.isReceiving = false;
      console.log('P2P: Left group');
    } catch (error) {
      console.error('P2P: Leave group error:', error);
    }
  }

  async getConnectionStatus(): Promise<any> {
    try {
      return await getConnectionInfo();
    } catch (error) {
      console.error('P2P: Get connection info error:', error);
      return null;
    }
  }

  // ==================== MESSAGING ====================

  async sendIssue(issue: Issue): Promise<void> {
    if (!this.canSendMessages()) {
      throw new Error('No connected peer. Wait for another device to connect to your group.');
    }

    const message: P2PMessage = {
      type: 'issue',
      payload: issue,
      senderId: this.deviceName,
      senderName: this.deviceName,
      timestamp: Date.now(),
    };

    try {
      await sendMessage(JSON.stringify(message));
      console.log('P2P: Issue sent:', issue.id);
    } catch (error) {
      console.error('P2P: Send issue error:', error);
      throw error;
    }
  }

  canSendMessages(): boolean {
    // Can only send if we have an active connection with a peer
    return this.currentConnectionInfo?.groupFormed && 
           this.currentConnectionInfo?.groupOwnerAddress !== null;
  }

  hasConnectedPeer(): boolean {
    return this.hasActiveClient;
  }

  async sendAlert(alert: { title: string; message: string; severity: string }): Promise<void> {
    if (!this.canSendMessages()) {
      throw new Error('No connected peer. Wait for another device to connect to your group.');
    }

    const message: P2PMessage = {
      type: 'alert',
      payload: alert,
      senderId: this.deviceName,
      senderName: this.deviceName,
      timestamp: Date.now(),
    };

    try {
      await sendMessage(JSON.stringify(message));
      console.log('P2P: Alert sent');
    } catch (error) {
      console.error('P2P: Send alert error:', error);
      throw error;
    }
  }

  async broadcastAllIssues(): Promise<void> {
    try {
      const issues = await DatabaseService.getIssues();
      for (const issue of issues) {
        await this.sendIssue(issue);
        // Small delay to prevent flooding
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      console.log('P2P: Broadcast', issues.length, 'issues');
    } catch (error) {
      console.error('P2P: Broadcast error:', error);
      throw error;
    }
  }

  private async startReceiving(): Promise<void> {
    if (this.isReceiving) return;
    
    this.isReceiving = true;
    console.log('P2P: Starting to receive messages...');

    const receiveLoop = async () => {
      while (this.isReceiving) {
        try {
          const rawMessage = await receiveMessage();
          if (rawMessage) {
            const message: P2PMessage = JSON.parse(rawMessage);
            console.log('P2P: Received message:', message.type);
            
            // Handle the message
            await this.handleReceivedMessage(message);
            
            // Notify callbacks
            this.messageCallbacks.forEach(cb => cb(message, message.senderId));
          }
        } catch (error) {
          // Timeout or parse error, continue
          if (this.isReceiving) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      }
    };

    receiveLoop();
  }

  private async handleReceivedMessage(message: P2PMessage): Promise<void> {
    switch (message.type) {
      case 'issue':
        // Save received issue to local database
        const issue = message.payload as Issue;
        issue.syncStatus = 'synced'; // Mark as synced since it came from another device
        await DatabaseService.saveIssue(issue);
        console.log('P2P: Saved received issue:', issue.id);
        break;
        
      case 'alert':
        // Handle alert (could show notification)
        console.log('P2P: Received alert:', message.payload);
        break;
        
      case 'sync_request':
        // Send all our issues
        await this.broadcastAllIssues();
        break;
        
      default:
        console.log('P2P: Unknown message type:', message.type);
    }
  }

  // ==================== CALLBACKS ====================

  onMessage(callback: MessageCallback): () => void {
    this.messageCallbacks.push(callback);
    return () => {
      this.messageCallbacks = this.messageCallbacks.filter(cb => cb !== callback);
    };
  }

  onPeersChanged(callback: PeerCallback): () => void {
    this.peerCallbacks.push(callback);
    return () => {
      this.peerCallbacks = this.peerCallbacks.filter(cb => cb !== callback);
    };
  }

  onConnectionChanged(callback: ConnectionCallback): () => void {
    this.connectionCallbacks.push(callback);
    return () => {
      this.connectionCallbacks = this.connectionCallbacks.filter(cb => cb !== callback);
    };
  }

  // ==================== UTILITY ====================

  getDeviceName(): string {
    return this.deviceName;
  }

  setDeviceName(name: string): void {
    this.deviceName = name;
  }

  isReady(): boolean {
    return this.isInitialized;
  }
}

export default new P2PService();
