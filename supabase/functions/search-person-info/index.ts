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

    // Authorization check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create client with user's auth to verify access
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    // Get the authenticated user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Verify user has access to this analysis
    const { data: analysis, error: authError } = await supabaseClient
      .from('analyses')
      .select('user_id, assigned_to')
      .eq('id', analysisId)
      .single();

    if (authError || !analysis) {
      return new Response(JSON.stringify({ error: 'Analysis not found or access denied' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check if user owns the analysis or is assigned to it
    if (analysis.user_id !== user.id && analysis.assigned_to !== user.id) {
      // Check if user is admin
      const { data: roles } = await supabaseClient
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (!roles) {
        return new Response(JSON.stringify({ error: 'Unauthorized access to this analysis' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Create service role client for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Use AI to search for CDCR-focused public information about the person
    const searchPrompt = `Search for publicly available information about a person named "${personName}" who is involved in a California legal/corrections case as a "${personRole}". 

PRIORITY FOCUS:
1. California Department of Corrections and Rehabilitation (CDCR) records
2. California inmate/parole records
3. California court records and case information
4. News articles about California cases
5. Other public criminal justice records

Return a brief summary (2-3 sentences) focusing on:
- Any CDCR/California corrections information
- Court case involvement in California
- Relevant background in the criminal justice context
- If no specific information found, state "No public CDCR or California corrections records found"

Be factual and cite the type of source when possible (e.g., "According to California court records..." or "News reports indicate...").`;

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
