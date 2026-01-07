import { logger } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';
import { 
  EditingSession, 
  EditOperation 
} from '../types/index.js';

// Helper function to create error objects
function createError(message: string, statusCode: number) {
  const error = new Error(message);
  // @ts-ignore - adding custom property to Error
  error.statusCode = statusCode;
  return error;
}

// Define the interface for the service
interface ContentEditingService {
  createEditingSession(content: string, title: string): Promise<EditingSession>;
  getSession(sessionId: string): Promise<EditingSession | null>;
  updateSession(sessionId: string, updates: Partial<{ content: string, title: string }>): Promise<EditingSession | null>;
  deleteEditingSession(sessionId: string): Promise<boolean>;
  addEditOperation(sessionId: string, operation: Omit<EditOperation, 'id' | 'timestamp'>): Promise<EditOperation>;
  getEditHistory(sessionId: string): Promise<EditOperation[]>;
  getUserEditingSessions(userId: string): Promise<EditingSession[]>;
  saveContent(sessionId: string, content: string): Promise<void>;
  restoreVersion(sessionId: string, operationId: string): Promise<string>;
}

export class ContentEditingServiceImpl implements ContentEditingService {
  // In-memory storage for demo purposes
  // In production, this would use a database like Redis or PostgreSQL
  private sessions: Map<string, EditingSession> = new Map();
  private operations: Map<string, EditOperation[]> = new Map(); // Add the missing operations property
  private storage: any;

  constructor(storageProvider: any) {
    this.storage = storageProvider;
  }

