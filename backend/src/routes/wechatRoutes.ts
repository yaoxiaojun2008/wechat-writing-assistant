import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { wechatService } from '../services/wechatService.js';
import { logger } from '../utils/logger.js';
import { ApiResponse, Draft, PublishOptions, PublishSchedule } from '../types/index.js';

const router = express.Router();

// Apply authentication middleware to all WeChat routes
router.use(authenticateToken);

/**
 * Save content as draft to WeChat
 * POST /api/wechat/drafts
 */
router.post('/drafts',
  [
    body('title')
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage('Title must be between 1 and 200 characters'),
    body('content')
      .trim()
      .isLength({ min: 1 })
      .withMessage('Content cannot be empty'),
  ],
  async (req: Request, res: Response) => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const response: ApiResponse = {
          success: false,
          error: {
            message: 'Validation failed',
            code: 'VALIDATION_ERROR',
          },
        };
        return res.status(400).json(response);
      }

      const { title, content } = req.body;
      const userId = req.user?.id;

      logger.info(`User ${userId} saving draft: ${title}`);

      // Check if WeChat service is configured
      if (!wechatService.isConfigured()) {
        const response: ApiResponse = {
          success: false,
          error: {
            message: 'WeChat API not configured',
            code: 'WECHAT_NOT_CONFIGURED',
          },
        };
        return res.status(503).json(response);
      }

      // Save to WeChat
      const wechatDraftId = await wechatService.saveToDraft(content, title);

      // Create local draft record
      const draft: Draft = {
        id: `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        wechatDraftId,
        title,
        content,
        status: 'uploaded',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const response: ApiResponse<{ draft: Draft; wechatDraftId: string }> = {
        success: true,
        data: {
          draft,
          wechatDraftId,
        },
      };

      logger.info(`Draft saved successfully for user ${userId}: ${wechatDraftId}`);
      res.json(response);

    } catch (error) {
      logger.error('Error saving draft to WeChat:', error);
      
      const response: ApiResponse = {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Failed to save draft',
          code: 'DRAFT_SAVE_ERROR',
        },
      };
      
      res.status(500).json(response);
    }
  }
);

/**
 * Get list of drafts from WeChat
 * GET /api/wechat/drafts
 */
router.get('/drafts', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    logger.info(`User ${userId} fetching draft list`);

    // Check if WeChat service is configured
    if (!wechatService.isConfigured()) {
      const response: ApiResponse = {
        success: false,
        error: {
          message: 'WeChat API not configured',
          code: 'WECHAT_NOT_CONFIGURED',
        },
      };
      return res.status(503).json(response);
    }

    // Get drafts from WeChat
    const drafts = await wechatService.getDraftList();

    const response: ApiResponse<{ drafts: Draft[]; count: number }> = {
      success: true,
      data: {
        drafts,
        count: drafts.length,
      },
    };

    logger.info(`Retrieved ${drafts.length} drafts for user ${userId}`);
    res.json(response);

  } catch (error) {
    logger.error('Error fetching draft list from WeChat:', error);
    
    const response: ApiResponse = {
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Failed to fetch drafts',
        code: 'DRAFT_FETCH_ERROR',
      },
    };
    
    res.status(500).json(response);
  }
});

/**
 * Publish a draft article
 * POST /api/wechat/drafts/:draftId/publish
 */
router.post('/drafts/:draftId/publish',
  [
    body('publishOptions.targetAudience')
      .isIn(['all', 'subscribers', 'custom'])
      .withMessage('Invalid target audience'),
    body('publishOptions.enableComments')
      .isBoolean()
      .withMessage('enableComments must be boolean'),
    body('publishOptions.enableSharing')
      .isBoolean()
      .withMessage('enableSharing must be boolean'),
  ],
  async (req: Request, res: Response) => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const response: ApiResponse = {
          success: false,
          error: {
            message: 'Validation failed',
            code: 'VALIDATION_ERROR',
          },
        };
        return res.status(400).json(response);
      }

      const { draftId } = req.params;
      const { publishOptions }: { publishOptions: PublishOptions } = req.body;
      const userId = req.user?.id;

      logger.info(`User ${userId} publishing draft: ${draftId}`);

      // Check if WeChat service is configured
      if (!wechatService.isConfigured()) {
        const response: ApiResponse = {
          success: false,
          error: {
            message: 'WeChat API not configured',
            code: 'WECHAT_NOT_CONFIGURED',
          },
        };
        return res.status(503).json(response);
      }

      // Publish to WeChat
      const success = await wechatService.publishArticle(draftId, publishOptions);

      if (success) {
        const response: ApiResponse<{ published: boolean; publishedAt: Date }> = {
          success: true,
          data: {
            published: true,
            publishedAt: new Date(),
          },
        };

        logger.info(`Draft published successfully for user ${userId}: ${draftId}`);
        res.json(response);
      } else {
        throw new Error('Publication failed');
      }

    } catch (error) {
      logger.error('Error publishing draft to WeChat:', error);
      
      const response: ApiResponse = {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Failed to publish draft',
          code: 'DRAFT_PUBLISH_ERROR',
        },
      };
      
      res.status(500).json(response);
    }
  }
);

/**
 * Schedule publication of a draft
 * POST /api/wechat/drafts/:draftId/schedule
 */
router.post('/drafts/:draftId/schedule',
  [
    body('scheduledTime')
      .isISO8601()
      .withMessage('Invalid scheduled time format')
      .custom((value) => {
        const scheduledTime = new Date(value);
        const now = new Date();
        if (scheduledTime <= now) {
          throw new Error('Scheduled time must be in the future');
        }
        return true;
      }),
    body('publishOptions.targetAudience')
      .isIn(['all', 'subscribers', 'custom'])
      .withMessage('Invalid target audience'),
    body('publishOptions.enableComments')
      .isBoolean()
      .withMessage('enableComments must be boolean'),
    body('publishOptions.enableSharing')
      .isBoolean()
      .withMessage('enableSharing must be boolean'),
  ],
  async (req: Request, res: Response) => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const response: ApiResponse = {
          success: false,
          error: {
            message: 'Validation failed',
            code: 'VALIDATION_ERROR',
          },
        };
        return res.status(400).json(response);
      }

      const { draftId } = req.params;
      const { scheduledTime, publishOptions } = req.body;
      const userId = req.user?.id;

      logger.info(`User ${userId} scheduling draft publication: ${draftId} at ${scheduledTime}`);

      // Check if WeChat service is configured
      if (!wechatService.isConfigured()) {
        const response: ApiResponse = {
          success: false,
          error: {
            message: 'WeChat API not configured',
            code: 'WECHAT_NOT_CONFIGURED',
          },
        };
        return res.status(503).json(response);
      }

      // Create schedule object
      const schedule: PublishSchedule = {
        draftId,
        scheduledTime: new Date(scheduledTime),
        publishOptions,
        status: 'pending',
        createdAt: new Date(),
      };

      // Schedule publication
      const taskId = await wechatService.schedulePublication(draftId, schedule);

      const response: ApiResponse<{ taskId: string; schedule: PublishSchedule }> = {
        success: true,
        data: {
          taskId,
          schedule,
        },
      };

      logger.info(`Draft publication scheduled successfully for user ${userId}: ${taskId}`);
      res.json(response);

    } catch (error) {
      logger.error('Error scheduling draft publication:', error);
      
      const response: ApiResponse = {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Failed to schedule publication',
          code: 'SCHEDULE_ERROR',
        },
      };
      
      res.status(500).json(response);
    }
  }
);

/**
 * Get WeChat service status
 * GET /api/wechat/status
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    logger.info(`User ${userId} checking WeChat service status`);

    const isConfigured = wechatService.isConfigured();
    const tokenStatus = wechatService.getTokenStatus();

    const response: ApiResponse<{
      configured: boolean;
      tokenStatus: { hasToken: boolean; expiresAt: Date | null };
    }> = {
      success: true,
      data: {
        configured: isConfigured,
        tokenStatus,
      },
    };

    res.json(response);

  } catch (error) {
    logger.error('Error checking WeChat service status:', error);
    
    const response: ApiResponse = {
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Failed to check status',
        code: 'STATUS_ERROR',
      },
    };
    
    res.status(500).json(response);
  }
});

export default router;