import express from 'express';
import { body, validationResult } from 'express-validator';
import { aiEditingService } from '../services/aiEditingService.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { logger } from '../utils/logger.js';
import { ApiResponse, EditingOptions } from '../types/index.js';
import { createError } from '../middleware/errorHandler.js';

const router = express.Router();

// Validation middleware
const validateEditRequest = [
  body('text')
    .isString()
    .isLength({ min: 1, max: 10000 })
    .withMessage('文本内容必须在1-10000字符之间'),
  body('options.level')
    .optional()
    .isIn(['light', 'moderate', 'heavy'])
    .withMessage('编辑级别必须是 light、moderate 或 heavy'),
  body('options.preserveStyle')
    .optional()
    .isBoolean()
    .withMessage('preserveStyle 必须是布尔值'),
  body('options.correctGrammar')
    .optional()
    .isBoolean()
    .withMessage('correctGrammar 必须是布尔值'),
  body('options.reorganizeStructure')
    .optional()
    .isBoolean()
    .withMessage('reorganizeStructure 必须是布尔值'),
];

const validateTextRequest = [
  body('text')
    .isString()
    .isLength({ min: 1, max: 10000 })
    .withMessage('文本内容必须在1-10000字符之间'),
];

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * POST /api/ai-editing/edit
 * 智能编辑文本内容
 */
router.post('/edit', validateEditRequest, async (req: express.Request, res: express.Response, next: express.NextFunction): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        error: {
          message: '请求参数验证失败',
          details: errors.array(),
        },
      } as ApiResponse);
      return;
    }

    const { text, options = {} } = req.body;
    
    // Set default options
    const editingOptions: EditingOptions = {
      level: options.level || 'moderate',
      preserveStyle: options.preserveStyle !== false, // Default to true
      correctGrammar: options.correctGrammar !== false, // Default to true
      reorganizeStructure: options.reorganizeStructure || false,
    };

    logger.info('AI editing request received', {
      userId: req.user?.id,
      textLength: text.length,
      options: editingOptions,
    });

    const editedText = await aiEditingService.editContent(text, editingOptions);

    res.json({
      success: true,
      data: {
        originalText: text,
        editedText,
        options: editingOptions,
        timestamp: new Date().toISOString(),
      },
    } as ApiResponse);

    logger.info('AI editing completed successfully', {
      userId: req.user?.id,
      originalLength: text.length,
      editedLength: editedText.length,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/ai-editing/preserve-style
 * 保持写作风格的编辑
 */
router.post('/preserve-style', validateTextRequest, async (req: express.Request, res: express.Response, next: express.NextFunction): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        error: {
          message: '请求参数验证失败',
          details: errors.array(),
        },
      } as ApiResponse);
      return;
    }

    const { text, styleReference } = req.body;

    logger.info('Style preservation request received', {
      userId: req.user?.id,
      textLength: text.length,
      hasStyleReference: !!styleReference,
    });

    const editedText = await aiEditingService.preserveWritingStyle(text, styleReference);

    res.json({
      success: true,
      data: {
        originalText: text,
        editedText,
        styleReference,
        timestamp: new Date().toISOString(),
      },
    } as ApiResponse);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/ai-editing/correct-grammar
 * 语法和拼写纠错
 */
router.post('/correct-grammar', validateTextRequest, async (req: express.Request, res: express.Response, next: express.NextFunction): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        error: {
          message: '请求参数验证失败',
          details: errors.array(),
        },
      } as ApiResponse);
      return;
    }

    const { text } = req.body;

    logger.info('Grammar correction request received', {
      userId: req.user?.id,
      textLength: text.length,
    });

    const correctedText = await aiEditingService.correctSpellingAndGrammar(text);

    res.json({
      success: true,
      data: {
        originalText: text,
        correctedText,
        timestamp: new Date().toISOString(),
      },
    } as ApiResponse);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/ai-editing/reorganize
 * 段落结构重组
 */
router.post('/reorganize', validateTextRequest, async (req: express.Request, res: express.Response, next: express.NextFunction): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        error: {
          message: '请求参数验证失败',
          details: errors.array(),
        },
      } as ApiResponse);
      return;
    }

    const { text } = req.body;

    logger.info('Paragraph reorganization request received', {
      userId: req.user?.id,
      textLength: text.length,
    });

    const reorganizedText = await aiEditingService.reorganizeParagraphs(text);

    res.json({
      success: true,
      data: {
        originalText: text,
        reorganizedText,
        timestamp: new Date().toISOString(),
      },
    } as ApiResponse);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/ai-editing/suggestions
 * 获取AI编辑建议
 */
router.post('/suggestions', validateTextRequest, async (req: express.Request, res: express.Response, next: express.NextFunction): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        error: {
          message: '请求参数验证失败',
          details: errors.array(),
        },
      } as ApiResponse);
      return;
    }

    const { text } = req.body;

    logger.info('AI suggestions request received', {
      userId: req.user?.id,
      textLength: text.length,
    });

    const suggestions = await aiEditingService.generateAISuggestions(text);

    res.json({
      success: true,
      data: {
        text,
        suggestions,
        timestamp: new Date().toISOString(),
      },
    } as ApiResponse);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/ai-editing/session
 * 创建编辑会话
 */
router.post('/session', validateTextRequest, async (req: express.Request, res: express.Response, next: express.NextFunction): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        error: {
          message: '请求参数验证失败',
          details: errors.array(),
        },
      } as ApiResponse);
      return;
    }

    const { text } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      throw createError('用户未认证', 401);
    }

    logger.info('Creating editing session', {
      userId,
      textLength: text.length,
    });

    const session = await aiEditingService.createEditingSession(userId, text);

    res.json({
      success: true,
      data: session,
    } as ApiResponse);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/ai-editing/session/:sessionId
 * 更新编辑会话
 */
router.put('/session/:sessionId', async (req: express.Request, res: express.Response, next: express.NextFunction): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const updates = req.body;

    logger.info('Updating editing session', {
      sessionId,
      userId: req.user?.id,
    });

    const session = await aiEditingService.updateEditingSession(sessionId, updates);

    res.json({
      success: true,
      data: session,
    } as ApiResponse);
  } catch (error) {
    next(error);
  }
});

export default router;