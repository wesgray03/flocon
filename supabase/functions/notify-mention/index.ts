// Supabase Edge Function: notify-mention
// Sends email notifications when users are mentioned in comments

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

interface MentionNotification {
  comment_id: string;
  mentioned_user_ids: string[];
  commenter_name: string;
  project_name: string;
  comment_text: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const {
      comment_id,
      mentioned_user_ids,
      commenter_name,
      project_name,
      comment_text,
    } = (await req.json()) as MentionNotification;

    // Fetch mentioned users' email addresses
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, name, email')
      .in('id', mentioned_user_ids);

    if (usersError) {
      throw usersError;
    }

    // Send email to each mentioned user
    const emailPromises = users.map(async (user) => {
      // TODO: Uncomment and configure email service (Resend/SendGrid) below
      // Example email template:
      /*
      const emailHtml = `
        <html>
          <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #1e3a5f; color: white; padding: 20px;">
              <h2>You were mentioned in a comment</h2>
            </div>
            <div style="padding: 20px; background: #faf8f5;">
              <p><strong>${commenter_name}</strong> mentioned you on project <strong>${project_name}</strong></p>
              <blockquote style="background: white; padding: 15px;">
                ${comment_text}
              </blockquote>
            </div>
          </body>
        </html>
      `

      const resendApiKey = Deno.env.get('RESEND_API_KEY')
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'FloCon <notifications@floconapp.com>',
          to: user.email,
          subject: `You were mentioned in a comment on ${project_name}`,
          html: emailHtml,
        }),
      })

      if (!response.ok) {
        console.error(`Failed to send email to ${user.email}`)
      }
      */

      // For now, just log
      console.log(`Would send email to ${user.email} (${user.name})`);

      // Update mention record to mark as notified
      await supabase
        .from('comment_mentions')
        .update({ notified_at: new Date().toISOString() })
        .eq('comment_id', comment_id)
        .eq('mentioned_user_id', user.id);

      return { success: true, email: user.email };
    });

    const results = await Promise.all(emailPromises);

    return new Response(
      JSON.stringify({
        success: true,
        notifications_sent: results.length,
        results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
