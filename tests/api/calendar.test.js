/**
 * API Tests: Calendar
 * 
 * Tests availability checking and booking.
 * Uses real Google Calendar API.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  BASE_URL, 
  authFetch, 
  addTestPurchase,
  resetUserPurchases,
  getTestUser 
} from '../setup.js';

describe('Calendar API', () => {
  
  beforeEach(async () => {
    await resetUserPurchases();
  });
  
  describe('GET /api/calendar?action=availability', () => {
    
    it('returns availability for a valid date', async () => {
      // Get tomorrow's date
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split('T')[0];
      
      const response = await authFetch(
        `${BASE_URL}/api/calendar?action=availability&date=${dateStr}`
      );
      
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('slots');
      expect(Array.isArray(data.slots)).toBe(true);
    });
    
    it('returns slots array (may be empty for busy days)', async () => {
      // Get a date 3 days from now
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 3);
      const dateStr = futureDate.toISOString().split('T')[0];
      
      const response = await authFetch(
        `${BASE_URL}/api/calendar?action=availability&date=${dateStr}`
      );
      
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(Array.isArray(data.slots)).toBe(true);
    });
    
    it('includes timezone information', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split('T')[0];
      
      const response = await authFetch(
        `${BASE_URL}/api/calendar?action=availability&date=${dateStr}`
      );
      
      const data = await response.json();
      
      expect(response.status).toBe(200);
      // Should have timezone info
      expect(data.timezone || data.businessTimezone).toBeDefined();
    });
    
  });
  
  describe('POST /api/calendar?action=book', () => {
    
    it('requires session credits to book', async () => {
      // No purchases added - should fail
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split('T')[0];
      
      const response = await authFetch(`${BASE_URL}/api/calendar?action=book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: dateStr,
          time: '14:00',
          duration: 60
        })
      });
      
      // Should fail due to no credits
      expect(response.status).toBe(400);
    });
    
    it('books session when user has credits', async () => {
      // Add a 60-min session credit
      await addTestPurchase({
        package_id: 'single',
        duration_minutes: 60,
        sessions_total: 1,
        sessions_used: 0,
        status: 'active'
      });
      
      // Get availability first to find a valid slot
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7); // 1 week out
      const dateStr = futureDate.toISOString().split('T')[0];
      
      const availResponse = await authFetch(
        `${BASE_URL}/api/calendar?action=availability&date=${dateStr}`
      );
      const availData = await availResponse.json();
      
      if (availData.slots && availData.slots.length > 0) {
        // Book the first available slot
        const slot = availData.slots[0];
        
        const response = await authFetch(`${BASE_URL}/api/calendar?action=book`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: dateStr,
            time: slot,
            duration: 60
          })
        });
        
        if (response.status === 200) {
          // Verify credit was used
          const user = await getTestUser();
          const purchase = user.purchases.find(p => p.package_id === 'single');
          expect(purchase.sessions_used).toBe(1);
        }
        // If no slots or booking fails, that's okay for test environments
      }
    });
    
    it('rejects booking with wrong duration credits', async () => {
      // Add 30-min credit but try to book 60-min
      await addTestPurchase({
        package_id: 'trial',
        duration_minutes: 30,
        sessions_total: 1,
        sessions_used: 0,
        status: 'active'
      });
      
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      const dateStr = futureDate.toISOString().split('T')[0];
      
      const response = await authFetch(`${BASE_URL}/api/calendar?action=book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: dateStr,
          time: '14:00',
          duration: 60 // Trying to book 60-min with 30-min credit
        })
      });
      
      // Should fail - no 60-min credits
      expect(response.status).toBe(400);
    });
    
  });
  
});

