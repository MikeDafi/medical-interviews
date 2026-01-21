/**
 * Component Test Setup
 * 
 * Configures React Testing Library and provides mocks for browser APIs
 */

import '@testing-library/jest-dom';

// Mock window.matchMedia (used by some components)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// Mock IntersectionObserver (used for lazy loading)
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock fetch for API calls
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
  })
);

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
});

