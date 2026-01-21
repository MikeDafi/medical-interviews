/**
 * Unit Tests: Utility Functions
 * 
 * Tests pure functions with no external dependencies.
 */

import { describe, it, expect } from 'vitest';
import { calculateSessionCredits } from '../../src/utils/index.js';

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

