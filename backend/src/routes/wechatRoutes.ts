import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import multer from 'multer';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { wechatService } from '../services/wechatService.js';
import { logger } from '../utils/logger.js';
import { ApiResponse, Draft, PublishOptions, PublishSchedule } from '../types/index.js';

// Configure multer for file uploads
const storage = multer.memoryStorage(); // Store files in memory temporarily
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit (increased from 5MB)
    files: 10 // Max 10 files
  },
  fileFilter: (_req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Export the router
export const router = express.Router();

// Apply authentication middleware to all WeChat routes
router.use(authenticateToken);

/**
 * Upload permanent image (for use as thumbnail)
 * POST /api/wechat/images/permanent
 */
router.post('/images/permanent', upload.single('image'), async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const imageFile = req.file;
    if (!imageFile) {
      // 检查是否是由于文件太大导致的错误
      if ((req as any).file && (req as any).file.size > 10 * 1024 * 1024) {
        return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
      }
      return res.status(400).json({ error: 'No image file provided' });
    }

    // Upload image to WeChat permanent material library
    const filePath = imageFile.path || imageFile.buffer.toString('base64');
    const imageUrl = await wechatService.uploadPermanentImage(filePath);
    
    return res.status(200).json({ success: true, data: { url: imageUrl } });
  } catch (error: any) {
    logger.error('Error uploading permanent image:', error);
    
    // 特别处理文件太大的错误
    if (error && error.code && error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
    }
    
    return res.status(500).json({ error: (error as Error).message || 'Unknown error' });
  }
});

/**
 * Upload content image (for use in article content)
 * POST /api/wechat/images/content
 */
router.post('/images/content', upload.single('image'), async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const imageFile = req.file;
    if (!imageFile) {
      // 检查是否是由于文件太大导致的错误
      if ((req as any).file && (req as any).file.size > 10 * 1024 * 1024) {
        return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
      }
      return res.status(400).json({ error: 'No image file provided' });
    }

    // Upload image to WeChat for use in articles
    const filePath = imageFile.path || imageFile.buffer.toString('base64');
    const imageUrl = await wechatService.uploadContentImage(filePath);
    
    return res.status(200).json({ success: true, data: { url: imageUrl } });
  } catch (error: any) {
    logger.error('Error uploading content image:', error);
    
    // 特别处理文件太大的错误
    if (error && error.code && error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
    }
    
    return res.status(500).json({ error: (error as Error).message || 'Unknown error' });
  }
});

/**
 * Upload draft with images
 * POST /api/wechat/drafts-with-images
 */
