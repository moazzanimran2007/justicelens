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

  // Parse request body once at the start
  let analysisId: string | undefined;
  let transcriptText: string;
  let modules: string[];
  
  try {
    const body = await req.json();
    analysisId = body.analysisId;
    transcriptText = body.transcriptText;
    modules = body.modules;
    
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

    // Extract comprehensive legal memo information
    console.log('Extracting legal memo information...');
    
    const memoPrompt = `Analyze this parole hearing transcript and extract ALL available information for a legal memo. Extract as much detail as possible from the transcript.`;

    const memoResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a legal analyst expert. Extract ALL available information from the transcript. Use "Not mentioned" for fields not found in the transcript. You MUST use the provided function to return structured data.' },
          { role: 'user', content: `${memoPrompt}\n\nTranscript:\n${transcriptText}` }
        ],
        tools: [{
          type: "function",
          function: {
            name: "extract_legal_memo",
            description: "Extract comprehensive legal memo information from parole transcript",
            parameters: {
              type: "object",
              properties: {
                client_name: { type: "string", description: "Client's full name" },
                cdcr_number: { type: "string", description: "CDCR number if mentioned" },
                contact_information: { type: "string", description: "Contact information if mentioned" },
                date_of_birth: { type: "string", description: "Date of birth if mentioned" },
                short_summary: { type: "string", description: "3-4 sentences reflecting how they got convicted, their defense, and innocence statements" },
                evidence_used_to_convict: { 
                  type: "array", 
                  items: { type: "string" },
                  description: "List of evidence items used to convict"
                },
                potential_theory_of_case: { type: "string", description: "Theory of what could have gone wrong (mistaken ID, alibi, etc.)" },
                date_of_crime: { type: "string" },
                location_of_crime: { type: "string" },
                date_of_arrest: { type: "string" },
                date_of_conviction: { type: "string" },
                convicted_of: { type: "string", description: "Charges/crimes convicted of" },
                county_of_conviction: { type: "string" },
                sentence: { type: "string", description: "Sentence details" },
                parole_eligibility_date: { type: "string" },
                prior_parole_hearing_result: { type: "string" },
                client_priors: { type: "string", description: "Prior convictions/criminal history" },
                trial_court_case_no: { type: "string" },
                trial_court_judge_dept: { type: "string", description: "Trial court, judge, and department" },
                trial_attorney: { type: "string" },
                prosecuting_attorney: { type: "string" },
                co_defendant: { type: "string" },
                co_defendant_attorney: { type: "string" },
                appellate_case_no: { type: "string" },
                appellate_attorneys: { type: "string" },
                direct_appeal_date: { type: "string" },
                direct_appeal_issues: { 
                  type: "array", 
                  items: { type: "string" },
                  description: "Issues raised in direct appeal"
                },
                petition_for_review_date: { type: "string" },
                petition_for_review_issues: { 
                  type: "array", 
                  items: { type: "string" }
                },
                habeas_petition_date: { type: "string" },
                habeas_petition_issues: { 
                  type: "array", 
                  items: { type: "string" }
                },
                prosecution_presented: { type: "string", description: "Summary of prosecution's case presentation" },
                defense_presented: { type: "string", description: "Summary of defense's case presentation" },
                wrongful_conviction_issues: {
                  type: "array",
                  items: { 
                    type: "string",
                    enum: [
                      "Eyewitness identifications",
                      "Shaken Baby Syndrome Theory",
                      "Confessions",
                      "Abusive Head Trauma Theory",
                      "Bite mark evidence",
                      "Ballistics analysis",
                      "Hair comparison analysis",
                      "Shoe print analysis",
                      "Fingerprint analysis",
                      "GPS/Cell Phone Tower Data",
                      "Arson/explosives testimony",
                      "Fiber comparison",
                      "Tool mark analysis",
                      "Gang evidence",
                      "Tire track analysis",
                      "Blood Spatter",
                      "DNA",
                      "Testimony of Children",
                      "Psychological Evaluations",
                      "Scent Detection Dogs"
                    ]
                  },
                  description: "List of wrongful conviction issues present in the case"
                },
                innocence_claims: {
                  type: "object",
                  properties: {
                    detected: { type: "boolean" },
                    count: { type: "number" },
                    examples: { type: "array", items: { type: "string" } },
                    analysis: { type: "string" }
                  }
                }
              },
              required: [
                "client_name", "short_summary", "evidence_used_to_convict", 
                "potential_theory_of_case", "prosecution_presented", 
                "defense_presented", "wrongful_conviction_issues", "innocence_claims"
              ]
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "extract_legal_memo" } }
      }),
    });

    if (memoResponse.status === 429) {
      throw new Error("Rate limit exceeded. Please try again later.");
    }
    if (memoResponse.status === 402) {
      throw new Error("AI credits exhausted. Please add credits to continue.");
    }
    if (!memoResponse.ok) {
      throw new Error(`AI request failed: ${memoResponse.status}`);
    }

    const memoData = await memoResponse.json();
    const toolCall = memoData.choices[0].message.tool_calls?.[0];
    
    if (!toolCall?.function?.arguments) {
      throw new Error("AI did not return structured memo data");
    }

    const legalMemo = JSON.parse(toolCall.function.arguments);

    // Store legal memo in database
    const { error: memoInsertError } = await supabase
      .from('legal_memos')
      .insert({
        analysis_id: analysisId,
        ...legalMemo
      });

    if (memoInsertError) {
      console.error('Error inserting legal memo:', memoInsertError);
      throw memoInsertError;
    }

    // Update analysis with completion status
    const { error: updateError } = await supabase
      .from('analyses')
      .update({
        status: 'completed',
        results: { memo_extracted: true }
      })
      .eq('id', analysisId);

    if (updateError) {
      throw updateError;
    }

    console.log('Legal memo extraction completed successfully');

    return new Response(
      JSON.stringify({ success: true, legalMemo }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in analyze-transcript function:', error);
    
    // Update the analysis status to failed if we have the analysisId
    if (analysisId) {
      try {
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
