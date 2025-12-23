import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../server.js';

describe('Authentication Routes', () => {
  let sessionToken: string;

  beforeAll(async () => {
    // Wait a bit for server to initialize
    await new Promise(resolve => setTimeout(resolve, 2000));
  }, 10000); // 10 second timeout

  describe('POST /api/auth/login', () => {
    it('should login with correct password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ password: 'admin123' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('sessionId');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data.user).toHaveProperty('id');
      expect(response.body.data.user).not.toHaveProperty('passwordHash');

      sessionToken = response.body.data.sessionId;
    }, 10000);

    it('should reject invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ password: 'wrongpassword' })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toHaveProperty('message');
    }, 10000);

    it('should reject empty password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ password: '' })
        .expect(400);

      expect(response.body.success).toBe(false);
    }, 10000);
  });

  describe('GET /api/auth/me', () => {
    it('should return user info with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${sessionToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data.user).toHaveProperty('id');
    }, 10000);

    it('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body.success).toBe(false);
    }, 10000);
  });

  describe('GET /api/auth/validate', () => {
    it('should validate valid session', async () => {
      const response = await request(app)
        .get('/api/auth/validate')
        .set('Authorization', `Bearer ${sessionToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.valid).toBe(true);
    }, 10000);

    it('should reject invalid session', async () => {
      const response = await request(app)
        .get('/api/auth/validate')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
    }, 10000);
  });

  describe('POST /api/auth/logout', () => {
    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${sessionToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    }, 10000);

    it('should invalidate session after logout', async () => {
      const response = await request(app)
        .get('/api/auth/validate')
        .set('Authorization', `Bearer ${sessionToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    }, 10000);
  });
});