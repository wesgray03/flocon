// Type definitions for intuit-oauth
declare module 'intuit-oauth' {
  interface OAuthClientConfig {
    clientId: string;
    clientSecret: string;
    environment: 'sandbox' | 'production';
    redirectUri: string;
  }

  interface TokenResponse {
    token: {
      access_token: string;
      refresh_token: string;
      token_type: string;
      expires_in: number;
      x_refresh_token_expires_in: number;
    };
    realmId?: string;
  }

  interface TokenData {
    access_token: string;
    refresh_token: string;
    token_type: string;
    expires_in?: number;
    x_refresh_token_expires_in?: number;
    realmId?: string;
  }

  interface AuthorizeUriOptions {
    scope: string[];
    state?: string;
  }

  class OAuthClient {
    constructor(config: OAuthClientConfig);

    static scopes: {
      Accounting: string;
      Payment: string;
      Payroll: string;
      TimeTracking: string;
      Benefits: string;
    };

    authorizeUri(options: AuthorizeUriOptions): string;
    createToken(url: string): Promise<TokenResponse>;
    refresh(): Promise<TokenResponse>;
    revoke(): Promise<void>;
    setToken(token: TokenData): void;
    getToken(): TokenData;
    isAccessTokenValid(): boolean;
  }

  export = OAuthClient;
}
