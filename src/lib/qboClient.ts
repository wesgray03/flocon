// QuickBooks Online Client Utility
// Manages OAuth client and token operations
import { createClient } from '@supabase/supabase-js';
import OAuthClient from 'intuit-oauth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface QBOToken {
  id: string;
  realm_id: string;
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_at: string;
  refresh_expires_at: string;
  scope?: string;
  is_active: boolean;
}

/**
 * Initialize QuickBooks OAuth client
 */
export function getQBOClient(): OAuthClient {
  const environment = (process.env.QBO_ENVIRONMENT || 'sandbox') as
    | 'sandbox'
    | 'production';
  return new OAuthClient({
    clientId: process.env.QBO_CLIENT_ID!,
    clientSecret: process.env.QBO_CLIENT_SECRET!,
    environment,
    redirectUri: process.env.QBO_REDIRECT_URI!,
  });
}

/**
 * Get authorization URI for OAuth flow
 */
export function getAuthUri(): string {
  const oauthClient = getQBOClient();
  // Generate random state for CSRF protection
  const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  return oauthClient.authorizeUri({
    scope: [OAuthClient.scopes.Accounting, OAuthClient.scopes.Payroll],
    state,
  });
}

/**
 * Store tokens in database after OAuth callback
 */
export async function saveTokens(
  realmId: string,
  accessToken: string,
  refreshToken: string,
  expiresIn: number,
  refreshExpiresIn: number,
  scope?: string
): Promise<void> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + expiresIn * 1000);
  const refreshExpiresAt = new Date(now.getTime() + refreshExpiresIn * 1000);

  // Upsert token (update if exists, insert if not)
  const { error } = await supabase.from('qbo_tokens').upsert(
    {
      realm_id: realmId,
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: expiresAt.toISOString(),
      refresh_expires_at: refreshExpiresAt.toISOString(),
      scope,
      is_active: true,
      last_refreshed_at: now.toISOString(),
    },
    {
      onConflict: 'realm_id',
    }
  );

  if (error) {
    throw new Error(`Failed to save tokens: ${error.message}`);
  }
}

/**
 * Get active tokens from database
 */
export async function getStoredTokens(): Promise<QBOToken | null> {
  const { data, error } = await supabase
    .from('qbo_tokens')
    .select('*')
    .eq('is_active', true)
    .order('connected_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error fetching tokens:', error);
    return null;
  }

  return data as QBOToken | null;
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(): Promise<QBOToken | null> {
  const storedToken = await getStoredTokens();
  if (!storedToken) {
    throw new Error('No stored tokens found');
  }

  const oauthClient = getQBOClient();
  oauthClient.setToken({
    access_token: storedToken.access_token,
    refresh_token: storedToken.refresh_token,
    token_type: storedToken.token_type,
    expires_in: 3600, // 1 hour
    x_refresh_token_expires_in: 8726400, // 100 days
    realmId: storedToken.realm_id,
  });

  try {
    const authResponse = await oauthClient.refresh();
    const token = authResponse.token;

    await saveTokens(
      storedToken.realm_id,
      token.access_token,
      token.refresh_token,
      token.expires_in,
      token.x_refresh_token_expires_in,
      storedToken.scope
    );

    return await getStoredTokens();
  } catch (error) {
    console.error('Error refreshing token:', error);
    throw error;
  }
}

/**
 * Check if access token is expired and refresh if needed
 */
export async function getValidToken(): Promise<QBOToken> {
  const storedToken = await getStoredTokens();
  if (!storedToken) {
    throw new Error('Not connected to QuickBooks. Please authorize first.');
  }

  const now = new Date();
  const expiresAt = new Date(storedToken.expires_at);

  // Refresh if token expires in less than 5 minutes
  if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
    console.log('Access token expired or expiring soon, refreshing...');
    const refreshedToken = await refreshAccessToken();
    if (!refreshedToken) {
      throw new Error('Failed to refresh token');
    }
    return refreshedToken;
  }

  return storedToken;
}

/**
 * Revoke tokens and mark as inactive
 */
export async function revokeTokens(): Promise<void> {
  const storedToken = await getStoredTokens();
  if (!storedToken) {
    return;
  }

  const oauthClient = getQBOClient();
  oauthClient.setToken({
    access_token: storedToken.access_token,
    refresh_token: storedToken.refresh_token,
    token_type: storedToken.token_type,
    realmId: storedToken.realm_id,
  });

  try {
    await oauthClient.revoke();
  } catch (error) {
    console.error('Error revoking token:', error);
  }

  // Mark as inactive in database
  await supabase
    .from('qbo_tokens')
    .update({ is_active: false })
    .eq('realm_id', storedToken.realm_id);
}

/**
 * Get authenticated client with valid token
 */
export async function getAuthenticatedClient(): Promise<{
  client: OAuthClient;
  realmId: string;
}> {
  const token = await getValidToken();
  const client = getQBOClient();

  client.setToken({
    access_token: token.access_token,
    refresh_token: token.refresh_token,
    token_type: token.token_type,
    realmId: token.realm_id,
  });

  return {
    client,
    realmId: token.realm_id,
  };
}

/**
 * Make an authenticated request to QuickBooks API
 */
export async function makeQBORequest(
  method: 'GET' | 'POST',
  endpoint: string,
  body?: any
): Promise<any> {
  const { client, realmId } = await getAuthenticatedClient();
  const token = client.getToken();

  const environment = (process.env.QBO_ENVIRONMENT || 'sandbox') as 'sandbox' | 'production';
  const baseUrl = environment === 'production'
    ? 'https://quickbooks.api.intuit.com'
    : 'https://sandbox-quickbooks.api.intuit.com';
  const url = `${baseUrl}/v3/company/${realmId}/${endpoint}`;

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token.access_token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`QBO API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}
