import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from './server.js';

describe('Server Health Check', () => {
  it('should respond to health check', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(response.body).toHaveProperty('status', 'ok');
    expect(response.body).toHaveProperty('timestamp');
  });

  it('should respond to API root', async () => {
    const response = await request(app)
      .get('/api')
      .expect(200);

    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toContain('微信公众号写作助手');
  });
});