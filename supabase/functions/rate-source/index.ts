import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Function to fetch and extract website content
async function fetchWebsiteContent(url: string): Promise<{ success: boolean; title?: string; description?: string; text?: string; error?: string }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SourceRatingBot/1.0)',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }

    const html = await response.text();
    
    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : '';
    
    // Extract meta description
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
    const description = descMatch ? descMatch[1].trim() : '';
    
    // Extract main text content (remove HTML tags and scripts)
    let text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Limit text to ~4000 characters
    if (text.length > 4000) {
      text = text.substring(0, 4000) + '...';
    }
    
    return { success: true, title, description, text };
  } catch (error) {
    console.error('Error fetching website:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

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

    // Attempt to fetch website content
    const websiteContent = await fetchWebsiteContent(sourceUrl);
    console.log('Website fetch result:', websiteContent.success ? 'Success' : `Failed: ${websiteContent.error}`);

    // Build the prompt based on whether we got content
    let userPrompt = `Rate this source URL: ${sourceUrl}\n\nContext/Claim: ${evidenceDescription}`;
    
    if (websiteContent.success) {
      userPrompt += `\n\nACTUAL WEBSITE CONTENT EXTRACTED:\n`;
      if (websiteContent.title) userPrompt += `Title: ${websiteContent.title}\n`;
      if (websiteContent.description) userPrompt += `Description: ${websiteContent.description}\n`;
      if (websiteContent.text) userPrompt += `Content: ${websiteContent.text}\n`;
      userPrompt += `\nIMPORTANT: Base your rating ONLY on this actual content. Do not make assumptions.`;
    } else {
      userPrompt += `\n\nWARNING: Could not fetch website content (${websiteContent.error}). Rate based on URL structure and domain only. Be conservative with rating.`;
    }

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
            content: `You are an unbiased fact-checker evaluating source credibility. Rate sources from 1-5 based on:
- Authority and expertise of the source
- Verification and evidence quality
- Bias and objectivity
- Relevance to the claim

CRITICAL INSTRUCTIONS:
- If website content is provided, analyze ONLY that content
- Do NOT make assumptions about what might be on the website
- If content is unavailable, clearly state this affects your rating
- If you cannot verify information, explicitly say "Unable to verify"

Provide:
1. A rating (1-5, where 5 is most credible)
2. Exactly 3-5 concise bullet points explaining the rating
3. A confidence level: "high", "medium", or "low"
4. Optional warning if there are concerns

Format your response as JSON:
{
  "rating": <number 1-5>,
  "reasoning": ["bullet point 1", "bullet point 2", "bullet point 3"],
  "confidence": "high" | "medium" | "low",
  "warning": "optional warning message or null"
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
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    let content = data.choices[0].message.content;
    
    // Remove markdown code blocks if present
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    // Parse the JSON response from the AI
    const result = JSON.parse(content);
    
    // Add metadata about content analysis
    result.contentAnalyzed = websiteContent.success;
    
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