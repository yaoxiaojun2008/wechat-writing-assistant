import { EditingSession, EditOperation, AISuggestion } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';
import { createError } from '../middleware/errorHandler.js';

interface ContentEditingServiceInterface {
  createEditingSession(userId: string, originalText: string): Promise<EditingSession>;
  updateEditingSession(sessionId: string, updates: Partial<EditingSession>): Promise<EditingSession>;
  getEditingSession(sessionId: string): Promise<EditingSession | null>;
  deleteEditingSession(sessionId: string): Promise<boolean>;
  addEditOperation(sessionId: string, operation: Omit<EditOperation, 'id' | 'timestamp'>): Promise<EditOperation>;
  getEditHistory(sessionId: string): Promise<EditOperation[]>;
  getUserEditingSessions(userId: string): Promise<EditingSession[]>;
  saveContent(sessionId: string, content: string): Promise<void>;
  restoreVersion(sessionId: string, operationId: string): Promise<string>;
}

class ContentEditingServiceImpl implements ContentEditingServiceInterface {
  // In-memory storage for demo purposes
  // In production, this would use a database like Redis or PostgreSQL
  private sessions: Map<string, EditingSession> = new Map();
  private operations: Map<string, EditOperation[]> = new Map();

  async createEditingSession(userId: string, originalText: string): Promise<EditingSession> {
    try {
      const session: EditingSession = {
        id: uuidv4(),
        userId,
        originalText,
        editedText: originalText,
        editHistory: [],
        aiSuggestions: [],
        status: 'editing',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.sessions.set(session.id, session);
      this.operations.set(session.id, []);

      logger.info(`Created editing session: ${session.id} for user: ${userId}`);
      return session;
    } catch (error) {
      logger.error('Failed to create editing session:', error);
      throw createError('创建编辑会话失败', 500);
    }
  }

  async updateEditingSession(sessionId: string, updates: Partial<EditingSession>): Promise<EditingSession> {
    try {
      const session = this.sessions.get(sessionId);
      if (!session) {
        throw createError('编辑会话不存在', 404);
      }

      const updatedSession: EditingSession = {
        ...session,
        ...updates,
        updatedAt: new Date(),
      };

      this.sessions.set(sessionId, updatedSession);

      logger.info(`Updated editing session: ${sessionId}`);
      return updatedSession;
    } catch (error) {
      logger.error('Failed to update editing session:', error);
      if (error instanceof Error && error.message.includes('编辑会话不存在')) {
        throw error;
      }
      throw createError('更新编辑会话失败', 500);
    }
  }

  async getEditingSession(sessionId: string): Promise<EditingSession | null> {
    try {
      const session = this.sessions.get(sessionId);
      return session || null;
    } catch (error) {
      logger.error('Failed to get editing session:', error);
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
      const session = this.sessions.get(sessionId);
      if (!session) {
        throw createError('编辑会话不存在', 404);
      }

      const updatedSession = {
        ...session,
        editedText: content,
        updatedAt: new Date(),
      };

      this.sessions.set(sessionId, updatedSession);

      logger.info(`Saved content for session: ${sessionId}`);
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
      const session = this.sessions.get(sessionId);
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

      // Update session with restored content
      const updatedSession = {
        ...session,
        editedText: restoredContent,
        updatedAt: new Date(),
      };
      this.sessions.set(sessionId, updatedSession);

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
}

export const contentEditingService = new ContentEditingServiceImpl();

// Export service class for testing
export { ContentEditingServiceImpl };