import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../server.js';

describe('Voice Routes', () => {
  let authToken: string;

  beforeAll(async () => {
    // Login to get auth token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({ password: 'admin123' });
    
    authToken = loginResponse.body.data.sessionId;
  });

  describe('POST /api/voice/session', () => {
    it('should create a new voice session with valid auth', async () => {
      const response = await request(app)
        .post('/api/voice/session')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('status', 'recording');
    });

    it('should reject request without auth token', async () => {
      const response = await request(app)
        .post('/api/voice/session')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Access token required');
    });
  });

  describe('POST /api/voice/transcribe', () => {
    it('should reject request without audio file', async () => {
      const response = await request(app)
        .post('/api/voice/transcribe')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('未找到音频文件');
    });

    it('should reject request without auth token', async () => {
      const response = await request(app)
        .post('/api/voice/transcribe')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Access token required');
    });

    // Note: Testing actual audio file upload would require creating mock audio data
    // This is a basic integration test to ensure the route is properly configured
  });
});