import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authService } from '../services/authService.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { createError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';
import { ApiResponse, LoginRequest, LoginResponse } from '../types/index.js';

const router = Router();

// Login endpoint
router.post('/login',
  [
    body('password')
      .isLength({ min: 1 })
      .withMessage('Password is required')
      .trim()
      .escape(),
  ],
  async (req: Request, res: Response<ApiResponse<LoginResponse>>) => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw createError('Invalid input data', 400);
      }

      const { password }: LoginRequest = req.body;

      // Validate password
      const isValidPassword = await authService.validatePassword(password);
      if (!isValidPassword) {
        throw createError('Invalid password', 401);
      }

      // Create session
      const sessionId = await authService.createSession('default-user');
      
      // Get user data
      const user = await authService.getUserById('default-user');
      if (!user) {
        throw createError('User not found', 404);
      }

      // Remove sensitive data from response
      const { passwordHash, ...userResponse } = user;

      logger.info('User logged in successfully');

      res.json({
        success: true,
        data: {
          user: userResponse,
          sessionId,
        },
      });
    } catch (error) {
      logger.error('Login error:', error);
      throw error;
    }
  }
);

// Logout endpoint
router.post('/logout',
  authenticateToken,
  async (req: Request, res: Response<ApiResponse>) => {
    try {
      if (req.sessionId) {
        await authService.destroySession(req.sessionId);
      }

      logger.info('User logged out successfully');

      res.json({
        success: true,
        data: { message: 'Logged out successfully' },
      });
    } catch (error) {
      logger.error('Logout error:', error);
      throw error;
    }
  }
);

// Get current user endpoint
router.get('/me',
  authenticateToken,
  async (req: Request, res: Response<ApiResponse>) => {
    try {
      if (!req.user) {
        throw createError('User not found', 404);
      }

      // Remove sensitive data from response
      const { passwordHash, ...userResponse } = req.user;

      res.json({
        success: true,
        data: { user: userResponse },
      });
    } catch (error) {
      logger.error('Get user error:', error);
      throw error;
    }
  }
);

// Validate session endpoint
router.get('/validate',
  authenticateToken,
  async (req: Request, res: Response<ApiResponse>) => {
    try {
      res.json({
        success: true,
        data: { valid: true, user: req.user },
      });
    } catch (error) {
      logger.error('Session validation error:', error);
      throw error;
    }
  }
);

export default router;