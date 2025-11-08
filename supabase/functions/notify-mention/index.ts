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
  project_id: string;
  comment_text: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Parse request body
    const requestBody = await req.text();
    console.log('Request body length:', requestBody.length);
    console.log('Request body:', requestBody);

    if (!requestBody || requestBody.trim() === '') {
      console.error('Empty request body received');
      return new Response(JSON.stringify({ error: 'Empty request body' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    let parsedBody: MentionNotification;
    try {
      parsedBody = JSON.parse(requestBody);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Attempted to parse:', requestBody);
      return new Response(JSON.stringify({ error: 'Invalid JSON in request body' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const {
      comment_id,
      mentioned_user_ids,
      commenter_name,
      project_name,
      project_id,
      comment_text,
    } = parsedBody;

    if (!mentioned_user_ids || mentioned_user_ids.length === 0) {
      console.log('No mentions to notify');
      return new Response(
        JSON.stringify({ success: true, notifications_sent: 0 }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

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
      const appUrl = Deno.env.get('APP_URL') || 'http://localhost:3000';
      const projectUrl = `${appUrl}/projects/${project_id}`;
      
      console.log(`Generating email for ${user.email}`);
      console.log(`Project URL: ${projectUrl}`);
      
      const emailHtml = `
        <html>
          <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #1e3a5f; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
              <h2 style="margin: 0;">You were mentioned in a comment</h2>
            </div>
            <div style="padding: 20px; background: #faf8f5; border: 1px solid #e5dfd5; border-radius: 0 0 8px 8px;">
              <p><strong>${commenter_name}</strong> mentioned you in a comment on project <strong>${project_name}</strong>:</p>
              <blockquote style="background: white; padding: 15px; border-left: 4px solid #1e3a5f; margin: 15px 0;">
                ${comment_text}
              </blockquote>
              <div style="margin-top: 20px;">
                <a href="${projectUrl}" style="background: #1e3a5f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Project</a>
              </div>
            </div>
          </body>
        </html>
      `;

      try {
        const resendApiKey = Deno.env.get('RESEND_API_KEY');
        
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'FloCon <notifications@floorsunlimitedusa.com>',
            to: user.email,
            subject: `You were mentioned in a comment on ${project_name}`,
            html: emailHtml,
          }),
        });

        if (!response.ok) {
          console.error(
            `Failed to send email to ${user.email}:`,
            await response.text()
          );
        } else {
          console.log(`✅ Email sent to ${user.email}`);
        }
      } catch (emailError) {
        console.error(`Error sending email to ${user.email}:`, emailError);
      }

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
