export type IssueType = 
  | 'rebar' 
  | 'electrical' 
  | 'plumbing' 
  | 'hvac'
  | 'structural'
  | 'safety'
  | 'quality'
  | 'rfi'
  | 'other';

export interface PhotoAttachment {
  id: string;
  localPath: string;
  caption?: string;
  analysisResult?: string;       // From vision model
}

export interface VoiceAttachment {
  id: string;
  localPath: string;
  transcription: string;
  language: string;
  duration: number;
}

export interface Issue {
  id: string;                    // UUID
  createdAt: Date;
  updatedAt: Date;
  syncStatus: 'pending' | 'synced' | 'conflict';
  
  // Location
  zone: string;
  location: string;              // e.g., "C7", "Level 2 - Room 205"
  coordinates?: { lat: number; lng: number };
  
  // Classification
  type: IssueType;
  trade: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  
  // Content
  description: string;
  descriptionOriginal: string;   // In worker's language
  descriptionLanguage: string;   // ISO code
  
  // Media
  photos: PhotoAttachment[];
  voiceNotes: VoiceAttachment[];
  
  // Action
  actionRequired: string;
  assignedTo?: string;
  dueDate?: Date;
  
  // Metadata
  reportedBy: string;
  deviceId: string;
}

