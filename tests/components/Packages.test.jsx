/**
 * Packages Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Packages from '../../src/components/Packages';

vi.mock('../../src/context/AuthContext', () => ({
  useAuth: () => ({ user: null, signInWithGoogle: vi.fn() })
}));

describe('Packages Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  it('renders without crashing', () => {
    render(<Packages />);
    expect(document.body).toBeTruthy();
  });
  
  it('displays $30 price', () => {
    render(<Packages />);
    expect(screen.getByText('$30')).toBeInTheDocument();
  });
  
  it('displays $100 price', () => {
    render(<Packages />);
    expect(screen.getByText('$100')).toBeInTheDocument();
  });
  
  it('displays $250 price', () => {
    render(<Packages />);
    expect(screen.getByText('$250')).toBeInTheDocument();
  });
  
  it('displays $450 price', () => {
    render(<Packages />);
    expect(screen.getByText('$450')).toBeInTheDocument();
  });
  
  it('shows Interview Prep tab', () => {
    render(<Packages />);
    expect(screen.getByText('Interview Prep')).toBeInTheDocument();
  });
  
  it('shows Book Trial buttons', () => {
    render(<Packages />);
    expect(screen.getAllByText('Book Trial').length).toBeGreaterThan(0);
  });
  
  it('shows login modal after clicking purchase', async () => {
    render(<Packages />);
    fireEvent.click(screen.getAllByText('Book Trial')[0]);
    
    await waitFor(() => {
      // Should show some kind of login UI
      expect(document.querySelector('.login-prompt-modal')).toBeTruthy();
    });
  });
});
