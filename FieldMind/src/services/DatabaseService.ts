import { open, type DB } from '@op-engineering/op-sqlite';

// Issue type definition
export interface Issue {
  id: string;
  createdAt: number;
  updatedAt: number;
  syncStatus: 'pending' | 'synced' | 'conflict';
  
  // Location
  zone: string;
  location: string;
  
  // Classification
  type: string;
  trade: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  
  // Content
  description: string;
  descriptionOriginal: string;
  descriptionLanguage: string;
  
  // Media (JSON arrays of paths)
  photos: string;
  voiceNotes: string;
  
  // Action
  actionRequired: string;
  assignedTo: string;
  
  // Metadata
  reportedBy: string;
  deviceId: string;
}

class DatabaseService {
  private db: DB | null = null;
  private isInitialized = false;

  async init(): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.db = open({ name: 'fieldmind.db' });
      
      // Create issues table
      await this.db.execute(`
        CREATE TABLE IF NOT EXISTS issues (
          id TEXT PRIMARY KEY,
          createdAt INTEGER NOT NULL,
          updatedAt INTEGER NOT NULL,
          syncStatus TEXT DEFAULT 'pending',
          zone TEXT,
          location TEXT,
          type TEXT,
          trade TEXT,
          severity TEXT DEFAULT 'medium',
          description TEXT,
          descriptionOriginal TEXT,
          descriptionLanguage TEXT DEFAULT 'en',
          photos TEXT DEFAULT '[]',
          voiceNotes TEXT DEFAULT '[]',
          actionRequired TEXT,
          assignedTo TEXT,
          reportedBy TEXT,
          deviceId TEXT
        )
      `);

      // Create sync queue table
      await this.db.execute(`
        CREATE TABLE IF NOT EXISTS sync_queue (
          id TEXT PRIMARY KEY,
          entityType TEXT,
          entityId TEXT,
          action TEXT,
          payload TEXT,
          createdAt INTEGER
        )
      `);

      // Create specs metadata table
      await this.db.execute(`
        CREATE TABLE IF NOT EXISTS specs (
          id TEXT PRIMARY KEY,
          filename TEXT,
          zone TEXT,
          trade TEXT,
          version TEXT,
          lastUpdated INTEGER,
          localPath TEXT
        )
      `);

      this.isInitialized = true;
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Database init error:', error);
      throw error;
    }
  }

  // ==================== ISSUES ====================

  async saveIssue(issue: Omit<Issue, 'createdAt' | 'updatedAt'> & { createdAt?: number; updatedAt?: number }): Promise<void> {
    await this.init();
    
    const now = Date.now();
    const fullIssue: Issue = {
      ...issue,
      createdAt: issue.createdAt || now,
      updatedAt: now,
      syncStatus: issue.syncStatus || 'pending',
    } as Issue;

    await this.db!.execute(
      `INSERT OR REPLACE INTO issues 
       (id, createdAt, updatedAt, syncStatus, zone, location, type, trade, severity, 
        description, descriptionOriginal, descriptionLanguage, photos, voiceNotes, 
        actionRequired, assignedTo, reportedBy, deviceId)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        fullIssue.id,
        fullIssue.createdAt,
        fullIssue.updatedAt,
        fullIssue.syncStatus,
        fullIssue.zone || '',
        fullIssue.location || '',
        fullIssue.type || 'other',
        fullIssue.trade || 'general',
        fullIssue.severity,
        fullIssue.description || '',
        fullIssue.descriptionOriginal || fullIssue.description || '',
        fullIssue.descriptionLanguage || 'en',
        fullIssue.photos || '[]',
        fullIssue.voiceNotes || '[]',
        fullIssue.actionRequired || '',
        fullIssue.assignedTo || '',
        fullIssue.reportedBy || '',
        fullIssue.deviceId || '',
      ]
    );

    console.log('Issue saved to DB:', fullIssue.id);

    // Add to sync queue
    await this.addToSyncQueue('issue', fullIssue.id, 'upsert', fullIssue);
  }

  async getIssues(): Promise<Issue[]> {
    await this.init();
    
    const result = await this.db!.execute(
      'SELECT * FROM issues ORDER BY createdAt DESC'
    );
    
    console.log('getIssues result:', result);
    console.log('getIssues rows:', result.rows);
    
    return result.rows as Issue[];
  }

  async getIssueById(id: string): Promise<Issue | null> {
    await this.init();
    
    const result = await this.db!.execute(
      'SELECT * FROM issues WHERE id = ?',
      [id]
    );
    
    return result.rows[0] as Issue || null;
  }

  async deleteIssue(id: string): Promise<void> {
    await this.init();
    
    await this.db!.execute('DELETE FROM issues WHERE id = ?', [id]);
    await this.addToSyncQueue('issue', id, 'delete', { id });
  }

  async getIssueCount(): Promise<number> {
    await this.init();
    
    const result = await this.db!.execute('SELECT COUNT(*) as count FROM issues');
    return (result.rows[0] as any)?.count || 0;
  }

  async getPendingIssueCount(): Promise<number> {
    await this.init();
    
    const result = await this.db!.execute(
      "SELECT COUNT(*) as count FROM issues WHERE syncStatus = 'pending'"
    );
    return (result.rows[0] as any)?.count || 0;
  }

  // ==================== SYNC QUEUE ====================

  private async addToSyncQueue(
    entityType: string,
    entityId: string,
    action: string,
    payload: any
  ): Promise<void> {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    await this.db!.execute(
      `INSERT INTO sync_queue (id, entityType, entityId, action, payload, createdAt)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, entityType, entityId, action, JSON.stringify(payload), Date.now()]
    );
  }

  async getSyncQueue(): Promise<any[]> {
    await this.init();
    
    const result = await this.db!.execute(
      'SELECT * FROM sync_queue ORDER BY createdAt ASC'
    );
    
    return result.rows.map((row: any) => ({
      ...row,
      payload: JSON.parse(row.payload || '{}'),
    }));
  }

  async clearSyncQueueItem(id: string): Promise<void> {
    await this.init();
    await this.db!.execute('DELETE FROM sync_queue WHERE id = ?', [id]);
  }

  async clearSyncQueue(): Promise<void> {
    await this.init();
    await this.db!.execute('DELETE FROM sync_queue');
  }

  // ==================== SPECS ====================

  async saveSpec(spec: {
    id: string;
    filename: string;
    zone?: string;
    trade?: string;
    version?: string;
    localPath: string;
  }): Promise<void> {
    await this.init();
    
    await this.db!.execute(
      `INSERT OR REPLACE INTO specs (id, filename, zone, trade, version, lastUpdated, localPath)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        spec.id,
        spec.filename,
        spec.zone || '',
        spec.trade || '',
        spec.version || '1.0',
        Date.now(),
        spec.localPath,
      ]
    );
  }

  async getSpecs(): Promise<any[]> {
    await this.init();
    
    const result = await this.db!.execute('SELECT * FROM specs ORDER BY filename ASC');
    return result.rows;
  }

  async deleteSpec(id: string): Promise<void> {
    await this.init();
    await this.db!.execute('DELETE FROM specs WHERE id = ?', [id]);
  }

  // ==================== UTILITY ====================

  async clearAllData(): Promise<void> {
    await this.init();
    
    await this.db!.execute('DELETE FROM issues');
    await this.db!.execute('DELETE FROM sync_queue');
    await this.db!.execute('DELETE FROM specs');
  }
}

export default new DatabaseService();
