# Comment Mentions with Email Notifications

This feature enables users to @mention other users in project comments and receive email notifications.

## Features Implemented

✅ **@Mention Detection**: Type `@` in comment textarea to trigger user suggestions
✅ **User Dropdown**: Autocomplete dropdown shows filtered users as you type
✅ **Mention Storage**: Mentions are stored in `comment_mentions` table
✅ **Visual Highlighting**: @mentions are highlighted in blue in displayed comments
✅ **Email Notifications**: Edge function ready to send emails when users are mentioned

## Database Schema

### comment_mentions table

```sql
CREATE TABLE comment_mentions (
  id UUID PRIMARY KEY,
  comment_id UUID REFERENCES project_comments(id),
  mentioned_user_id UUID REFERENCES users(id),
  notified_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
```

## Setup Instructions

### 1. Run Database Migration

```bash
# Connect to your Supabase instance and run:
psql -h your-db-host -U postgres -d postgres -f db/migrations/2025-11-08-add-comment-mentions.sql
```

Or use Supabase Studio SQL Editor to run the migration file.

### 2. Deploy Edge Function

```bash
# Install Supabase CLI if you haven't
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref YOUR_PROJECT_REF

# Deploy the edge function
supabase functions deploy notify-mention
```

### 3. Configure Environment Variables

In Supabase Dashboard → Project Settings → Edge Functions → Secrets, add:

```
RESEND_API_KEY=re_UJ1319zW_BRqiboiSyQofzpxTGX5Dzjwm
APP_URL=https://floconapp.com
```

**Note**: Store this API key securely. The key above is your production Resend API key.

### 4. Set up Email Service

**Production Configuration** (Using Resend with verified domain):

1. Domain: `floorsunlimitedusa.com` (verified in Resend)
2. Sender: `FloCon <notifications@floorsunlimitedusa.com>`
3. DNS records configured for domain verification
4. API Key stored in Supabase Edge Function secrets

Email notifications are fully configured and operational in production.

## Usage

### Mentioning Users

1. Type `@` in the comment textarea
2. User dropdown appears automatically
3. Type to filter users by name
4. Click a user to insert mention
5. Post comment - mentioned users receive email

### Email Notification

Users receive an email with:

- Who mentioned them
- Which project
- The comment text
- Link to view the comment

## Customization

### Change Mention Color

Edit `renderCommentWithMentions()` in `CommentsSection.tsx`:

```tsx
style={{
  background: '#e0e7ee',  // Change background
  color: '#1e40af',       // Change text color
  padding: '2px 4px',
  borderRadius: 3,
  fontWeight: 600,
}}
```

### Modify Email Template

Edit `emailHtml` in `supabase/functions/notify-mention/index.ts`

### Add Notification Preferences

Add a `user_preferences` table:

```sql
CREATE TABLE user_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  email_on_mention BOOLEAN DEFAULT true,
  email_on_comment BOOLEAN DEFAULT false
)
```

Then check preferences before sending emails.

## Testing

### Test Mentions Locally

1. Start your dev server: `npm run dev`
2. Navigate to a project
3. Type `@` in comments
4. Select a user and post

### Test Edge Function Locally

```bash
# Start local edge functions
supabase functions serve notify-mention

# In another terminal, test the function
curl -i --location --request POST 'http://localhost:54321/functions/v1/notify-mention' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"comment_id":"123","mentioned_user_ids":["user-id"],"commenter_name":"Test User","project_name":"Test Project","comment_text":"Hello @John"}'
```

## Future Enhancements

- [ ] In-app notification bell icon
- [ ] Mark notifications as read
- [ ] Notification preferences panel
- [ ] Mention analytics/tracking
- [ ] @all or @team mentions
- [ ] Keyboard navigation in mention dropdown
- [ ] Mobile-optimized mention picker
