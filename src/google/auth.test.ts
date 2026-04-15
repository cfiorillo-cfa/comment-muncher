import { describe, it, expect, beforeEach } from 'vitest';
import { getAccessToken, isAuthenticated, clearToken, _setTokenForTest } from './auth';

describe('auth token management', () => {
  beforeEach(() => { clearToken(); });

  it('isAuthenticated returns false when no token', () => {
    expect(isAuthenticated()).toBe(false);
  });

  it('isAuthenticated returns true when token is set and not expired', () => {
    _setTokenForTest('test-token', Date.now() + 60000);
    expect(isAuthenticated()).toBe(true);
  });

  it('isAuthenticated returns false when token is expired', () => {
    _setTokenForTest('test-token', Date.now() - 1000);
    expect(isAuthenticated()).toBe(false);
  });

  it('clearToken resets auth state', () => {
    _setTokenForTest('test-token', Date.now() + 60000);
    expect(isAuthenticated()).toBe(true);
    clearToken();
    expect(isAuthenticated()).toBe(false);
  });

  it('getAccessToken returns cached token when valid', async () => {
    _setTokenForTest('cached-token', Date.now() + 60000);
    const token = await getAccessToken();
    expect(token).toBe('cached-token');
  });

  it('getAccessToken throws when no client ID configured', async () => {
    await expect(getAccessToken()).rejects.toThrow('Google Client ID is not configured');
  });
});
