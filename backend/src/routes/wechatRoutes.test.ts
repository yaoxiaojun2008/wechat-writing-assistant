import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { app } from '../server.js';
import { wechatService } from '../services/wechatService.js';

// Mock the WeChat service
vi.mock('../services/wechatService.js', () => ({
  wechatService: {
    isConfigured: vi.fn(),
    saveToDraft: vi.fn(),
    getDraftList: vi.fn(),
    publishArticle: vi.fn(),
    schedulePublication: vi.fn(),
    getTokenStatus: vi.fn(),
  },
}));

// Mock auth middleware to bypass authentication for tests
vi.mock('../middleware/authMiddleware.js', () => ({
  authenticateToken: (req: any, res: any, next: any) => {
    req.user = { id: 'test-user' };
    next();
  },
}));

describe('WeChat Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/wechat/drafts', () => {
    it('should save draft to WeChat when service is configured', async () => {
      // Mock service as configured
      vi.mocked(wechatService.isConfigured).mockReturnValue(true);
      vi.mocked(wechatService.saveToDraft).mockResolvedValue('mock-draft-id');

      const response = await request(app)
        .post('/api/wechat/drafts')
        .send({
          title: 'Test Article',
          content: 'This is a test article content.',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.wechatDraftId).toBe('mock-draft-id');
      expect(wechatService.saveToDraft).toHaveBeenCalledWith(
        'This is a test article content.',
        'Test Article'
      );
    });

    it('should return error when WeChat service is not configured', async () => {
      vi.mocked(wechatService.isConfigured).mockReturnValue(false);

      const response = await request(app)
        .post('/api/wechat/drafts')
        .send({
          title: 'Test Article',
          content: 'This is a test article content.',
        });

      expect(response.status).toBe(503);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('WECHAT_NOT_CONFIGURED');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/wechat/drafts')
        .send({
          title: '', // Empty title
          content: 'This is a test article content.',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/wechat/drafts', () => {
    it('should get draft list from WeChat', async () => {
      const mockDrafts = [
        {
          id: 'draft-1',
          wechatDraftId: 'wechat-1',
          title: 'Test Draft 1',
          content: 'Content 1',
          status: 'uploaded',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(wechatService.isConfigured).mockReturnValue(true);
      vi.mocked(wechatService.getDraftList).mockResolvedValue(mockDrafts);

      const response = await request(app).get('/api/wechat/drafts');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.drafts).toHaveLength(1);
      expect(response.body.data.drafts[0].title).toBe('Test Draft 1');
      expect(response.body.data.count).toBe(1);
    });
  });

  describe('POST /api/wechat/drafts/:draftId/publish', () => {
    it('should publish draft article', async () => {
      vi.mocked(wechatService.isConfigured).mockReturnValue(true);
      vi.mocked(wechatService.publishArticle).mockResolvedValue(true);

      const response = await request(app)
        .post('/api/wechat/drafts/test-draft-id/publish')
        .send({
          publishOptions: {
            targetAudience: 'all',
            enableComments: true,
            enableSharing: true,
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.published).toBe(true);
    });
  });

  describe('GET /api/wechat/status', () => {
    it('should return WeChat service status', async () => {
      vi.mocked(wechatService.isConfigured).mockReturnValue(true);
      vi.mocked(wechatService.getTokenStatus).mockReturnValue({
        hasToken: true,
        expiresAt: new Date(),
      });

      const response = await request(app).get('/api/wechat/status');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.configured).toBe(true);
    });
  });
});