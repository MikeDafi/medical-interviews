/**
 * Calendar Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import Calendar from '../../src/components/Calendar';

vi.mock('../../src/context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'test-123', email: 'test@example.com', name: 'Test User' } })
}));

vi.mock('../../src/utils', () => ({
  calculateSessionCredits: vi.fn(() => ({ thirtyMin: 1, sixtyMin: 2, total: 3 }))
}));

describe('Calendar Component', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ slots: ['09:00', '10:00'], profile: { purchases: [] } })
    });
  });
  
  it('renders without crashing', () => {
    render(<Calendar />);
    expect(document.body).toBeTruthy();
  });
  
  it('shows Book Your Session header', () => {
    render(<Calendar />);
    expect(screen.getByText('Book Your Session')).toBeInTheDocument();
  });
  
  it('has calendar section class', () => {
    render(<Calendar />);
    expect(document.querySelector('.calendar-section')).toBeTruthy();
  });
});
