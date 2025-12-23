import { beforeAll, afterAll, beforeEach } from 'vitest';

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.JWT_SECRET = 'test-jwt-secret';

// Global test setup
beforeAll(async () => {
  // Setup test database connections, etc.
});

afterAll(async () => {
  // Cleanup test resources
});

beforeEach(() => {
  // Reset mocks before each test
});