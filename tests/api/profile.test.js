/**
 * API Tests: Profile
 * 
 * Tests profile CRUD operations.
 * Uses real database.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  BASE_URL, 
  authFetch, 
  testUser,
  addTestPurchase,
  resetUserPurchases,
  getTestUser 
} from '../setup.js';

describe('Profile API', () => {
  
  beforeEach(async () => {
    await resetUserPurchases();
  });
  
  describe('GET /api/profile', () => {
    
    it('returns user profile data', async () => {
      const response = await authFetch(`${BASE_URL}/api/profile`);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.user).toBeDefined();
      expect(data.user.email).toBe(testUser.email);
    });
    
    it('returns empty purchases for new user', async () => {
      const response = await authFetch(`${BASE_URL}/api/profile`);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.user.purchases).toBeDefined();
      expect(Array.isArray(data.user.purchases)).toBe(true);
    });
    
    it('returns purchases after adding one', async () => {
      // Add a purchase
      await addTestPurchase({
        package_id: 'trial',
        duration_minutes: 30,
        sessions_total: 1,
        sessions_used: 0,
        status: 'active'
      });
      
      const response = await authFetch(`${BASE_URL}/api/profile`);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.user.purchases.length).toBeGreaterThan(0);
      
      const purchase = data.user.purchases.find(p => p.package_id === 'trial');
      expect(purchase).toBeDefined();
      expect(purchase.duration_minutes).toBe(30);
    });
    
  });
  
  describe('POST /api/profile/setup', () => {
    
    it('saves profile data', async () => {
      const profileData = {
        phone: '555-123-4567',
        applicationStage: 'Applying this cycle',
        mainConcerns: 'Need help with MMI practice',
        targetSchools: [
          { name: 'UCLA Medical', interviewType: 'MMI' }
        ]
      };
      
      const response = await authFetch(`${BASE_URL}/api/profile/setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData)
      });
      
      expect(response.status).toBe(200);
      
      // Verify data was saved
      const user = await getTestUser();
      expect(user.phone).toBe('5551234567'); // Sanitized
      expect(user.profile_complete).toBe(true);
    });
    
    it('updates existing profile data', async () => {
      // First setup
      await authFetch(`${BASE_URL}/api/profile/setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: '111-111-1111' })
      });
      
      // Update
      const response = await authFetch(`${BASE_URL}/api/profile/setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          phone: '222-222-2222',
          mainConcerns: 'Updated concerns'
        })
      });
      
      expect(response.status).toBe(200);
      
      const user = await getTestUser();
      expect(user.phone).toBe('2222222222');
      expect(user.main_concerns).toBe('Updated concerns');
    });
    
  });
  
});

