/**
 * Unit Tests: Utility Functions
 * 
 * Tests pure functions with no external dependencies.
 * No server or database needed!
 */

import { describe, it, expect } from 'vitest';
import { calculateSessionCredits as calculateSessionCreditsReal, getCreditsForOption } from '../../src/utils/index.js';

// Import the function directly - inline for unit tests
function calculateSessionCredits(purchases = []) {
  let thirtyMin = 0;
  let sixtyMin = 0;
  
  purchases.forEach(p => {
    if (p.status !== 'active') return;
    const remaining = (p.sessions_total || 0) - (p.sessions_used || 0);
    if (remaining <= 0) return;
    
    // Check duration_minutes first (new format), fall back to type (legacy)
    const duration = p.duration_minutes || (p.type === 'trial' ? 30 : 60);
    
    if (duration === 30) {
      thirtyMin += remaining;
    } else if (duration === 60) {
      sixtyMin += remaining;
    }
  });
  
  return { 
    thirtyMin, 
    sixtyMin, 
    total: thirtyMin + sixtyMin,
    trial: thirtyMin, 
    regular: sixtyMin 
  };
}

describe('calculateSessionCredits', () => {
  
  it('returns zeros for empty purchases', () => {
    const result = calculateSessionCredits([]);
    
    expect(result.thirtyMin).toBe(0);
    expect(result.sixtyMin).toBe(0);
    expect(result.total).toBe(0);
  });
  
  it('returns zeros for undefined purchases', () => {
    const result = calculateSessionCredits(undefined);
    
    expect(result.thirtyMin).toBe(0);
    expect(result.sixtyMin).toBe(0);
  });
  
  it('calculates 30-min sessions correctly', () => {
    const purchases = [
      {
        package_id: 'trial',
        duration_minutes: 30,
        sessions_total: 1,
        sessions_used: 0,
        status: 'active'
      }
    ];
    
    const result = calculateSessionCredits(purchases);
    
    expect(result.thirtyMin).toBe(1);
    expect(result.sixtyMin).toBe(0);
  });
  
  it('calculates 60-min sessions correctly', () => {
    const purchases = [
      {
        package_id: 'package3',
        duration_minutes: 60,
        sessions_total: 3,
        sessions_used: 1,
        status: 'active'
      }
    ];
    
    const result = calculateSessionCredits(purchases);
    
    expect(result.thirtyMin).toBe(0);
    expect(result.sixtyMin).toBe(2); // 3 total - 1 used
  });
  
  it('ignores cancelled packages', () => {
    const purchases = [
      {
        package_id: 'trial',
        duration_minutes: 30,
        sessions_total: 1,
        sessions_used: 0,
        status: 'cancelled'
      },
      {
        package_id: 'single',
        duration_minutes: 60,
        sessions_total: 1,
        sessions_used: 0,
        status: 'active'
      }
    ];
    
    const result = calculateSessionCredits(purchases);
    
    expect(result.thirtyMin).toBe(0); // Cancelled
    expect(result.sixtyMin).toBe(1);  // Active
  });
  
  it('handles mixed duration packages', () => {
    const purchases = [
      {
        package_id: 'trial',
        duration_minutes: 30,
        sessions_total: 2,
        sessions_used: 1,
        status: 'active'
      },
      {
        package_id: 'package3',
        duration_minutes: 60,
        sessions_total: 3,
        sessions_used: 0,
        status: 'active'
      },
      {
        package_id: 'package5',
        duration_minutes: 60,
        sessions_total: 5,
        sessions_used: 2,
        status: 'active'
      }
    ];
    
    const result = calculateSessionCredits(purchases);
    
    expect(result.thirtyMin).toBe(1);  // 2 - 1
    expect(result.sixtyMin).toBe(6);   // 3 + (5-2)
    expect(result.total).toBe(7);
  });
  
  it('handles legacy type field (backwards compatibility)', () => {
    const purchases = [
      {
        package_id: 'trial',
        type: 'trial', // Legacy field
        sessions_total: 1,
        sessions_used: 0,
        status: 'active'
      }
    ];
    
    const result = calculateSessionCredits(purchases);
    
    // Should interpret 'trial' type as 30 min
    expect(result.thirtyMin).toBe(1);
  });
  
  it('ignores packages with no remaining sessions', () => {
    const purchases = [
      {
        package_id: 'trial',
        duration_minutes: 30,
        sessions_total: 1,
        sessions_used: 1, // All used
        status: 'active'
      }
    ];
    
    const result = calculateSessionCredits(purchases);
    
    expect(result.thirtyMin).toBe(0);
    expect(result.total).toBe(0);
  });
  
});

/**
 * Tests for the real calculateSessionCredits()/getCreditsForOption() from src/utils/index.js -
 * specifically the `byCategory` breakdown added for the booking page's combined service+duration
 * selector (Interview Prep / CV & Strategy / Advisory Check-In).
 */
describe('calculateSessionCredits byCategory breakdown (real implementation)', () => {

  it('breaks credits down per category and duration', () => {
    const purchases = [
      { category: 'interview', duration_minutes: 30, sessions_total: 3, sessions_used: 0, status: 'active' },
      { category: 'interview', duration_minutes: 60, sessions_total: 3, sessions_used: 1, status: 'active' },
      { category: 'cv', duration_minutes: 60, sessions_total: 1, sessions_used: 0, status: 'active' },
      { category: 'advisory', duration_minutes: 30, sessions_total: 1, sessions_used: 0, status: 'active' }
    ];

    const credits = calculateSessionCreditsReal(purchases);

    expect(getCreditsForOption(credits, 'interview', 30)).toBe(3);
    expect(getCreditsForOption(credits, 'interview', 60)).toBe(2);
    expect(getCreditsForOption(credits, 'cv', 60)).toBe(1);
    expect(getCreditsForOption(credits, 'cv', 30)).toBe(0);
    expect(getCreditsForOption(credits, 'advisory', 30)).toBe(1);
    // Pooled totals must still match the sum across categories (backward compatibility)
    expect(credits.thirtyMin).toBe(4);
    expect(credits.sixtyMin).toBe(3);
  });

  it('groups legacy purchases with no category under interview', () => {
    const purchases = [
      { duration_minutes: 30, sessions_total: 2, sessions_used: 0, status: 'active' } // no category field
    ];

    const credits = calculateSessionCreditsReal(purchases);

    expect(getCreditsForOption(credits, 'interview', 30)).toBe(2);
  });

  it('excludes exhausted and inactive purchases from the breakdown', () => {
    const purchases = [
      { category: 'cv', duration_minutes: 60, sessions_total: 1, sessions_used: 1, status: 'active' }, // exhausted
      { category: 'cv', duration_minutes: 60, sessions_total: 1, sessions_used: 0, status: 'cancelled' } // inactive
    ];

    const credits = calculateSessionCreditsReal(purchases);

    expect(getCreditsForOption(credits, 'cv', 60)).toBe(0);
  });

  it('getCreditsForOption returns 0 for a combination with no credits at all', () => {
    const credits = calculateSessionCreditsReal([]);
    expect(getCreditsForOption(credits, 'advisory', 30)).toBe(0);
  });

});
