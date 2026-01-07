import express from 'express';
import multer from 'multer';
import { logger } from '../utils/logger.js';
import { voiceService } from '../services/voiceService.js';
// 导入 aiEditingService
import { aiEditingService } from '../services/aiEditingService.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { ApiResponse } from '../types/index.js';

const router = express.Router();

// Configure multer for audio file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (_req, file, cb) => {
    const isValid = voiceService.validateAudioFormat(file);
    if (isValid) {
      cb(null, true);
    } else {
      cb(new Error('不支持的音频格式或文件过大'));
    }
  },
});

// POST /api/voice/transcribe - Upload audio and get transcription
router.post('/transcribe', authenticateToken, (req, res, next) => {
  // Only proceed with multer if authenticated
  upload.single('audio')(req, res, next);
}, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { message: '用户未认证' }
      } as ApiResponse);
    }

    const audioFile = req.file;
    if (!audioFile) {
      return res.status(400).json({
        success: false,
        error: { message: '未找到音频文件' }
      } as ApiResponse);
    }

    logger.info(`Processing audio transcription for user: ${userId}, file size: ${audioFile.size}`);

    // Validate audio format
    if (!voiceService.validateAudioFormat(audioFile)) {
      return res.status(400).json({
        success: false,
        error: { message: '不支持的音频格式或文件过大' }
      } as ApiResponse);
    }

    // Transcribe audio
    const transcribedText = await voiceService.transcribeAudio(audioFile.buffer, userId);

    res.json({
      success: true,
      data: {
        transcribedText,
        timestamp: new Date().toISOString()
      }
    } as ApiResponse);
    return;

  } catch (error) {
    logger.error('Voice transcription error:', error);

    const errorMessage = error instanceof Error ? error.message : '语音处理失败';
    res.status(500).json({
      success: false,
      error: { message: errorMessage }
    } as ApiResponse);
    return;
  }
});

// POST /api/voice/session - Create a new voice session
router.post('/session', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { message: '用户未认证' }
      } as ApiResponse);
    }

    const session = await voiceService.createVoiceSession(userId);

    res.json({
      success: true,
      data: session
    } as ApiResponse);
    return;

  } catch (error) {
    logger.error('Voice session creation error:', error);

    res.status(500).json({
      success: false,
      error: { message: '创建语音会话失败' }
    } as ApiResponse);
    return;
  }
});

// POST /api/voice/process - Process transcription with AI
router.post('/process', authenticateToken, async (req, res) => {
  try {
    // Get the transcription result
    const transcription = req.body.transcription;
    if (!transcription) {
      return res.status(400).json({ error: 'No transcription provided' });
    }

    // Process the transcription with AI if needed
    let processedText = transcription;
    if (req.body.useAI) {
      processedText = await aiEditingService.editContent(transcription, { level: 'moderate', preserveStyle: true, correctGrammar: true, reorganizeStructure: false });
    }

    res.status(200).json({ processedText });
    return;
  } catch (error: any) {
    logger.error('Error processing transcription:', error);
    res.status(500).json({ error: error.message });
    return;
  }
});

// Error handling middleware for multer
router.use((error: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({
        success: false,
        error: { message: '音频文件过大，请上传小于10MB的文件' }
      } as ApiResponse);
      return;
    }
  }

  if (error.message) {
    res.status(400).json({
      success: false,
      error: { message: error.message }
    } as ApiResponse);
    return;
  }

  res.status(500).json({
    success: false,
    error: { message: 'Internal Server Error' }
  } as ApiResponse);
  return;
});

export { router as voiceRoutes };
