import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { targetUserId, action, actorId, message } = await req.json();

    console.log('Notifying user:', targetUserId, 'of action:', action, 'by:', actorId);

    // Get the target user's phone number
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('phone_number')
      .eq('id', targetUserId)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch user profile' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (!profile?.phone_number) {
      console.log('User has no phone number set, skipping notification');
      return new Response(
        JSON.stringify({ message: 'User has no phone number' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Get the actor's name
    const { data: actorProfile, error: actorError } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', actorId)
      .single();

    if (actorError) {
      console.error('Error fetching actor profile:', actorError);
    }

    const actorName = actorProfile?.username || 'Someone';

    // Send webhook to Zapier
    const webhookUrl = 'https://hooks.zapier.com/hooks/catch/15079498/ukhjsxh/';
    
    console.log('Sending webhook for phone:', profile.phone_number);
    
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone: profile.phone_number,
        action: action,
        name: actorName,
        message: message || '',
        timestamp: new Date().toISOString(),
      }),
    });

    if (!webhookResponse.ok) {
      console.error('Webhook failed:', webhookResponse.status);
      return new Response(
        JSON.stringify({ error: 'Failed to send webhook' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log('Webhook sent successfully');

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error in notify-debate-action:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});