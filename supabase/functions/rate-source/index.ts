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
    const { sourceUrl, evidenceDescription } = await req.json();
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    console.log('Rating source:', sourceUrl);

    const userPrompt = `Evaluate this claim and source:

Claim: "${evidenceDescription}"
Source URL: ${sourceUrl}

Based on your knowledge, analyze this claim and source.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-2025-08-07',
        max_completion_tokens: 1000,
        messages: [
          {
            role: 'system',
            content: `You are an unbiased fact-checker. Evaluate claims based on your knowledge.

INSTRUCTIONS:
1. Rate the source credibility (1-5, where 5 is most credible) based on:
   - Domain authority and reputation
   - Known bias or objectivity
   - Typical reliability of this source type

2. Evaluate the claim as: "factual", "plausible", "misleading", or "wrong"

3. Provide 3-5 concise bullet points explaining your evaluation

4. If the claim is "misleading" or "wrong", provide:
   - A suggested factual statement that corrects the claim
   - An example showing how to quote the source properly

Format your response as JSON:
{
  "rating": <number 1-5>,
  "claimEvaluation": "factual" | "plausible" | "misleading" | "wrong",
  "reasoning": ["bullet point 1", "bullet point 2", "bullet point 3"],
  "confidence": "high" | "medium" | "low",
  "warning": "optional warning message or null",
  "suggestedCorrection": "factual statement (only if misleading/wrong)" | null,
  "quoteExample": "example of how to properly quote the source (only if misleading/wrong)" | null
}`
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
      console.error('Invalid OpenAI response structure:', JSON.stringify(data));
      throw new Error('Invalid response structure from OpenAI');
    }
    
    let content = data.choices[0].message.content;
    
    console.log('Raw AI response:', content);
    
    // Remove markdown code blocks if present
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    // Try to extract JSON if there's extra text around it
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      content = jsonMatch[0];
    }
    
    console.log('Cleaned content:', content);
    
    if (!content) {
      throw new Error('AI returned empty response');
    }
    
    // Parse the JSON response from the AI
    let result;
    try {
      result = JSON.parse(content);
    } catch (parseError) {
      console.error('Failed to parse AI response. Raw response length:', content.length);
      console.error('First 500 chars:', content.substring(0, 500));
      console.error('Last 500 chars:', content.substring(Math.max(0, content.length - 500)));
      console.error('Parse error:', parseError);
      throw new Error(`Invalid JSON from AI: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
    }
    
    // Validate the result has required fields
    if (!result.rating || !result.reasoning || !result.confidence || !result.claimEvaluation) {
      console.error('Invalid result structure:', result);
      throw new Error('AI response missing required fields (rating, reasoning, confidence, claimEvaluation)');
    }
    
    // Mark as knowledge-based (not content scraped)
    result.contentAnalyzed = false;
    
    console.log('Rating result:', result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in rate-source function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});