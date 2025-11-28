import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!openAIApiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    console.log('Fetching controversial topics from OpenAI');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-mini-2025-08-07',
        messages: [
          {
            role: 'system',
            content: `You are a political and social analyst. Identify the top 3 most controversial topics from the current week across politics, religion, and finance. 

Return ONLY a valid JSON object in this exact format:
{
  "topics": [
    {
      "category": "Politics" | "Religion" | "Finance",
      "title": "Brief topic title",
      "description": "One sentence description",
      "controversy": "Why this is controversial in one sentence"
    }
  ]
}

Focus on topics that would generate meaningful debate from multiple perspectives.`
          },
          {
            role: 'user',
            content: 'What are the top 3 most controversial topics this week across politics, religion, and finance?'
          }
        ],
        max_completion_tokens: 800,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    console.log('OpenAI response:', content);
    
    // Parse the JSON response
    const result = JSON.parse(content);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in get-controversial-topics function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        topics: []
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});