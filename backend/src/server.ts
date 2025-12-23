import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { logger } from './utils/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { rateLimiter } from './middleware/rateLimiter.js';
import authRoutes from './routes/authRoutes.js';
import { voiceRoutes } from './routes/voiceRoutes.js';
import aiEditingRoutes from './routes/aiEditingRoutes.js';
import contentEditingRoutes from './routes/contentEditingRoutes.js';
import wechatRoutes from './routes/wechatRoutes.js';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

// Rate limiting
app.use(rateLimiter);

// Logging
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.get('/api', (_req, res) => {
  res.json({ message: '微信公众号写作助手 API 服务已启动' });
});

// Auth routes
app.use('/api/auth', authRoutes);

// Voice routes
app.use('/api/voice', voiceRoutes);

// AI editing routes
app.use('/api/ai-editing', aiEditingRoutes);

// Content editing routes
app.use('/api/content-editing', contentEditingRoutes);

// WeChat routes
app.use('/api/wechat', wechatRoutes);

// Error handling
app.use(errorHandler);

// Start server only if not in test mode
if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

export { app, server };