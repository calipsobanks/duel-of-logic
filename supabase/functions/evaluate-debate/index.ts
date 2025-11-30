import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { debateId, topic, debater1Name, debater2Name, debater1Id, debater2Id, evidence } = await req.json();
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    // Group evidence by debater for counting
    const debater1Evidence = evidence.filter((e: any) => e.debater_id === debater1Id);
    const debater2Evidence = evidence.filter((e: any) => e.debater_id === debater2Id);

    const prompt = `You are an impartial debate moderator analyzing a discussion on: "${topic}"

${debater1Name} has made ${debater1Evidence.length} rebuttals.
${debater2Name} has made ${debater2Evidence.length} rebuttals.

Recent rebuttals (most recent first):
${evidence.slice(0, 4).map((e: any, i: number) => `${i + 1}. ${e.claim.substring(0, 200)}...`).join('\n')}

Provide a brief analysis (max 3 sentences) that:
1. Identifies the core points each side is making
2. Notes if either party is straying from the topic
3. Suggests what specific aspect they should focus on next to resolve the debate

Keep it concise, neutral, and actionable.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 300,
        temperature: 0.7,
        messages: [
          { 
            role: 'system', 
            content: 'You are a neutral debate moderator. Be concise, fair, and focus on keeping discussions productive.' 
          },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API error:', error);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('OpenAI response:', JSON.stringify(data, null, 2));
    
    const evaluation = data.choices?.[0]?.message?.content;
    
    if (!evaluation || evaluation.trim() === '') {
      console.error('Empty evaluation received from OpenAI');
      throw new Error('AI returned empty evaluation');
    }

    // Save evaluation to database
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const saveResponse = await fetch(`${SUPABASE_URL}/rest/v1/debate_evaluations`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            debate_id: debateId,
            evaluation: evaluation,
            evidence_count: evidence.length
          })
        });

        if (!saveResponse.ok) {
          console.error('Failed to save evaluation to database:', await saveResponse.text());
        }
      } catch (dbError) {
        console.error('Database save error:', dbError);
      }
    }

    return new Response(
      JSON.stringify({ evaluation }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in evaluate-debate:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});