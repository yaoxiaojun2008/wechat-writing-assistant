import { Router, Request, Response } from 'express';
import { logger } from '../utils/logger.js';
import { contentEditingService } from '../services/contentEditingService.js';
import { EditOperation } from '../types/index.js';

const router = Router();

// GET /api/content-editing/sessions/:sessionId - Get an editing session
router.get('/sessions/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const session = await contentEditingService.getSession(sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.status(200).json(session);
    return;
  } catch (error: any) {
    logger.error('Error getting editing session:', error);
    res.status(500).json({ error: error.message });
    return;
  }
});

// PUT /api/content-editing/sessions/:sessionId - Update an editing session
router.put('/sessions/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { content } = req.body;
    const updatedSession = await contentEditingService.updateSession(sessionId, { content });

    if (!updatedSession) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.status(200).json(updatedSession);
    return;
  } catch (error: any) {
    logger.error('Error updating editing session:', error);
    res.status(500).json({ error: error.message });
    return;
  }
});

// DELETE /api/content-editing/sessions/:sessionId - Delete an editing session
router.delete('/sessions/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    // Assuming we have a deleteSession method
    const deleted = await (contentEditingService as any).deleteSession(sessionId);

    if (!deleted) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.status(200).json({ message: 'Session deleted successfully' });
    return;
  } catch (error: any) {
    logger.error('Error deleting editing session:', error);
    res.status(500).json({ error: error.message });
    return;
  }
});

// POST /api/content-editing/sessions/:sessionId/operations - Add an edit operation to a session
router.post('/sessions/:sessionId/operations', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const operation: EditOperation = req.body.operation;

    // Assuming we have an addOperation method
    const result = await (contentEditingService as any).addOperation(sessionId, operation);

    if (!result) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.status(200).json(result);
    return;
  } catch (error: any) {
    logger.error('Error adding edit operation:', error);
    res.status(500).json({ error: error.message });
    return;
  }
});

// GET /api/content-editing/sessions/:sessionId/history - Get history of an editing session
router.get('/sessions/:sessionId/history', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    // Assuming we have a getHistory method
    const history = await (contentEditingService as any).getHistory(sessionId);

    if (!history) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.status(200).json(history);
    return;
  } catch (error: any) {
    logger.error('Error getting editing history:', error);
    res.status(500).json({ error: error.message });
    return;
  }
});

// POST /api/content-editing/sessions/:sessionId/save - Save an editing session
router.post('/sessions/:sessionId/save', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { content } = req.body;

    // Assuming we have a saveSession method
    const result = await (contentEditingService as any).saveSession(sessionId, content);

    if (!result) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.status(200).json(result);
    return;
  } catch (error: any) {
    logger.error('Error saving editing session:', error);
    res.status(500).json({ error: error.message });
    return;
  }
});

// POST /api/content-editing/sessions/:sessionId/restore/:operationId - Restore to a specific operation
router.post('/sessions/:sessionId/restore/:operationId', async (req: Request, res: Response) => {
  try {
    const { sessionId, operationId } = req.params;

    // Assuming we have a restoreToOperation method
    const result = await (contentEditingService as any).restoreToOperation(sessionId, operationId);

    if (!result) {
      return res.status(404).json({ error: 'Session or operation not found' });
    }

    res.status(200).json(result);
    return;
  } catch (error: any) {
    logger.error('Error restoring to operation:', error);
    res.status(500).json({ error: error.message });
    return;
  }
});

// GET /api/content-editing/stats - Get statistics for content editing
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    // Assuming we have a getStats method
    const stats = await (contentEditingService as any).getStats();

    res.status(200).json(stats);
    return;
  } catch (error: any) {
    logger.error('Error getting content editing stats:', error);
    res.status(500).json({ error: error.message });
    return;
  }
});

export { router as contentEditingRoutes };
