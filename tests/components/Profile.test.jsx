/**
 * Profile Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import Profile from '../../src/components/Profile';

vi.mock('../../src/context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-123', email: 'test@example.com', name: 'Test User', picture: null },
    signOut: vi.fn()
  })
}));

vi.mock('../../src/utils', () => ({
  calculateSessionCredits: vi.fn(() => ({ thirtyMin: 0, sixtyMin: 0, total: 0 })),
  formatDate: vi.fn((date) => date)
}));

describe('Profile Component', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ profile: { purchases: [] } })
    });
    localStorage.clear();
  });
  
  it('renders without crashing', () => {
    render(<Profile onClose={() => {}} />);
    expect(document.body).toBeTruthy();
  });
  
  it('shows loading state', () => {
    render(<Profile onClose={() => {}} />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
  
  it('displays user name after loading', async () => {
    render(<Profile onClose={() => {}} />);
    await waitFor(() => expect(screen.getByText('Test User')).toBeInTheDocument());
  });
  
  it('displays user email after loading', async () => {
    render(<Profile onClose={() => {}} />);
    await waitFor(() => expect(screen.getByText('test@example.com')).toBeInTheDocument());
  });
});
