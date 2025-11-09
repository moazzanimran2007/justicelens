import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const { analysisId, personName, personRole } = await req.json();
    
    console.log('Searching for person:', personName);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Use AI to search for public information about the person
    const searchPrompt = `Search for publicly available information about a person named "${personName}" who is involved in a legal case as a "${personRole}". Focus on factual, publicly available information from court records, news articles, or public databases. Return a brief summary (2-3 sentences) of what is publicly known about this person in the context of this role.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a legal research assistant. Only provide factual information from public sources.' },
          { role: 'user', content: searchPrompt }
        ],
      }),
    });

    if (response.status === 429) {
      throw new Error("Rate limit exceeded. Please try again later.");
    }
    if (response.status === 402) {
      throw new Error("AI credits exhausted. Please add credits to continue.");
    }
    if (!response.ok) {
      throw new Error(`AI request failed: ${response.status}`);
    }

    const data = await response.json();
    const summary = data.choices[0].message.content;

    // Create search result object
    const searchResult = {
      name: personName,
      role: personRole,
      summary: summary,
      cdcr_search_link: `https://ciris.mt.cdcr.ca.gov/search?name=${encodeURIComponent(personName)}`,
      searched_at: new Date().toISOString()
    };

    // Get current legal memo
    const { data: memoData, error: fetchError } = await supabase
      .from('legal_memos')
      .select('people_additional_info')
      .eq('analysis_id', analysisId)
      .single();

    if (fetchError) {
      console.error('Error fetching memo:', fetchError);
      throw fetchError;
    }

    // Update with new search result
    const currentInfo = memoData?.people_additional_info || [];
    const updatedInfo = [...currentInfo, searchResult];

    const { error: updateError } = await supabase
      .from('legal_memos')
      .update({ people_additional_info: updatedInfo })
      .eq('analysis_id', analysisId);

    if (updateError) {
      console.error('Error updating memo:', updateError);
      throw updateError;
    }

    return new Response(
      JSON.stringify({ success: true, result: searchResult }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in search-person-info function:', error);
    
    let statusCode = 500;
    const message = error instanceof Error ? error.message : 'Unknown error';
    const lower = typeof message === 'string' ? message.toLowerCase() : '';
    if (lower.includes('rate limit')) statusCode = 429;
    else if (lower.includes('credit') || lower.includes('payment')) statusCode = 402;

    return new Response(
      JSON.stringify({ error: message }),
      {
        status: statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
