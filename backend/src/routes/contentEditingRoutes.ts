import express from 'express';
import { contentEditingService } from '../services/contentEditingService.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { logger } from '../utils/logger.js';
import { ApiResponse } from '../types/index.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Create new editing session
router.post('/sessions', async (req, res) => {
  try {
    const { originalText } = req.body;
    const userId = req.user?.id || 'default-user';

    if (!originalText || typeof originalText !== 'string') {
      return res.status(400).json({
        success: false,
        error: { message: '原始文本不能为空', code: 'INVALID_INPUT' }
      } as ApiResponse);
    }

    const session = await contentEditingService.createEditingSession(userId, originalText);

    logger.info(`Created editing session: ${session.id} for user: ${userId}`);

    res.json({
      success: true,
      data: session
    } as ApiResponse);
  } catch (error) {
    logger.error('Failed to create editing session:', error);
    res.status(500).json({
      success: false,
      error: { 
        message: error instanceof Error ? error.message : '创建编辑会话失败',
        code: 'SESSION_CREATE_FAILED'
      }
    } as ApiResponse);
  }
});

// Get editing session
router.get('/sessions/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user?.id || 'default-user';

    const session = await contentEditingService.getEditingSession(sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        error: { message: '编辑会话不存在', code: 'SESSION_NOT_FOUND' }
      } as ApiResponse);
    }

    // Check if user owns this session
    if (session.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: { message: '无权访问此编辑会话', code: 'ACCESS_DENIED' }
      } as ApiResponse);
    }

    res.json({
      success: true,
      data: session
    } as ApiResponse);
  } catch (error) {
    logger.error('Failed to get editing session:', error);
    res.status(500).json({
      success: false,
      error: { 
        message: error instanceof Error ? error.message : '获取编辑会话失败',
        code: 'SESSION_GET_FAILED'
      }
    } as ApiResponse);
  }
});

// Update editing session
router.put('/sessions/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user?.id || 'default-user';
    const updates = req.body;

    // Verify session exists and user owns it
    const existingSession = await contentEditingService.getEditingSession(sessionId);
    if (!existingSession) {
      return res.status(404).json({
        success: false,
        error: { message: '编辑会话不存在', code: 'SESSION_NOT_FOUND' }
      } as ApiResponse);
    }

    if (existingSession.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: { message: '无权修改此编辑会话', code: 'ACCESS_DENIED' }
      } as ApiResponse);
    }

    const updatedSession = await contentEditingService.updateEditingSession(sessionId, updates);

    logger.info(`Updated editing session: ${sessionId}`);

    res.json({
      success: true,
      data: updatedSession
    } as ApiResponse);
  } catch (error) {
    logger.error('Failed to update editing session:', error);
    res.status(500).json({
      success: false,
      error: { 
        message: error instanceof Error ? error.message : '更新编辑会话失败',
        code: 'SESSION_UPDATE_FAILED'
      }
    } as ApiResponse);
  }
});

// Delete editing session
router.delete('/sessions/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user?.id || 'default-user';

    // Verify session exists and user owns it
    const existingSession = await contentEditingService.getEditingSession(sessionId);
    if (!existingSession) {
      return res.status(404).json({
        success: false,
        error: { message: '编辑会话不存在', code: 'SESSION_NOT_FOUND' }
      } as ApiResponse);
    }

    if (existingSession.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: { message: '无权删除此编辑会话', code: 'ACCESS_DENIED' }
      } as ApiResponse);
    }

    const deleted = await contentEditingService.deleteEditingSession(sessionId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: { message: '编辑会话不存在', code: 'SESSION_NOT_FOUND' }
      } as ApiResponse);
    }

    logger.info(`Deleted editing session: ${sessionId}`);

    res.json({
      success: true,
      data: { deleted: true }
    } as ApiResponse);
  } catch (error) {
    logger.error('Failed to delete editing session:', error);
    res.status(500).json({
      success: false,
      error: { 
        message: error instanceof Error ? error.message : '删除编辑会话失败',
        code: 'SESSION_DELETE_FAILED'
      }
    } as ApiResponse);
  }
});

// Add edit operation to session
router.post('/sessions/:sessionId/operations', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { type, position, content, source = 'user' } = req.body;
    const userId = req.user?.id || 'default-user';

    // Verify session exists and user owns it
    const existingSession = await contentEditingService.getEditingSession(sessionId);
    if (!existingSession) {
      return res.status(404).json({
        success: false,
        error: { message: '编辑会话不存在', code: 'SESSION_NOT_FOUND' }
      } as ApiResponse);
    }

    if (existingSession.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: { message: '无权修改此编辑会话', code: 'ACCESS_DENIED' }
      } as ApiResponse);
    }

    // Validate operation data
    if (!type || !['insert', 'delete', 'replace'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: { message: '无效的操作类型', code: 'INVALID_OPERATION_TYPE' }
      } as ApiResponse);
    }

    if (typeof position !== 'number' || position < 0) {
      return res.status(400).json({
        success: false,
        error: { message: '无效的位置参数', code: 'INVALID_POSITION' }
      } as ApiResponse);
    }

    if (!content || typeof content !== 'string') {
      return res.status(400).json({
        success: false,
        error: { message: '内容不能为空', code: 'INVALID_CONTENT' }
      } as ApiResponse);
    }

    const operation = await contentEditingService.addEditOperation(sessionId, {
      type,
      position,
      content,
      source: source as 'user' | 'ai',
    });

    logger.info(`Added edit operation to session: ${sessionId}`);

    res.json({
      success: true,
      data: operation
    } as ApiResponse);
  } catch (error) {
    logger.error('Failed to add edit operation:', error);
    res.status(500).json({
      success: false,
      error: { 
        message: error instanceof Error ? error.message : '添加编辑操作失败',
        code: 'OPERATION_ADD_FAILED'
      }
    } as ApiResponse);
  }
});

