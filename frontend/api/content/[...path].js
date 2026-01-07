// Vercel API Route for Content-related Endpoints
import { createProxyMiddleware } from 'http-proxy-middleware';

const proxy = createProxyMiddleware({
  target: process.env.BACKEND_URL || 'http://localhost:3001',
  changeOrigin: true,
  pathRewrite: {
    '^/api/content': '/api/content', // Adjust the path as needed
  },
});

export default function handler(req, res) {
  // For Vercel deployment, we would either:
  // 1. Proxy to a separate backend instance, or
  // 2. Implement the functionality directly in this function
  
  // Since Vercel Functions are serverless, we need to implement the functionality directly
  // This is a simplified implementation for content-related endpoints
  
  const { path } = req.query;
  const fullPath = Array.isArray(path) ? `/${path.join('/')}` : path || '';
  
  // Mock implementation for content endpoints
  if (req.url.includes('/api/content/save-draft')) {
    if (req.method === 'POST') {
      // Simulate saving draft
      return res.status(200).json({
        success: true,
        data: {
          message: 'Draft saved successfully',
          timestamp: new Date().toISOString(),
          id: 'draft-' + Date.now()
        }
      });
    }
  }
  
  if (req.url.includes('/api/content/history')) {
    if (req.method === 'GET') {
      // Return mock history
      return res.status(200).json({
        success: true,
        data: {
          history: [
            { id: '1', title: 'Sample Article', timestamp: '2026-01-07T10:00:00Z', content: 'Sample content...' },
            { id: '2', title: 'Another Article', timestamp: '2026-01-06T15:30:00Z', content: 'More sample content...' }
          ]
        }
      });
    }
  }
  
  if (req.url.includes('/api/content/publish')) {
    if (req.method === 'POST') {
      // Simulate publishing
      return res.status(200).json({
        success: true,
        data: {
          message: 'Content published successfully',
          publishTime: new Date().toISOString()
        }
      });
    }
  }
  
  // Fallback to proxy if not handled here
  return proxy(req, res, () => {
    res.status(404).json({ error: 'Route not found' });
  });
}

export const config = {
  api: {
    bodyParser: true,
  },
};