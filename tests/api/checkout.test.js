/**
 * API Tests: Stripe Checkout
 * 
 * Tests checkout session creation and webhook handling.
 * Uses real Stripe test mode API.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import crypto from 'crypto';
import { 
  BASE_URL, 
  authFetch, 
  resetUserPurchases, 
  getTestUser,
  testUserId 
} from '../setup.js';

// Get webhook secret from env
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

describe('Checkout API', () => {
  
  beforeEach(async () => {
    // Reset purchases before each test
    await resetUserPurchases();
  });
  
  describe('POST /api/stripe/create-checkout', () => {
    
    it('creates checkout for trial package ($30)', async () => {
      const response = await authFetch(`${BASE_URL}/api/stripe/create-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId: 'trial' })
      });
      
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.url).toContain('stripe.com');
      expect(data.sessionId).toMatch(/^cs_test_/);
    });
    
    it('creates checkout for single package ($100)', async () => {
      const response = await authFetch(`${BASE_URL}/api/stripe/create-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId: 'single' })
      });
      
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.url).toContain('stripe.com');
    });
    
    it('creates checkout for package3 ($250)', async () => {
      const response = await authFetch(`${BASE_URL}/api/stripe/create-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId: 'package3' })
      });
      
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.url).toContain('stripe.com');
    });
    
    it('creates checkout for package5 ($450)', async () => {
      const response = await authFetch(`${BASE_URL}/api/stripe/create-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId: 'package5' })
      });
      
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.url).toContain('stripe.com');
    });
    
    it('rejects invalid package ID', async () => {
      const response = await authFetch(`${BASE_URL}/api/stripe/create-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId: 'invalid_package_xyz' })
      });
      
      expect(response.status).toBe(400);
    });
    
    it('rejects missing package ID', async () => {
      const response = await authFetch(`${BASE_URL}/api/stripe/create-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      
      expect(response.status).toBe(400);
    });
    
  });
  
  describe('POST /api/stripe/webhook', () => {
    
    it('processes checkout.session.completed and adds purchase', async () => {
      // Simulate a Stripe webhook event
      const event = {
        id: `evt_test_${Date.now()}`,
        type: 'checkout.session.completed',
        data: {
          object: {
            id: `cs_test_webhook_${Date.now()}`,
            metadata: {
              packageId: 'trial',
              userId: (await getTestUser()).google_id,
              sessions: '1',
              duration_minutes: '30',
              category: 'interview'
            },
            customer_email: (await getTestUser()).email,
            amount_total: 3000
          }
        }
      };
      
      const payload = JSON.stringify(event);
      const timestamp = Math.floor(Date.now() / 1000);
      const signedPayload = `${timestamp}.${payload}`;
      const signature = crypto
        .createHmac('sha256', WEBHOOK_SECRET)
        .update(signedPayload)
        .digest('hex');
      
      const response = await fetch(`${BASE_URL}/api/stripe/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': `t=${timestamp},v1=${signature}`
        },
        body: payload
      });
      
      expect(response.status).toBe(200);
      
      // Verify purchase was added
      const user = await getTestUser();
      const purchases = user.purchases || [];
      
      expect(purchases.length).toBeGreaterThan(0);
      
      const purchase = purchases.find(p => p.package_id === 'trial');
      expect(purchase).toBeDefined();
      expect(purchase.sessions_total).toBe(1);
      expect(purchase.duration_minutes).toBe(30);
      expect(purchase.status).toBe('active');
    });
    
    it('rejects webhook with invalid signature', async () => {
      const event = {
        type: 'checkout.session.completed',
        data: { object: {} }
      };
      
      const response = await fetch(`${BASE_URL}/api/stripe/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': 't=123,v1=invalid_signature'
        },
        body: JSON.stringify(event)
      });
      
      expect(response.status).toBe(401);
    });
    
  });
  
});

