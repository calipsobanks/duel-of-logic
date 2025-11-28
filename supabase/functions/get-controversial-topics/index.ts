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
            content: `You are a political and social analyst. Return ONLY valid JSON, no other text.

Your response must be a JSON object with this exact structure:
{
  "topics": [
    {"category": "Politics", "title": "string", "description": "string", "controversy": "string"},
    {"category": "Religion", "title": "string", "description": "string", "controversy": "string"},
    {"category": "Finance", "title": "string", "description": "string", "controversy": "string"}
  ]
}

Rules:
- Return exactly 3 topics (one from each category)
- category must be exactly "Politics", "Religion", or "Finance"
- Focus on current week's most debated topics
- Each field should be concise but informative`
          },
          {
            role: 'user',
            content: 'What are the top 3 most controversial topics this week? Return JSON only.'
          }
        ],
        max_completion_tokens: 1000,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Full OpenAI response:', JSON.stringify(data));
    
    const content = data.choices?.[0]?.message?.content;
    
    if (!content || content.trim() === '') {
      console.error('Empty content from OpenAI');
      throw new Error('OpenAI returned empty content');
    }
    
    console.log('OpenAI response content:', content);
    
    // Parse the JSON response with error handling
    let result;
    try {
      result = JSON.parse(content);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', parseError);
      console.error('Content was:', content);
      throw new Error('Failed to parse AI response as JSON');
    }

    if (!result.topics || !Array.isArray(result.topics)) {
      console.error('Invalid response structure:', result);
      throw new Error('AI response missing topics array');
    }

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