import { GOOGLE_CLIENT_ID, GOOGLE_SCOPES } from './config';

let accessToken: string | null = null;
let tokenExpiry = 0;

export function isAuthenticated(): boolean {
  return accessToken !== null && Date.now() < tokenExpiry;
}

export function clearToken(): void {
  accessToken = null;
  tokenExpiry = 0;
}

export function _setTokenForTest(token: string, expiry: number): void {
  accessToken = token;
  tokenExpiry = expiry;
}

function loadGisScript(): Promise<void> {
  if (typeof google !== 'undefined' && google.accounts?.oauth2) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    if (document.querySelector('script[src*="accounts.google.com/gsi/client"]')) {
      const check = setInterval(() => {
        if (typeof google !== 'undefined' && google.accounts?.oauth2) {
          clearInterval(check);
          resolve();
        }
      }, 50);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
    document.head.appendChild(script);
  });
}

export async function getAccessToken(): Promise<string> {
  if (isAuthenticated()) {
    return accessToken!;
  }

  if (!GOOGLE_CLIENT_ID) {
    throw new Error('Google Client ID is not configured');
  }

  await loadGisScript();

  return new Promise<string>((resolve, reject) => {
    const client = google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: GOOGLE_SCOPES,
      callback: (response) => {
        if (response.error) {
          if (response.error === 'access_denied') {
            reject(new Error('Google access was not granted'));
          } else {
            reject(new Error(response.error_description ?? response.error));
          }
          return;
        }
        accessToken = response.access_token;
        tokenExpiry = Date.now() + response.expires_in * 1000;
        resolve(accessToken);
      },
      error_callback: (error) => {
        if (error.type === 'popup_blocked') {
          reject(new Error('Pop-up blocked — please allow pop-ups for this site and try again'));
        } else {
          reject(new Error('Google access was not granted'));
        }
      },
    });
    client.requestAccessToken();
  });
}
