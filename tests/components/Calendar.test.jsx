// @vitest-environment jsdom
/**
 * Calendar Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import Calendar from '../../src/components/Calendar';

vi.mock('../../src/context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'test-123', email: 'test@example.com', name: 'Test User' } })
}));

vi.mock('../../src/components/RecentBookings', () => ({ default: () => null }));

vi.mock('../../src/utils', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    calculateSessionCredits: vi.fn(() => ({ thirtyMin: 1, sixtyMin: 2, total: 3, byCategory: { interview: { 30: 1, 60: 2 } } })),
  };
});

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

  it.each([true, false, undefined])('preserves the saved booking and Meet link when email status is %s', async (confirmationEmailSent) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
    global.fetch = vi.fn(async (url) => ({
      ok: true,
      json: async () => url.includes('action=book')
        ? { success: true, confirmationEmailSent, booking: { meet_link: 'https://meet.google.com/test-session' } }
        : url.includes('action=preload')
          ? { timezone: 'America/Chicago', availability: { [dateStr]: { availableSlots: ['10:00 AM', '10:30 AM'], timezone: 'America/Chicago' } } }
          : { profile: { purchases: [] } },
    }));
    const { container } = render(<Calendar />);
    await waitFor(() => expect(container.querySelector('.time-slot')).toBeTruthy());
    fireEvent.click(container.querySelector('.time-slot'));
    fireEvent.click(screen.getByRole('button', { name: /Interview Prep.*60 min/ }));
    fireEvent.change(screen.getByLabelText(/Your interview experience level/), { target: { value: 'beginner' } });
    fireEvent.change(screen.getByLabelText(/Interview style focus/), { target: { value: 'MMI' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Booking' }));
    const meetLink = await screen.findByRole('link', { name: /Join Google Meet/ });
    expect(meetLink).toHaveAttribute('href', 'https://meet.google.com/test-session');
    expect(container.querySelector('.booking-result')).toHaveClass('success');
    if (confirmationEmailSent === false) {
      expect(screen.getByText(/We could not verify that your email was sent/)).toHaveTextContent('you do not need to book again');
    } else {
      expect(screen.queryByText(/We could not verify that your email was sent/)).not.toBeInTheDocument();
    }
    expect(screen.queryByRole('button', { name: 'Confirm Booking' })).not.toBeInTheDocument();
    expect(fetch.mock.calls.filter(([url]) => url.includes('action=book'))).toHaveLength(1);
  });
});