  async createEditingSession(content: string): Promise<EditingSession> {
    try {
      const sessionId = uuidv4();
      const session: EditingSession = {
        id: sessionId,
        userId: 'default_user',
        originalText: content,
        editedText: content,
        editHistory: [],
        aiSuggestions: [],
        status: 'editing',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Add to in-memory cache
      this.sessions.set(sessionId, session);

      // Also save to storage if available
      if (this.storage) {
        await this.storage.set(sessionId, JSON.stringify(session));
      }

      // Initialize operations list
      this.operations.set(sessionId, []);

      logger.info(`Created new editing session: ${sessionId}`);
      return session;
    } catch (error) {
      logger.error('Failed to create editing session:', error);
      throw createError('创建编辑会话失败', 500);
    }
  }



  async getSession(sessionId: string): Promise<EditingSession | null> {
    try {
      // Check if session exists in memory
      if (this.sessions.has(sessionId)) {
        return this.sessions.get(sessionId)!;
      }

      // If not in memory, try to get from storage (Redis or memory fallback)
      const sessionData = await this.storage?.get(sessionId) || null;
      if (sessionData) {
        // Parse and return the session data
        const session = JSON.parse(sessionData) as EditingSession;
        // Add to in-memory cache for faster access
        this.sessions.set(sessionId, session);
        return session;
      }

      return null;
    } catch (error) {
      logger.error(`Error getting session ${sessionId}:`, error);
      return null;
    }
  }

  async deleteEditingSession(sessionId: string): Promise<boolean> {
    try {
      const deleted = this.sessions.delete(sessionId);
      this.operations.delete(sessionId);

      if (deleted) {
        logger.info(`Deleted editing session: ${sessionId}`);
      }

      return deleted;
    } catch (error) {
      logger.error('Failed to delete editing session:', error);
      return false;
    }
  }

  async addEditOperation(
    sessionId: string, 
    operation: Omit<EditOperation, 'id' | 'timestamp'>
  ): Promise<EditOperation> {
    try {
      const session = this.sessions.get(sessionId);
      if (!session) {
        throw createError('编辑会话不存在', 404);
      }

      const fullOperation: EditOperation = {
        ...operation,
        id: uuidv4(),
        timestamp: new Date(),
      };

      // Add to operations list
      const operations = this.operations.get(sessionId) || [];
      operations.push(fullOperation);
      this.operations.set(sessionId, operations);

      // Update session history
      const updatedSession = {
        ...session,
        editHistory: [...session.editHistory, fullOperation],
        updatedAt: new Date(),
      };
      this.sessions.set(sessionId, updatedSession);

      logger.info(`Added edit operation to session: ${sessionId}`);
      return fullOperation;
    } catch (error) {
      logger.error('Failed to add edit operation:', error);
      if (error instanceof Error && error.message.includes('编辑会话不存在')) {
        throw error;
      }
      throw createError('添加编辑操作失败', 500);
    }
  }

  async getEditHistory(sessionId: string): Promise<EditOperation[]> {
    try {
      const operations = this.operations.get(sessionId);
      return operations || [];
    } catch (error) {
      logger.error('Failed to get edit history:', error);
      return [];
    }
  }

  async getUserEditingSessions(userId: string): Promise<EditingSession[]> {
    try {
      const userSessions: EditingSession[] = [];
      
      for (const session of this.sessions.values()) {
        if (session.userId === userId) {
          userSessions.push(session);
        }
      }

      // Sort by most recent first
      userSessions.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

      return userSessions;
    } catch (error) {
      logger.error('Failed to get user editing sessions:', error);
      return [];
    }
  }

  async saveContent(sessionId: string, content: string): Promise<void> {
    try {
      // Use updateSession which handles both memory and storage
      const result = await this.updateSession(sessionId, { content });
      if (!result) {
        throw createError('编辑会话不存在', 404);
      }
    } catch (error) {
      logger.error('Failed to save content:', error);
      if (error instanceof Error && error.message.includes('编辑会话不存在')) {
        throw error;
      }
      throw createError('保存内容失败', 500);
    }
  }

  async restoreVersion(sessionId: string, operationId: string): Promise<string> {
    try {
      const session = await this.getSession(sessionId);
      if (!session) {
        throw createError('编辑会话不存在', 404);
      }

      const operations = this.operations.get(sessionId) || [];
      const operationIndex = operations.findIndex(op => op.id === operationId);
      
      if (operationIndex === -1) {
        throw createError('版本不存在', 404);
      }

      // Reconstruct content up to the target operation
      let restoredContent = session.originalText;
      
      for (let i = 0; i <= operationIndex; i++) {
        const op = operations[i];
        switch (op.type) {
          case 'insert':
            restoredContent = restoredContent.slice(0, op.position) + 
                            op.content + 
                            restoredContent.slice(op.position);
            break;
          case 'delete':
            // For restore, we skip delete operations to maintain content
            break;
          case 'replace':
            restoredContent = op.content;
            break;
        }
      }

      // Use updateSession to properly update both memory and storage
      await this.updateSession(sessionId, { content: restoredContent });

      logger.info(`Restored version for session: ${sessionId} to operation: ${operationId}`);
      return restoredContent;
    } catch (error) {
      logger.error('Failed to restore version:', error);
      if (error instanceof Error && (
        error.message.includes('编辑会话不存在') || 
        error.message.includes('版本不存在')
      )) {
        throw error;
      }
      throw createError('恢复版本失败', 500);
    }
  }

  // Utility methods for session management
  async cleanupExpiredSessions(maxAgeHours: number = 24): Promise<number> {
    try {
      const cutoffTime = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
      let cleanedCount = 0;

      for (const [sessionId, session] of this.sessions.entries()) {
        if (session.updatedAt < cutoffTime) {
          this.sessions.delete(sessionId);
          this.operations.delete(sessionId);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        logger.info(`Cleaned up ${cleanedCount} expired editing sessions`);
      }

      return cleanedCount;
    } catch (error) {
      logger.error('Failed to cleanup expired sessions:', error);
      return 0;
    }
  }

  async getSessionStats(): Promise<{
    totalSessions: number;
    activeSessions: number;
    completedSessions: number;
    totalOperations: number;
  }> {
    try {
      let activeSessions = 0;
      let completedSessions = 0;
      let totalOperations = 0;

      for (const session of this.sessions.values()) {
        if (session.status === 'completed') {
          completedSessions++;
        } else {
          activeSessions++;
        }
      }

      for (const operations of this.operations.values()) {
        totalOperations += operations.length;
      }

      return {
        totalSessions: this.sessions.size,
        activeSessions,
        completedSessions,
        totalOperations,
      };
    } catch (error) {
      logger.error('Failed to get session stats:', error);
      return {
        totalSessions: 0,
        activeSessions: 0,
        completedSessions: 0,
        totalOperations: 0,
      };
    }
  }

  // Auto-save functionality
  async enableAutoSave(sessionId: string, intervalMs: number = 30000): Promise<NodeJS.Timeout> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw createError('编辑会话不存在', 404);
    }

    const autoSaveInterval = setInterval(async () => {
      try {
        const currentSession = this.sessions.get(sessionId);
        if (!currentSession) {
          clearInterval(autoSaveInterval);
          return;
        }

        // Auto-save logic would go here
        // For now, just update the timestamp
        const updatedSession = {
          ...currentSession,
          updatedAt: new Date(),
        };
        this.sessions.set(sessionId, updatedSession);

        logger.debug(`Auto-saved session: ${sessionId}`);
      } catch (error) {
        logger.error('Auto-save failed:', error);
      }
    }, intervalMs);

    return autoSaveInterval;
  }

  async updateSession(sessionId: string, updates: Partial<{ content: string }>): Promise<EditingSession | null> {
    try {
      // Get the current session
      let session = this.sessions.get(sessionId);
      
      if (!session) {
        // Try to get from storage
        const sessionData = await this.storage?.get(sessionId) || null;
        if (sessionData) {
          session = JSON.parse(sessionData) as EditingSession;
        } else {
          return null; // Session doesn't exist
        }
      }

      // Update the session with provided values
      const updatedSession: EditingSession = {
        ...session,
        ...updates,
        updatedAt: new Date(),
      };

      // Update in memory
      this.sessions.set(sessionId, updatedSession);

      // Update in storage if available
      if (this.storage) {
        await this.storage.set(sessionId, JSON.stringify(updatedSession));
      }

      return updatedSession;
    } catch (error) {
      logger.error(`Error updating session ${sessionId}:`, error);
      return null;
    }
  }
}

// Export the service instance with null storage for now
export const contentEditingService = new ContentEditingServiceImpl(null);