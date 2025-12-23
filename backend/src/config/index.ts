import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export const config = {
  // Server configuration
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',

  // Database configuration
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',

  // Authentication
  jwtSecret: process.env.JWT_SECRET || 'default-jwt-secret',
  sessionSecret: process.env.SESSION_SECRET || 'default-session-secret',

  // WeChat API configuration
  wechat: {
    appId: process.env.WECHAT_APP_ID || '',
    appSecret: process.env.WECHAT_APP_SECRET || '',
  },

  // AI LLM configuration
  ai: {
    provider: process.env.AI_PROVIDER || 'openai', // 'openai' or 'gemini'
    openai: {
      apiKey: process.env.OPENAI_API_KEY || '',
      model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
    },
    gemini: {
      apiKey: process.env.GEMINI_API_KEY || '',
      model: process.env.GEMINI_MODEL || 'gemini-1.5-pro',
    },
  },

  // Legacy OpenAI configuration (for backward compatibility)
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
  },

  // Speech recognition configuration
  speech: {
    provider: process.env.SPEECH_API_PROVIDER || 'web-speech-api',
  },

  // File upload configuration
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 10MB
    uploadPath: process.env.UPLOAD_PATH || './uploads',
  },

  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
};

// Validate required environment variables
const requiredEnvVars = ['JWT_SECRET'];

if (config.nodeEnv === 'production') {
  requiredEnvVars.push(
    'WECHAT_APP_ID',
    'WECHAT_APP_SECRET',
    'OPENAI_API_KEY'
  );
}

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Required environment variable ${envVar} is not set`);
  }
}