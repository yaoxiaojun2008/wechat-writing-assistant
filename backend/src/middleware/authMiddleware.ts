import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/authService.js';
import { createError } from './errorHandler.js';
import { logger } from '../utils/logger.js';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: any;
      sessionId?: string;
    }
  }
}

export const authenticateToken = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    logger.info(`Auth header: ${authHeader}`);
    
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    logger.info(`Extracted token: ${token ? 'present' : 'missing'}`);

    if (!token) {
      throw createError('Access token required', 401);
    }

    const isValidSession = await authService.validateSession(token);
    logger.info(`Session validation result: ${isValidSession}`);
    
    if (!isValidSession) {
      throw createError('Invalid or expired session', 401);
    }

    // Get user from session
    const user = await authService.getUserFromSession(token);
    if (!user) {
      throw createError('User not found', 404);
    }

    req.user = user;
    req.sessionId = token;
    next();
  } catch (error) {
    logger.warn('Authentication failed:', error);
    next(error);
  }
};

export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const isValidSession = await authService.validateSession(token);
      if (isValidSession) {
        const user = await authService.getUserFromSession(token);
        req.user = user;
        req.sessionId = token;
      }
    }

    next();
  } catch (error) {
    // For optional auth, we don't fail on errors
    logger.debug('Optional auth failed:', error);
    next();
  }
};