import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { AuthService, User } from '../types/index.js';
import { createError } from '../middleware/errorHandler.js';

class AuthServiceImpl implements AuthService {
  private readonly defaultUser = {
    id: 'default-user',
    passwordHash: '', // Will be set during initialization
    wechatConfig: {
      appId: process.env.WECHAT_APP_ID || '',
      appSecret: process.env.WECHAT_APP_SECRET || '',
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

  private passwordHashPromise: Promise<string>;

  constructor() {
    this.passwordHashPromise = this.initializeDefaultUser();
  }

  private initializeDefaultUser(): Promise<string> {
    logger.info('Initializing default user...');

    // Create default password hash for development
    const defaultPassword = process.env.DEFAULT_PASSWORD || 'admin123';
    logger.info(`Creating default user with password length: ${defaultPassword.length}`);

    return bcrypt.hash(defaultPassword, 10).then(hash => {
      this.defaultUser.passwordHash = hash;
      logger.info('Default user initialized with password hash');
      return hash;
    }).catch(error => {
      logger.error('Failed to hash default password:', error);
      throw error;
    });
  }

  async validatePassword(password: string): Promise<boolean> {
    try {
      logger.info(`Attempting to validate password for user: ${this.defaultUser.id}`);

      // Wait for password hash initialization if needed
      if (!this.defaultUser.passwordHash) {
        logger.info('Waiting for password hash initialization...');
        await this.passwordHashPromise;
      }

      // DEBUG LOGGING
      logger.info(`Input password length: ${password.length}`);
      logger.info(`Stored hash length: ${this.defaultUser.passwordHash.length}`);
      logger.info(`Stored hash prefix: ${this.defaultUser.passwordHash.substring(0, 10)}...`);

      const isValid = await bcrypt.compare(password, this.defaultUser.passwordHash);

      logger.info(`Password validation result: ${isValid}`);

      if (isValid) {
        // Update last login time
        this.defaultUser.lastLoginAt = new Date();
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
      return true;
    } catch (error) {
      logger.warn('Session validation failed:', error);
      return false;
    }
  }

  async destroySession(_sessionId: string): Promise<void> {
    try {
      // With stateless auth, we don't need to store sessions
      // Simply rely on JWT expiration for session invalidation
      logger.info('Session destroyed (stateless - relying on JWT expiration)');
    } catch (error) {
      logger.error('Session destruction error:', error);
      throw createError('Failed to destroy session', 500);
    }
  }

  async getUserById(userId: string): Promise<User | null> {
    try {
      // For simplicity, return the default user if ID matches
      if (userId === this.defaultUser.id) {
        return {
          ...this.defaultUser
        };
      }
      return null;
    } catch (error) {
      logger.error('Get user error:', error);
      return null;
    }
  }

  async getUserFromSession(sessionId: string): Promise<User | null> {
    try {
      // Verify JWT token to extract userId
      const decoded = jwt.verify(sessionId, config.jwtSecret) as { userId: string };
      return this.getUserById(decoded.userId);
    } catch (error) {
      logger.error('Get user from session error:', error);
      return null;
    }
  }
}

export const authService = new AuthServiceImpl();