// Vercel API Route for Authentication
import jwt from 'jsonwebtoken';

// Simple in-memory store for demo purposes
// In production, use a proper database or external service
const DEFAULT_USER_ID = 'default-user';
const DEFAULT_PASSWORD = process.env.DEFAULT_PASSWORD || 'Admin!234';

// Simple comparison function (not using bcrypt for Vercel compatibility)
const comparePassword = (inputPassword, storedPassword) => {
  return inputPassword === storedPassword;
};

export default async function handler(req, res) {
  const { path } = req.query;
  const fullPath = Array.isArray(path) ? `/${path.join('/')}` : path || '';

  // Handle login
  if (req.url.includes('/api/auth/login')) {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    try {
      // Compare passwords
      const isValid = comparePassword(password, DEFAULT_PASSWORD);

      if (!isValid) {
        return res.status(401).json({ error: 'Invalid password' });
      }

      // Generate JWT token
      const secret = process.env.JWT_SECRET || 'fallback_secret_for_development_only';
      const token = jwt.sign(
        { userId: DEFAULT_USER_ID, timestamp: Date.now() },
        secret,
        { expiresIn: '24h' }
      );

      // Set cookie with token (for browser-based auth)
      res.setHeader('Set-Cookie', [
        `session=${token}; Path=/; HttpOnly; SameSite=Strict; ${
          process.env.NODE_ENV === 'production' ? 'Secure;' : ''
        }`
      ]);

      return res.status(200).json({
        success: true,
        data: {
          user: {
            id: DEFAULT_USER_ID,
            createdAt: new Date().toISOString(),
            lastLoginAt: new Date().toISOString()
          },
          token
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({ error: 'Login failed' });
    }
  }

  // Handle logout
  if (req.url.includes('/api/auth/logout')) {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Clear session cookie
    res.setHeader('Set-Cookie', [
      'session=; Path=/; HttpOnly; Max-Age=0; SameSite=Strict;'
    ]);

    return res.status(200).json({
      success: true,
      data: { message: 'Logged out successfully' }
    });
  }

  // Handle session validation
  if (req.url.includes('/api/auth/validate')) {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Extract token from cookies or Authorization header
    const token = 
      req.cookies?.session || 
      req.headers.authorization?.replace('Bearer ', '') ||
      null;

    if (!token) {
      return res.status(401).json({ error: 'No authentication token provided' });
    }

    try {
      const secret = process.env.JWT_SECRET || 'fallback_secret_for_development_only';
      const decoded = jwt.verify(token, secret);

      return res.status(200).json({
        success: true,
        data: {
          valid: true,
          user: {
            id: DEFAULT_USER_ID,
            lastLoginAt: new Date().toISOString()
          }
        }
      });
    } catch (error) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  }

  // Handle get current user
  if (req.url.includes('/api/auth/me')) {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Extract token from cookies or Authorization header
    const token = 
      req.cookies?.session || 
      req.headers.authorization?.replace('Bearer ', '') ||
      null;

    if (!token) {
      return res.status(401).json({ error: 'No authentication token provided' });
    }

    try {
      const secret = process.env.JWT_SECRET || 'fallback_secret_for_development_only';
      const decoded = jwt.verify(token, secret);

      return res.status(200).json({
        success: true,
        data: {
          user: {
            id: DEFAULT_USER_ID,
            createdAt: new Date().toISOString(),
            lastLoginAt: new Date().toISOString()
          }
        }
      });
    } catch (error) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  }

  // If no route matched
  return res.status(404).json({ error: 'Route not found' });
}

export const config = {
  api: {
    bodyParser: true,
  },
};