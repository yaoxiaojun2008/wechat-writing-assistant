// Vercel API Route for WeChat-related Endpoints
import axios from 'axios';

export default async function handler(req, res) {
  const { path } = req.query;
  const fullPath = Array.isArray(path) ? `/${path.join('/')}` : path || '';

  if (req.url.includes('/api/wechat/media/upload')) {
    if (req.method === 'POST') {
      try {
        // In a real implementation, this would call WeChat API directly
        // For Vercel compatibility, we'll simulate the response
        
        // Extract media type and file from request
        // Note: In a real implementation, you'd need to parse multipart form data
        
        return res.status(200).json({
          success: true,
          data: {
            mediaId: 'media_' + Date.now(),
            url: `https://mmbiz.qpic.cn/mmbiz_png/example/${Date.now()}`,
            type: 'image', // or video, thumb, voice
            createdAt: Math.floor(Date.now() / 1000)
          }
        });
      } catch (error) {
        console.error('Media upload error:', error);
        return res.status(500).json({
          success: false,
          error: { message: 'Media upload failed', details: error.message }
        });
      }
    }
  }

  if (req.url.includes('/api/wechat/draft/list')) {
    if (req.method === 'GET') {
      try {
        // Mock response for draft list
        return res.status(200).json({
          success: true,
          data: {
            drafts: [
              {
                id: 'draft_1',
                title: 'Sample Draft 1',
                content: 'This is sample draft content...',
                createdAt: '2026-01-07T10:00:00Z',
                updatedAt: '2026-01-07T10:00:00Z',
                status: 'draft'
              },
              {
                id: 'draft_2',
                title: 'Sample Draft 2',
                content: 'This is another sample draft...',
                createdAt: '2026-01-06T15:30:00Z',
                updatedAt: '2026-01-06T15:30:00Z',
                status: 'draft'
              }
            ],
            total: 2
          }
        });
      } catch (error) {
        console.error('Draft list error:', error);
        return res.status(500).json({
          success: false,
          error: { message: 'Failed to fetch drafts', details: error.message }
        });
      }
    }
  }

  if (req.url.includes('/api/wechat/publish/status')) {
    if (req.method === 'GET') {
      try {
        // Mock response for publish status
        return res.status(200).json({
          success: true,
          data: {
            status: 'published',
            publishTime: '2026-01-05T09:00:00Z',
            articleUrl: 'https://mp.weixin.qq.com/sample-article-url',
            taskId: 'publish_task_123'
          }
        });
      } catch (error) {
        console.error('Publish status error:', error);
        return res.status(500).json({
          success: false,
          error: { message: 'Failed to get publish status', details: error.message }
        });
      }
    }
  }

  // For endpoints that require real WeChat API integration
  if (req.url.includes('/api/wechat/real-api')) {
    // In a real implementation, this would connect to WeChat API
    // You'd need to configure WECHAT_APP_ID and WECHAT_APP_SECRET in Vercel dashboard
    
    const appId = process.env.WECHAT_APP_ID;
    const appSecret = process.env.WECHAT_APP_SECRET;
    
    if (!appId || !appSecret) {
      return res.status(400).json({
        success: false,
        error: { message: 'WeChat API credentials not configured' }
      });
    }
    
    try {
      // Example: Get access token
      if (fullPath.includes('access-token')) {
        // In a real implementation, call WeChat API to get access token
        // const response = await axios.post(`https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appId}&secret=${appSecret}`);
        
        // Mock response
        return res.status(200).json({
          success: true,
          data: {
            accessToken: 'mock_access_token_' + Date.now(),
            expiresIn: 7200,
            timestamp: Date.now()
          }
        });
      }
    } catch (error) {
      console.error('WeChat API error:', error);
      return res.status(500).json({
        success: false,
        error: { message: 'WeChat API call failed', details: error.message }
      });
    }
  }

  return res.status(404).json({ error: 'WeChat endpoint not found' });
}

export const config = {
  api: {
    bodyParser: true,
    maxDuration: 30, // Allow longer execution for API calls
  },
};