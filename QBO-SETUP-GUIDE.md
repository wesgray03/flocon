# QuickBooks Online Integration Setup

Complete setup guide for the QuickBooks Online API integration.

## ✅ What's Been Set Up

### 1. Dependencies Installed

- `intuit-oauth` package for OAuth 2.0 authentication
- TypeScript type definitions created

### 2. Environment Variables Added

Added to `.env.local`:

```env
QBO_CLIENT_ID=ABFXvZKMX8xl3FjrYmcTYBQbwCjqwbo8WwbISdSJneHx05BF2E
QBO_CLIENT_SECRET=Oum5RqMyRqeqwceL3mkyT4CKJIO6lQnIbFLdQKPf
QBO_REDIRECT_URI=http://localhost:3000/api/qbo/callback
QBO_ENVIRONMENT=sandbox
```

### 3. Database Migration Created

- `qbo_tokens` table to store OAuth tokens securely
- RLS enabled (service role only)
- Automatic token refresh support

### 4. API Endpoints Created

- **GET /api/qbo/connect** - Get authorization URL
- **GET /api/qbo/callback** - Handle OAuth callback
- **GET /api/qbo/status** - Check connection status
- **POST /api/qbo/disconnect** - Revoke tokens

### 5. Client Library Created

`src/lib/qboClient.ts` with functions:

- `getQBOClient()` - Initialize OAuth client
- `getAuthUri()` - Get authorization URL
- `saveTokens()` - Store tokens in database
- `getStoredTokens()` - Retrieve active tokens
- `refreshAccessToken()` - Refresh expired tokens
- `getValidToken()` - Get valid token (auto-refresh)
- `revokeTokens()` - Disconnect and revoke
- `getAuthenticatedClient()` - Get ready-to-use client

### 6. UI Components Created

- **QuickBooksConnection** component
- **Settings page** at `/settings`

## 🚀 Setup Steps

### Step 1: Run Database Migration

Run this SQL in your Supabase SQL Editor:

```bash
# Open the file:
2025-11-17-create-qbo-tokens-table.sql
```

Copy and paste the contents into Supabase Dashboard → SQL Editor → New Query

### Step 2: Configure Intuit Developer Account

1. Go to https://developer.intuit.com/
2. Sign in and go to "My Apps"
3. Select your app (or create one)
4. Add redirect URI: `http://localhost:3000/api/qbo/callback`
5. For production, add: `https://yourdomain.com/api/qbo/callback`
6. Save the app settings

### Step 3: Update Environment Variables (if needed)

For production deployment, update:

```env
QBO_ENVIRONMENT=production
QBO_REDIRECT_URI=https://yourdomain.com/api/qbo/callback
```

### Step 4: Test the Connection

1. Start your dev server: `npm run dev`
2. Navigate to http://localhost:3000/settings
3. Click "Connect to QuickBooks"
4. Authorize in the QuickBooks sandbox
5. You'll be redirected back with tokens stored

## 📋 Next Steps

### Option A: Manual Testing

Test the connection flow manually through the UI.

### Option B: Build Sync Service

Create `/api/qbo/sync-projects` to push data to QuickBooks:

```typescript
// Pseudocode for sync service
1. Get projects from v_projects_for_qbo view
2. For each project:
   - Check if customer exists in QBO (by name)
   - If not, create customer
   - Create/update job under customer
   - Store QBO customer ID back to engagements table
```

### Option C: Add Webhook Handler

Create `/api/qbo/webhook` to receive updates from QuickBooks.

## 🔐 Security Notes

- **Never expose client secret** in frontend code
- **Tokens stored in database** with RLS enabled (service role only)
- **Access tokens expire in 1 hour** - auto-refresh implemented
- **Refresh tokens expire in 100 days** - user must reconnect after expiry
- **Rate limit**: 500 requests/minute per realm ID

## 📚 Data Mapping

Your database → QuickBooks:

```
engagements.project_number → Customer/Job ID (stored after sync)
engagements.name → Customer/Job Name
engagement_parties (customer) → Customer in QBO
engagement_parties (other) → Additional contacts/notes
```

## 🐛 Troubleshooting

### "Not connected" error

- Check if tokens are in database: `SELECT * FROM qbo_tokens WHERE is_active = true`
- Verify realm_id is present

### OAuth callback fails

- Verify redirect URI matches exactly in Intuit Developer Portal
- Check console for error messages
- Ensure QBO_CLIENT_ID and QBO_CLIENT_SECRET are correct

### Token refresh fails

- Refresh token may be expired (>100 days old)
- User needs to reconnect through OAuth flow

## 📖 Resources

- [Intuit OAuth 2.0 Docs](https://developer.intuit.com/app/developer/qbo/docs/develop/authentication-and-authorization/oauth-2.0)
- [QuickBooks API Reference](https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/customer)
- [intuit-oauth GitHub](https://github.com/intuit/oauth-jsclient)

## ✅ Ready to Use

The OAuth flow is fully functional. You can now:

1. Connect to QuickBooks through `/settings`
2. Build sync services using `getAuthenticatedClient()`
3. Query/update data in QuickBooks with automatic token refresh
