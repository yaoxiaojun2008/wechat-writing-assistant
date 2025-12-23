import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { createClient } from 'redis';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { AuthService, User } from '../types/index.js';
import { createError } from '../middleware/errorHandler.js';

class AuthServiceImpl implements AuthService {
  private redisClient;
  private inMemoryStore: Map<string, any> = new Map();
  private useRedis = false;
  private readonly defaultUser = {
    id: 'default-user',
    passwordHash: '', // Will be set in constructor
    wechatConfig: {
      appId: '',
      appSecret: '',
    },
    preferences: {
      defaultPublishTime: '09:00',
      autoSave: true,
      voiceLanguage: 'zh-CN' as const,
      aiEditingLevel: 'moderate' as const,
    },
    createdAt: new Date(),
    lastLoginAt: new Date(),
  };

  constructor() {
    this.redisClient = createClient({ url: config.redisUrl });
    this.redisClient.on('error', (err) => {
      logger.warn('Redis Client Error, falling back to in-memory storage:', err);
      this.useRedis = false;
    });
    this.initializeDefaultUser();
  }

  private async initializeDefaultUser() {
    try {
      // Try to connect to Redis
      if (!this.useRedis) {
        try {
          await this.redisClient.connect();
          this.useRedis = true;
          logger.info('Connected to Redis');
        } catch (error) {
          logger.warn('Redis connection failed, using in-memory storage:', error);
          this.useRedis = false;
        }
      }
      
      // Create default password hash for development
      const defaultPassword = process.env.DEFAULT_PASSWORD || 'admin123';
      this.defaultUser.passwordHash = await bcrypt.hash(defaultPassword, 10);
      
      // Store default user
      if (this.useRedis) {
        await this.redisClient.set(
          `user:${this.defaultUser.id}`,
          JSON.stringify(this.defaultUser),
          { EX: 86400 } // 24 hours
        );
      } else {
        this.inMemoryStore.set(`user:${this.defaultUser.id}`, JSON.stringify(this.defaultUser));
      }
      
      logger.info('Default user initialized');
    } catch (error) {
      logger.error('Failed to initialize default user:', error);
    }
  }

  private async getValue(key: string): Promise<string | null> {
    if (this.useRedis) {
      try {
        return await this.redisClient.get(key);
      } catch (error) {
        logger.warn('Redis get failed, falling back to in-memory:', error);
        this.useRedis = false;
        return this.inMemoryStore.get(key) || null;
      }
    }
    return this.inMemoryStore.get(key) || null;
  }

  private async setValue(key: string, value: string, ttl?: number): Promise<void> {
    if (this.useRedis) {
      try {
        if (ttl) {
          await this.redisClient.set(key, value, { EX: ttl });
        } else {
          await this.redisClient.set(key, value);
        }
        return;
      } catch (error) {
        logger.warn('Redis set failed, falling back to in-memory:', error);
        this.useRedis = false;
      }
    }
    this.inMemoryStore.set(key, value);
  }

  private async deleteValue(key: string): Promise<void> {
    if (this.useRedis) {
      try {
        await this.redisClient.del(key);
        return;
      } catch (error) {
        logger.warn('Redis delete failed, falling back to in-memory:', error);
        this.useRedis = false;
      }
    }
    this.inMemoryStore.delete(key);
  }

  async validatePassword(password: string): Promise<boolean> {
    try {
      logger.info(`Attempting to validate password for user: ${this.defaultUser.id}`);
      
      const userStr = await this.getValue(`user:${this.defaultUser.id}`);
      if (!userStr) {
        logger.error('User not found in storage');
        throw createError('User not found', 404);
      }

      logger.info('User found in storage, comparing password');
      const user: User = JSON.parse(userStr);
      const isValid = await bcrypt.compare(password, user.passwordHash);
      
      logger.info(`Password validation result: ${isValid}`);
      
      if (isValid) {
        // Update last login time
        user.lastLoginAt = new Date();
        await this.setValue(
          `user:${user.id}`,
          JSON.stringify(user),
          86400
        );
      }

      return isValid;
    } catch (error) {
      logger.error('Password validation error:', error);
      throw createError('Authentication failed', 401);
    }
  }

  async createSession(userId: string): Promise<string> {
    try {
      const sessionId = jwt.sign(
        { userId, timestamp: Date.now() },
        config.jwtSecret,
        { expiresIn: '24h' }
      );

      // Store session
      await this.setValue(`session:${sessionId}`, userId, 86400);

      logger.info(`Session created for user: ${userId}`);
      return sessionId;
    } catch (error) {
      logger.error('Session creation error:', error);
      throw createError('Failed to create session', 500);
    }
  }

  async validateSession(sessionId: string): Promise<boolean> {
    try {
      // Verify JWT token
      jwt.verify(sessionId, config.jwtSecret);
      
      // Check if session exists
      const userId = await this.getValue(`session:${sessionId}`);
      return userId !== null;
    } catch (error) {
      logger.warn('Session validation failed:', error);
      return false;
    }
  }

  async destroySession(sessionId: string): Promise<void> {
    try {
      await this.deleteValue(`session:${sessionId}`);
      logger.info('Session destroyed');
    } catch (error) {
      logger.error('Session destruction error:', error);
      throw createError('Failed to destroy session', 500);
    }
  }

  async getUserById(userId: string): Promise<User | null> {
    try {
      const userStr = await this.getValue(`user:${userId}`);
      if (!userStr) {
        return null;
      }
      return JSON.parse(userStr);
    } catch (error) {
      logger.error('Get user error:', error);
      return null;
    }
  }

  async getUserFromSession(sessionId: string): Promise<User | null> {
    try {
      const userId = await this.getValue(`session:${sessionId}`);
      if (!userId) {
        return null;
      }
      return this.getUserById(userId);
    } catch (error) {
      logger.error('Get user from session error:', error);
      return null;
    }
  }
}

export const authService = new AuthServiceImpl();