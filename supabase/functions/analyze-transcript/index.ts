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
    const { analysisId, transcriptText, modules } = await req.json();
    
    console.log('Starting analysis for ID:', analysisId);
    console.log('Selected modules:', modules);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Update status to processing
    await supabase
      .from('analyses')
      .update({ status: 'processing' })
      .eq('id', analysisId);

    // Prepare analysis prompts based on selected modules
    const results: any = {};

    // Innocence Claims Detector
    if (modules.includes('innocence')) {
      console.log('Analyzing innocence claims...');
      const innocencePrompt = `Analyze the following parole hearing transcript and identify ALL explicit or implicit innocence claims. Look for:
- Direct statements like "I maintain my innocence" or "I didn't do it"
- Implicit claims like "I was wrongfully convicted" or "the evidence doesn't support..."
- Contextual denials or minimization of guilt
- Paraphrased claims of innocence

Transcript:
${transcriptText}

Return a JSON object with:
{
  "detected": boolean,
  "count": number,
  "examples": [array of quoted text excerpts],
  "analysis": "brief explanation of patterns found"
}`;

      const innocenceResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: 'You are an expert legal analyst specializing in criminal justice and parole hearings.' },
            { role: 'user', content: innocencePrompt }
          ],
          response_format: { type: "json_object" }
        }),
      });

      if (innocenceResponse.status === 429) {
        throw new Error("Rate limit exceeded. Please try again later.");
      }
      if (innocenceResponse.status === 402) {
        throw new Error("AI credits exhausted. Please add credits to continue.");
      }
      if (!innocenceResponse.ok) {
        throw new Error(`AI request failed: ${innocenceResponse.status}`);
      }

      const innocenceData = await innocenceResponse.json();
      results.innocenceClaims = JSON.parse(innocenceData.choices[0].message.content);
    }

    // Bias & Fairness Audit
    if (modules.includes('bias')) {
      console.log('Analyzing bias indicators...');
      const biasPrompt = `Analyze the following parole hearing transcript for bias and fairness issues. Look for:
- Victim-centric framing that doesn't account for rehabilitation
- Comments about demeanor, appearance, or body language
- Use of "lack of insight" or "lack of remorse" language
- Stigmatizing language or proxy language for race/class
- Focus on unchangeable past vs. current rehabilitation

Transcript:
${transcriptText}

Return a JSON object with:
{
  "found": boolean,
  "categories": [
    {
      "type": "category name",
      "count": number,
      "severity": "low|moderate|high",
      "examples": ["quote 1", "quote 2"]
    }
  ],
  "overall_assessment": "brief summary"
}`;

      const biasResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: 'You are an expert in criminal justice reform and bias detection in legal proceedings.' },
            { role: 'user', content: biasPrompt }
          ],
          response_format: { type: "json_object" }
        }),
      });

      if (!biasResponse.ok) {
        throw new Error(`AI request failed: ${biasResponse.status}`);
      }

      const biasData = await biasResponse.json();
      results.biasIndicators = JSON.parse(biasData.choices[0].message.content);
    }

    // Advocate Fact Sheet
    if (modules.includes('summary')) {
      console.log('Generating advocate fact sheet...');
      const summaryPrompt = `Generate a concise advocate fact sheet from this parole hearing transcript. Extract:
- Offense context and conviction details
- Years served and time in custody
- Programming completed (education, therapy, vocational training)
- Parole factors cited by the board
- Any evidence supporting or contradicting claims

Transcript:
${transcriptText}

Return a JSON object with:
{
  "offenseContext": "brief description",
  "yearsServed": number,
  "programming": "summary of programs completed",
  "paroleFactors": "key factors mentioned",
  "supportingEvidence": ["evidence point 1", "evidence point 2"],
  "concerns": ["concern 1", "concern 2"]
}`;

      const summaryResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: 'You are a legal advocate assistant preparing materials for parole cases.' },
            { role: 'user', content: summaryPrompt }
          ],
          response_format: { type: "json_object" }
        }),
      });

      if (!summaryResponse.ok) {
        throw new Error(`AI request failed: ${summaryResponse.status}`);
      }

      const summaryData = await summaryResponse.json();
      results.summary = JSON.parse(summaryData.choices[0].message.content);
    }

    // Language Pattern Analysis
    if (modules.includes('language')) {
      console.log('Analyzing language patterns...');
      const languagePrompt = `Analyze how key terms are used in this parole hearing transcript:
- "insight" and related terms
- "remorse" and related terms
- "accountability" and related terms

Count frequency and analyze context (positive, negative, questioning).

Transcript:
${transcriptText}

Return a JSON object with:
{
  "insight": {
    "frequency": number,
    "context": "positive|negative|mixed",
    "examples": ["usage example 1", "usage example 2"]
  },
  "remorse": {
    "frequency": number,
    "context": "positive|negative|mixed",
    "examples": ["usage example 1", "usage example 2"]
  },
  "accountability": {
    "frequency": number,
    "context": "positive|negative|mixed",
    "examples": ["usage example 1", "usage example 2"]
  }
}`;

      const languageResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: 'You are a linguistic analyst specializing in criminal justice language.' },
            { role: 'user', content: languagePrompt }
          ],
          response_format: { type: "json_object" }
        }),
      });

      if (!languageResponse.ok) {
        throw new Error(`AI request failed: ${languageResponse.status}`);
      }

      const languageData = await languageResponse.json();
      results.languageAnalysis = JSON.parse(languageData.choices[0].message.content);
    }

    // Update analysis with results
    const { error: updateError } = await supabase
      .from('analyses')
      .update({
        status: 'completed',
        results: results
      })
      .eq('id', analysisId);

    if (updateError) {
      throw updateError;
    }

    console.log('Analysis completed successfully');

    return new Response(
      JSON.stringify({ success: true, results }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in analyze-transcript function:', error);
    
    // Try to update the analysis status to failed
    try {
      const { analysisId } = await req.json();
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      await supabase
        .from('analyses')
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error'
        })
        .eq('id', analysisId);
    } catch (updateError) {
      console.error('Failed to update analysis status:', updateError);
    }

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
