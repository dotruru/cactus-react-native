import DatabaseService from './DatabaseService';
import SpecService from './SpecService';
import { Issue } from '../models/Issue';
import { getDeviceId } from '../utils/device';

interface DeviceInfo {
  id: string;
  platform: string;
  version: string;
}

interface SpecUpdate {
  filename: string;
  content: string;
  trade: string;
  version: string;
}

interface SafetyAlert {
  id: string;
  message: string;
  severity: 'high' | 'critical';
  timestamp: number;
}

interface SyncResponse {
  updatedSpecs: SpecUpdate[];
  safetyAlerts: SafetyAlert[];
  serverTimestamp: number;
}

class SyncService {
  private baseUrl: string = 'https://api.fieldmind.com'; // Placeholder
  private isOnline = false;
  
  async checkConnectivity(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, { 
        method: 'HEAD',
        timeout: 5000 
      });
      this.isOnline = response.ok;
      return this.isOnline;
    } catch {
      this.isOnline = false;
      return false;
    }
  }
  
  async sync(): Promise<SyncResponse | null> {
    if (!await this.checkConnectivity()) {
      return null;
    }
    
    // Get pending items from queue
    const pendingItems = await DatabaseService.getPendingSyncItems();
    const pendingIssues = pendingItems
      .filter(item => item.entity_type === 'issue')
      .map(item => JSON.parse(item.payload));
    
    // Upload
    const response = await fetch(`${this.baseUrl}/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        issues: pendingIssues,
        deviceInfo: await this.getDeviceInfo(),
        lastSyncTimestamp: await this.getLastSyncTimestamp()
      })
    });
    
    if (!response.ok) {
      throw new Error(`Sync failed: ${response.status}`);
    }
    
    const result: SyncResponse = await response.json();
    
    // Clear synced items from queue
    await DatabaseService.clearSyncQueue(pendingItems.map(item => item.id));
    
    // Update local data with server response
    await this.applyServerUpdates(result);
    
    return result;
  }
  
  private async applyServerUpdates(response: SyncResponse): Promise<void> {
    // Update specs
    for (const spec of response.updatedSpecs) {
      await SpecService.updateSpec(spec);
    }
    
    // Store safety alerts
    for (const alert of response.safetyAlerts) {
      await DatabaseService.saveAlert(alert);
      // Trigger local notification (TODO)
    }
  }

  private async getDeviceInfo(): Promise<DeviceInfo> {
    return {
      id: await getDeviceId(),
      platform: 'react-native',
      version: '1.0.0'
    };
  }

  private async getLastSyncTimestamp(): Promise<number> {
    return 0; // Placeholder
  }
}

export default new SyncService();

