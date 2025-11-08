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

    // Generate comprehensive legal memo based on template structure
    console.log("Generating legal memo analysis...");
    
    const memoResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are an expert legal analyst creating confidential interoffice memos for The Innocence Center. Extract all relevant information from parole transcripts to complete a structured legal memo template.'
          },
          {
            role: 'user',
            content: `Analyze this parole hearing transcript and extract information to complete a comprehensive legal memo following The Innocence Center template structure.

Extract and structure the following information:

1. CLIENT INFORMATION: Name, CDCR number, date of birth if mentioned
2. SHORT SUMMARY: 3-4 sentences about how they got convicted, their defense, and summarize innocence statements made
3. EVIDENCE USED TO CONVICT: List all evidence mentioned (testimony, physical evidence, eyewitness accounts, etc.)
4. POTENTIAL THEORY OF THE CASE: What might have gone wrong (mistaken ID, alibi defense, someone else did it, etc.)
5. CONVICTION & SENTENCE SUMMARY: Crime date/location, arrest date, conviction date, what they were convicted of, county, sentence, parole eligibility
6. COURT INFORMATION: Trial court case number, judge, trial attorney, prosecutor, co-defendants if mentioned
7. PROSECUTION PRESENTED: What the prosecution's case was based on
8. DEFENSE PRESENTED: What the defense argued
9. WRONGFUL CONVICTION ISSUES: Identify any of these issues present: eyewitness identifications, confessions, bite mark evidence, ballistics, hair comparison, fingerprints, DNA, blood spatter, gang evidence, testimony of children, psychological evaluations, etc.
10. INNOCENCE CLAIMS: Count and extract specific quotes where innocence is claimed with context

Transcript:
${transcriptText.substring(0, 50000)}`
          }
        ],
        tools: [{
          type: "function",
          function: {
            name: "generate_legal_memo",
            description: "Generate structured legal memo from transcript",
            parameters: {
              type: "object",
              properties: {
                clientInfo: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    cdcrNumber: { type: "string" },
                    dateOfBirth: { type: "string" }
                  }
                },
                shortSummary: { type: "string" },
                evidenceUsedToConvict: {
                  type: "array",
                  items: { type: "string" }
                },
                potentialTheory: { type: "string" },
                convictionSummary: {
                  type: "object",
                  properties: {
                    dateOfCrime: { type: "string" },
                    locationOfCrime: { type: "string" },
                    dateOfArrest: { type: "string" },
                    dateOfConviction: { type: "string" },
                    convictedOf: { type: "string" },
                    county: { type: "string" },
                    sentence: { type: "string" },
                    paroleEligibility: { type: "string" }
                  }
                },
                courtInfo: {
                  type: "object",
                  properties: {
                    trialCaseNo: { type: "string" },
                    trialJudge: { type: "string" },
                    trialAttorney: { type: "string" },
                    prosecutor: { type: "string" },
                    coDefendant: { type: "string" }
                  }
                },
                prosecutionPresented: { type: "string" },
                defensePresented: { type: "string" },
                wrongfulConvictionIssues: {
                  type: "array",
                  items: { type: "string" }
                },
                innocenceClaims: {
                  type: "object",
                  properties: {
                    count: { type: "number" },
                    claims: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          quote: { type: "string" },
                          context: { type: "string" }
                        },
                        required: ["quote", "context"]
                      }
                    }
                  },
                  required: ["count", "claims"]
                }
              },
              required: ["shortSummary", "evidenceUsedToConvict"]
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "generate_legal_memo" } }
      })
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
      throw new Error("AI did not return structured analysis");
    }

    const results = JSON.parse(toolCall.function.arguments);

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
