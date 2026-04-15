declare namespace google.accounts.oauth2 {
  interface TokenClient {
    requestAccessToken(): void;
  }

  interface TokenResponse {
    access_token: string;
    expires_in: number;
    error?: string;
    error_description?: string;
  }

  interface TokenClientConfig {
    client_id: string;
    scope: string;
    callback: (response: TokenResponse) => void;
    error_callback?: (error: { type: string; message: string }) => void;
  }

  function initTokenClient(config: TokenClientConfig): TokenClient;
}
