export interface SpecDocument {
  id: string;
  filename: string;
  zone: string;           // 'zone-a', 'zone-b', 'mechanical-room'
  trade: string;          // 'electrical', 'plumbing', 'hvac'
  version: string;
  lastUpdated: Date;
  localPath: string;      // Path to .txt file
}