// Get edit history for session
router.get('/sessions/:sessionId/history', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user?.id || 'default-user';

    // Verify session exists and user owns it
    const existingSession = await contentEditingService.getEditingSession(sessionId);
    if (!existingSession) {
      return res.status(404).json({
        success: false,
        error: { message: '编辑会话不存在', code: 'SESSION_NOT_FOUND' }
      } as ApiResponse);
    }

    if (existingSession.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: { message: '无权访问此编辑会话', code: 'ACCESS_DENIED' }
      } as ApiResponse);
    }

    const history = await contentEditingService.getEditHistory(sessionId);

    res.json({
      success: true,
      data: history
    } as ApiResponse);
  } catch (error) {
    logger.error('Failed to get edit history:', error);
    res.status(500).json({
      success: false,
      error: { 
        message: error instanceof Error ? error.message : '获取编辑历史失败',
        code: 'HISTORY_GET_FAILED'
      }
    } as ApiResponse);
  }
});

// Save content for session
router.post('/sessions/:sessionId/save', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { content } = req.body;
    const userId = req.user?.id || 'default-user';

    // Verify session exists and user owns it
    const existingSession = await contentEditingService.getEditingSession(sessionId);
    if (!existingSession) {
      return res.status(404).json({
        success: false,
        error: { message: '编辑会话不存在', code: 'SESSION_NOT_FOUND' }
      } as ApiResponse);
    }

    if (existingSession.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: { message: '无权修改此编辑会话', code: 'ACCESS_DENIED' }
      } as ApiResponse);
    }

    if (typeof content !== 'string') {
      return res.status(400).json({
        success: false,
        error: { message: '内容必须是字符串', code: 'INVALID_CONTENT' }
      } as ApiResponse);
    }

    await contentEditingService.saveContent(sessionId, content);

    logger.info(`Saved content for session: ${sessionId}`);

    res.json({
      success: true,
      data: { saved: true }
    } as ApiResponse);
  } catch (error) {
    logger.error('Failed to save content:', error);
    res.status(500).json({
      success: false,
      error: { 
        message: error instanceof Error ? error.message : '保存内容失败',
        code: 'CONTENT_SAVE_FAILED'
      }
    } as ApiResponse);
  }
});

// Restore version
router.post('/sessions/:sessionId/restore/:operationId', async (req, res) => {
  try {
    const { sessionId, operationId } = req.params;
    const userId = req.user?.id || 'default-user';

    // Verify session exists and user owns it
    const existingSession = await contentEditingService.getEditingSession(sessionId);
    if (!existingSession) {
      return res.status(404).json({
        success: false,
        error: { message: '编辑会话不存在', code: 'SESSION_NOT_FOUND' }
      } as ApiResponse);
    }

    if (existingSession.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: { message: '无权修改此编辑会话', code: 'ACCESS_DENIED' }
      } as ApiResponse);
    }

    const restoredContent = await contentEditingService.restoreVersion(sessionId, operationId);

    logger.info(`Restored version for session: ${sessionId} to operation: ${operationId}`);

    res.json({
      success: true,
      data: { content: restoredContent }
    } as ApiResponse);
  } catch (error) {
    logger.error('Failed to restore version:', error);
    res.status(500).json({
      success: false,
      error: { 
        message: error instanceof Error ? error.message : '恢复版本失败',
        code: 'VERSION_RESTORE_FAILED'
      }
    } as ApiResponse);
  }
});

// Get user's editing sessions
router.get('/sessions', async (req, res) => {
  try {
    const userId = req.user?.id || 'default-user';
    const sessions = await contentEditingService.getUserEditingSessions(userId);

    res.json({
      success: true,
      data: sessions
    } as ApiResponse);
  } catch (error) {
    logger.error('Failed to get user editing sessions:', error);
    res.status(500).json({
      success: false,
      error: { 
        message: error instanceof Error ? error.message : '获取编辑会话失败',
        code: 'SESSIONS_GET_FAILED'
      }
    } as ApiResponse);
  }
});

// Get session statistics (admin endpoint)
router.get('/stats', async (req, res) => {
  try {
    const stats = await contentEditingService.getSessionStats();

    res.json({
      success: true,
      data: stats
    } as ApiResponse);
  } catch (error) {
    logger.error('Failed to get session stats:', error);
    res.status(500).json({
      success: false,
      error: { 
        message: error instanceof Error ? error.message : '获取统计信息失败',
        code: 'STATS_GET_FAILED'
      }
    } as ApiResponse);
  }
});

export default router;