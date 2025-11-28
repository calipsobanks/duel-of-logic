import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

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

    console.log('Fetching weekly controversial topics from OpenAI');

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
    {"category": "Politics", "title": "string", "question": "string", "description": "string", "controversy": "string"},
    {"category": "Religion", "title": "string", "question": "string", "description": "string", "controversy": "string"},
    {"category": "Finance", "title": "string", "question": "string", "description": "string", "controversy": "string"}
  ]
}

Rules:
- Return exactly 3 topics (one from each category)
- category must be exactly "Politics", "Religion", or "Finance"
- question should be a clear, thought-provoking question that captures the debate
- title is a brief topic statement
- Focus on current week's most debated topics
- Each field should be concise but informative`
          },
          {
            role: 'user',
            content: 'What are the top 3 most controversial topics this week? Return JSON only.'
          }
        ],
        max_completion_tokens: 4000,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('OpenAI response received');
    
    const content = data.choices?.[0]?.message?.content;
    
    if (!content || content.trim() === '') {
      console.error('Empty content from OpenAI');
      throw new Error('OpenAI returned empty content');
    }
    
    let result;
    try {
      result = JSON.parse(content);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', parseError);
      throw new Error('Failed to parse AI response as JSON');
    }

    if (!result.topics || !Array.isArray(result.topics)) {
      console.error('Invalid response structure:', result);
      throw new Error('AI response missing topics array');
    }

    // Store topics in database
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get the current week start date
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week (Sunday)
    weekStart.setHours(0, 0, 0, 0);
    const weekStartStr = weekStart.toISOString().split('T')[0];

    console.log('Storing topics for week starting:', weekStartStr);

    // Delete old topics for this week (if re-running)
    await supabase
      .from('controversial_topics')
      .delete()
      .eq('week_start', weekStartStr);

    // Insert new topics
    const topicsToInsert = result.topics.map((topic: any) => ({
      category: topic.category,
      title: topic.title,
      question: topic.question || topic.title,
      description: topic.description,
      controversy: topic.controversy,
      week_start: weekStartStr
    }));

    const { error: insertError } = await supabase
      .from('controversial_topics')
      .insert(topicsToInsert);

    if (insertError) {
      console.error('Failed to insert topics:', insertError);
      throw new Error('Failed to store topics in database');
    }

    console.log('Topics successfully stored in database');

    return new Response(
      JSON.stringify({ 
        success: true,
        topics: result.topics,
        week_start: weekStartStr
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in update-weekly-topics function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
