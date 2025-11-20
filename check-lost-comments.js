// check-lost-comments.js
// Check if lost comments are being created

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkLostComments() {
  try {
    console.log('=== CHECKING LOST PROSPECT COMMENTS ===\n');

    // Get recently marked lost prospects
    const { data: lostProspects, error: prospectsError } = await supabase
      .from('engagements')
      .select('id, name, active, lost_reason_id, updated_at')
      .eq('type', 'prospect')
      .eq('active', false)
      .order('updated_at', { ascending: false })
      .limit(5);

    if (prospectsError) {
      console.error('Error:', prospectsError);
      return;
    }

    console.log(
      `Found ${lostProspects?.length || 0} recently lost prospects:\n`
    );

    for (const prospect of lostProspects || []) {
      console.log(`\n--- ${prospect.name} ---`);
      console.log(`ID: ${prospect.id}`);
      console.log(`Lost Reason ID: ${prospect.lost_reason_id}`);
      console.log(`Updated: ${prospect.updated_at}`);

      // Check for comments
      const { data: comments, error: commentsError } = await supabase
        .from('engagement_comments')
        .select('id, comment_text, created_at, user_id')
        .eq('engagement_id', prospect.id)
        .order('created_at', { ascending: false })
        .limit(3);

      if (commentsError) {
        console.error('  Comments error:', commentsError);
      } else if (comments && comments.length > 0) {
        console.log(`  Comments (${comments.length}):`);
        comments.forEach((c, i) => {
          console.log(`    ${i + 1}. ${c.comment_text.substring(0, 80)}...`);
          console.log(`       Created: ${c.created_at}`);
        });
      } else {
        console.log('  No comments found');
      }
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

checkLostComments();
