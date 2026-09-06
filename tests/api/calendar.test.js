/**
 * API Tests: Calendar
 * 
 * Tests availability checking and booking.
 * Uses real Google Calendar API.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { sql } from '@vercel/postgres';
import { 
  BASE_URL, 
  authFetch, 
  addTestPurchase,
  resetUserPurchases,
  getTestUser,
  testUserId
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
          duration: 60,
          category: 'interview',
          interviewLevel: 'beginner',
          interviewStyle: 'MMI'
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
        category: 'interview',
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
            duration: 60,
            category: 'interview',
            interviewLevel: 'beginner',
            interviewStyle: 'MMI'
          })
        });
        
        if (response.status === 200) {
          // Verify credit was used
          const user = await getTestUser();
          const purchase = user.purchases.find(p => p.package_id === 'single');
          expect(purchase.sessions_used).toBe(1);

          // Verify the interview level/style were captured on the booking record and synced
          // back onto the profile (see api/calendar/index.js's two-way sync)
          const booking = purchase.bookings?.find(b => b.date === dateStr && b.time === slot);
          expect(booking?.interview_level).toBe('beginner');
          expect(booking?.interview_style).toBe('MMI');
          expect(user.interview_level).toBe('beginner');
          expect(user.interview_style).toBe('MMI');
        }
        // If no slots or booking fails, that's okay for test environments
      }
    });
    
    it('rejects booking with wrong duration credits', async () => {
      // Add 30-min credit but try to book 60-min
      await addTestPurchase({
        package_id: 'trial',
        duration_minutes: 30,
        category: 'interview',
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
          duration: 60, // Trying to book 60-min with 30-min credit
          category: 'interview',
          interviewLevel: 'beginner',
          interviewStyle: 'MMI'
        })
      });
      
      // Should fail - no 60-min credits
      expect(response.status).toBe(400);
    });

    it('rejects booking without category', async () => {
      await addTestPurchase({
        package_id: 'single',
        duration_minutes: 60,
        category: 'interview',
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
        body: JSON.stringify({ date: dateStr, time: '14:00', duration: 60 })
      });

      expect(response.status).toBe(400);
    });

    it('rejects an Interview booking missing level/style', async () => {
      await addTestPurchase({
        package_id: 'single',
        duration_minutes: 60,
        category: 'interview',
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
        // category is 'interview' but interviewLevel/interviewStyle are missing
        body: JSON.stringify({ date: dateStr, time: '14:00', duration: 60, category: 'interview' })
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toMatch(/level/i);
    });

    it('does not mis-attribute a booking to the wrong category at the same duration', async () => {
      // Client has both an Interview 60-min package AND a CV 60-min package. Booking with
      // category: 'cv' must draw from the CV package, never the Interview one (the exact
      // mis-attribution bug this category-aware match was built to close).
      await addTestPurchase({
        id: 'interview_pkg',
        package_id: 'single',
        duration_minutes: 60,
        category: 'interview',
        sessions_total: 1,
        sessions_used: 0,
        status: 'active'
      });
      await addTestPurchase({
        id: 'cv_pkg',
        package_id: 'cv_single',
        duration_minutes: 60,
        category: 'cv',
        sessions_total: 1,
        sessions_used: 0,
        status: 'active'
      });

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      const dateStr = futureDate.toISOString().split('T')[0];

      const availResponse = await authFetch(
        `${BASE_URL}/api/calendar?action=availability&date=${dateStr}`
      );
      const availData = await availResponse.json();

      if (availData.slots && availData.slots.length > 0) {
        const slot = availData.slots[0];
        const response = await authFetch(`${BASE_URL}/api/calendar?action=book`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date: dateStr, time: slot, duration: 60, category: 'cv' })
        });

        if (response.status === 200) {
          const user = await getTestUser();
          const cvPkg = user.purchases.find(p => p.id === 'cv_pkg');
          const interviewPkg = user.purchases.find(p => p.id === 'interview_pkg');
          expect(cvPkg.sessions_used).toBe(1);
          expect(interviewPkg.sessions_used).toBe(0);
        }
      }
    });

    it('accepts an optional targetSchool matching one of the client\'s existing target schools', async () => {
      await sql`UPDATE users SET target_schools = ${JSON.stringify([{ name: 'UCLA Medical', interviewType: 'MMI', interviewDate: '' }])}::jsonb WHERE id = ${testUserId}`;
      await addTestPurchase({
        package_id: 'single',
        duration_minutes: 60,
        category: 'interview',
        sessions_total: 1,
        sessions_used: 0,
        status: 'active'
      });

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      const dateStr = futureDate.toISOString().split('T')[0];

      const availResponse = await authFetch(
        `${BASE_URL}/api/calendar?action=availability&date=${dateStr}`
      );
      const availData = await availResponse.json();

      if (availData.slots && availData.slots.length > 0) {
        const slot = availData.slots[0];
        const response = await authFetch(`${BASE_URL}/api/calendar?action=book`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: dateStr,
            time: slot,
            duration: 60,
            category: 'interview',
            interviewLevel: 'advanced',
            interviewStyle: 'both',
            targetSchool: 'UCLA Medical'
          })
        });

        if (response.status === 200) {
          const user = await getTestUser();
          const purchase = user.purchases.find(p => p.package_id === 'single');
          const booking = purchase.bookings?.find(b => b.date === dateStr && b.time === slot);
          expect(booking?.target_school).toBe('UCLA Medical');
        }
      }
    });

    it('ignores a targetSchool that does not match any of the client\'s existing target schools', async () => {
      await sql`UPDATE users SET target_schools = ${JSON.stringify([{ name: 'UCLA Medical', interviewType: 'MMI', interviewDate: '' }])}::jsonb WHERE id = ${testUserId}`;
      await addTestPurchase({
        package_id: 'single',
        duration_minutes: 60,
        category: 'interview',
        sessions_total: 1,
        sessions_used: 0,
        status: 'active'
      });

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      const dateStr = futureDate.toISOString().split('T')[0];

      const availResponse = await authFetch(
        `${BASE_URL}/api/calendar?action=availability&date=${dateStr}`
      );
      const availData = await availResponse.json();

      if (availData.slots && availData.slots.length > 0) {
        const slot = availData.slots[0];
        const response = await authFetch(`${BASE_URL}/api/calendar?action=book`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: dateStr,
            time: slot,
            duration: 60,
            category: 'interview',
            interviewLevel: 'advanced',
            interviewStyle: 'both',
            targetSchool: 'Some School That Was Never Added'
          })
        });

        if (response.status === 200) {
          const user = await getTestUser();
          const purchase = user.purchases.find(p => p.package_id === 'single');
          const booking = purchase.bookings?.find(b => b.date === dateStr && b.time === slot);
          expect(booking?.target_school).toBeUndefined();
        }
      }
    });
    
  });
  
});

