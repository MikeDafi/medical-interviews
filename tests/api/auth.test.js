/**
 * API Tests: Authentication
 * 
 * Tests session creation, verification, and logout.
 * Uses real database.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { BASE_URL, sessionToken, testUser, authFetch } from '../setup.js';

describe('Auth API', () => {
  
  describe('GET /api/auth?action=session', () => {
    
    it('returns authenticated user for valid session', async () => {
      const response = await authFetch(`${BASE_URL}/api/auth?action=session`);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.authenticated).toBe(true);
      expect(data.user).toBeDefined();
      expect(data.user.email).toBe(testUser.email);
    });
    
    it('returns unauthenticated for missing token', async () => {
      const response = await fetch(`${BASE_URL}/api/auth?action=session`);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.authenticated).toBe(false);
      expect(data.user).toBeNull();
    });
    
    it('returns unauthenticated for invalid token', async () => {
      const response = await fetch(`${BASE_URL}/api/auth?action=session`, {
        headers: {
          'Cookie': 'session_token=invalid_token_12345'
        }
      });
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.authenticated).toBe(false);
    });
    
  });
  
  describe('Protected endpoints', () => {
    
    it('rejects unauthenticated requests to /api/profile', async () => {
      const response = await fetch(`${BASE_URL}/api/profile`);
      
      expect(response.status).toBe(401);
    });
    
    it('accepts authenticated requests to /api/profile', async () => {
      const response = await authFetch(`${BASE_URL}/api/profile`);
      
      expect(response.status).toBe(200);
    });
    
    it('rejects unauthenticated requests to /api/stripe/create-checkout', async () => {
      const response = await fetch(`${BASE_URL}/api/stripe/create-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId: 'trial' })
      });
      
      expect(response.status).toBe(401);
    });
    
  });
  
});