router.post('/drafts-with-images', 
  upload.array('images', 10), // Allow up to 10 image files
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
      const files = req.files as Express.Multer.File[] || [];
      const userId = req.user?.id;

      logger.info(`User ${userId} creating draft with images: ${title}, with ${files.length} image(s)`);

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

      // Process each image file and upload to WeChat
      const uploadedMediaIds: string[] = [];
      let thumbnailMediaId: string | null = null;

      // First, upload all images
      for (const file of files) {
        // Check file size before processing
        if (file.size > 10 * 1024 * 1024) { // 10MB
          const response: ApiResponse = {
            success: false,
            error: {
              message: 'One or more files are too large. Maximum size is 10MB.',
              code: 'FILE_TOO_LARGE',
            },
          };
          return res.status(400).json(response);
        }
        
        // Write the uploaded file to a temporary location
        const fs = await import('fs');
        const path = await import('path');
        
        // Create a temporary file
        const tempDir = path.join(process.cwd(), 'temp');
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }
        
        const fileName = `temp_${Date.now()}_${file.originalname}`;
        const filePath = path.join(tempDir, fileName);
        
        // Write buffer to file
        fs.writeFileSync(filePath, file.buffer);
        
        try {
          // Upload image to WeChat permanent media library
          const mediaId = await wechatService.uploadPermanentImage(filePath);
          uploadedMediaIds.push(mediaId);
          
          // Use the first uploaded image as thumbnail
          if (!thumbnailMediaId) {
            thumbnailMediaId = mediaId;
          }
        } finally {
          // Clean up temporary file
          try {
            fs.unlinkSync(filePath);
          } catch (cleanupErr) {
            logger.error(`Failed to clean up temp file ${filePath}:`, cleanupErr);
          }
        }
      }

      // After all images are uploaded, create the draft
      if (thumbnailMediaId) {
        try {
          // Create draft with images using the first image as thumbnail
          const result = await wechatService.createDraftWithImages(
            title, 
            content, 
            thumbnailMediaId
          );

          // Create local draft record
          const draft: Draft = {
            id: `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            wechatDraftId: result.wechatDraftId,
            title,
            content,
            status: 'uploaded',
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          return res.status(200).json({
            success: true,
            data: {
              draft,
              wechatDraftId: result.wechatDraftId,
            },
          });
        } catch (error) {
          logger.error('Error creating draft with images on WeChat:', error);
          
          const response: ApiResponse = {
            success: false,
            error: {
              message: error instanceof Error ? error.message : 'Failed to create draft with images',
              code: 'DRAFT_CREATE_ERROR',
            },
          };
          
          return res.status(500).json(response);
        }
      } else {
        // No images were provided, create a regular draft
        try {
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
          return res.status(200).json(response);
        } catch (error) {
          logger.error('Error creating draft without images on WeChat:', error);
          
          const response: ApiResponse = {
            success: false,
            error: {
              message: error instanceof Error ? error.message : 'Failed to create draft',
              code: 'DRAFT_CREATE_ERROR',
            },
          };
          
          return res.status(500).json(response);
        }
      }
    } catch (error) {
      logger.error('Error creating draft with images to WeChat:', error);
      
      // 特别处理文件太大的错误
      if (error && (error as any).code === 'LIMIT_FILE_SIZE') {
        const response: ApiResponse = {
          success: false,
          error: {
            message: 'One or more files are too large. Maximum size is 10MB.',
            code: 'FILE_TOO_LARGE',
          },
        };
        return res.status(400).json(response);
      }
      
      const response: ApiResponse = {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Failed to create draft with images',
          code: 'DRAFT_CREATE_ERROR',
        },
      };
      
      return res.status(500).json(response);
    }
  }
);

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

      const content = req.body.content;
      const title = req.body.title;
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

      logger.info(`Draft saved successfully for user ${userId}: ${wechatDraftId}`);
      return res.json({
        success: true,
        data: {
          draft,
          wechatDraftId,
        },
      });
    } catch (error) {
      logger.error('Error saving draft to WeChat:', error);
      return res.status(500).json({ error: (error as Error).message || 'Unknown error' });
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
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const drafts = await wechatService.getDraftList();
    
    return res.status(200).json({ success: true, data: drafts });
  } catch (error: any) {
    logger.error('Error getting drafts:', error);
    return res.status(500).json({ error: (error as Error).message || 'Unknown error' });
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
        return res.json(response);
      } else {
        const response: ApiResponse = {
          success: false,
          error: {
            message: 'Publication failed',
            code: 'DRAFT_PUBLISH_ERROR',
          },
        };
        
        logger.error(`Failed to publish draft for user ${userId}: ${draftId}`);
        return res.status(500).json(response);
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
      
      return res.status(500).json(response);
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
      return res.json(response);

    } catch (error) {
      logger.error('Error scheduling publication:', error);
      
      const response: ApiResponse = {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Failed to schedule publication',
          code: 'SCHEDULE_ERROR',
        },
      };
      
      return res.status(500).json(response);
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

/**
 * Delete a draft
 * DELETE /api/wechat/drafts/:draftId
 */
router.delete('/drafts/:draftId', async (req: Request, res: Response) => {
  try {
    const { draftId } = req.params;
    const userId = req.user?.id;

    if (!draftId) {
      return res.status(400).json({ error: 'Draft ID is required' });
    }

    logger.info(`User ${userId} deleting draft: ${draftId}`);

    // Since WeChat API doesn't support deleting drafts directly, we'll just log the intent
    // In a real implementation, you might want to manage your own draft mapping
    
    logger.info(`Draft deletion request processed for user ${userId}: ${draftId}`);

    return res.status(200).json({ success: true });
  } catch (error: any) {
    logger.error('Error handling draft deletion:', error);
    return res.status(500).json({ error: (error as Error).message || 'Unknown error' });
  }
});

export default router;