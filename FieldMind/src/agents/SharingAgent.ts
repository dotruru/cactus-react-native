import P2PService, { P2PMessage } from '../services/P2PService';
import DatabaseService from '../services/DatabaseService';
import TranslationAgent from './TranslationAgent';
import { LanguageCode } from '../utils/languageCodes';
import { getDeviceId } from '../utils/device';
import { Issue } from '../models/Issue';

interface SafetyAlert {
  id: string;
  message: string;
  severity: 'high' | 'critical';
  timestamp: number;
}

class SharingAgent {
  private userLanguage: LanguageCode = 'en';
  
  constructor() {
    P2PService.onMessageReceived(async (msg, from) => {
      if (msg.type === 'issue') {
        await this.handleReceivedIssue(msg.payload);
      } else if (msg.type === 'alert') {
        // Handle alert
      }
    });
  }
  
  setUserLanguage(lang: LanguageCode) {
    this.userLanguage = lang;
  }
  
  async broadcastIssue(issue: Issue): Promise<void> {
    const deviceId = await getDeviceId();
    
    const message: P2PMessage = {
      type: 'issue',
      payload: issue,
      senderId: deviceId,
      timestamp: Date.now()
    };
    
    await P2PService.sendMessage(message);
  }
  
  async handleReceivedIssue(issue: Issue): Promise<void> {
    // Translate description to user's language if needed
    if (issue.descriptionLanguage !== this.userLanguage) {
      issue.description = await TranslationAgent.translate(
        issue.description,
        issue.descriptionLanguage as LanguageCode,
        this.userLanguage
      );
    }
    
    // Store and notify
    await DatabaseService.saveIssue({ ...issue, syncStatus: 'synced' });
    // Trigger notification (TODO)
  }
  
  async broadcastSafetyAlert(alert: SafetyAlert): Promise<void> {
    const deviceId = await getDeviceId();
    
    const message: P2PMessage = {
      type: 'alert',
      payload: alert,
      senderId: deviceId,
      timestamp: Date.now()
    };
    
    await P2PService.sendMessage(message);
  }
}

export default new SharingAgent();

