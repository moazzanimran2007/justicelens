import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to calculate innocence score
function calculateInnocenceScore(data: any): number {
  let score = 0;

  // 1. Innocence Claims Score (30 points max)
  if (data.innocenceClaims) {
    const claimCount = data.innocenceClaims.count || 0;
    const claimScore = Math.min(claimCount * 5, 30);
    score += claimScore;
  }

  // 2. Wrongful Conviction Indicators (35 points max)
  if (data.legalMemo?.wrongful_conviction_issues) {
    const issueCount = data.legalMemo.wrongful_conviction_issues.length;
    const convictionScore = Math.min(issueCount * 7, 35);
    score += convictionScore;
  }

  // 3. Bias Score Impact (25 points max)
  if (data.biasIndicators?.categories) {
    const totalBiasCount = data.biasIndicators.categories.reduce((sum: number, cat: any) => {
      const multiplier = cat.severity === "high" ? 2 : cat.severity === "moderate" ? 1.5 : 1;
      return sum + (cat.count * multiplier);
    }, 0);
    const biasScore = Math.min(totalBiasCount * 2, 25);
    score += biasScore;
  }

  // 4. Evidence Quality Assessment (10 points max)
  if (data.legalMemo?.evidence_used_to_convict) {
    const evidenceCount = data.legalMemo.evidence_used_to_convict.length;
    if (evidenceCount <= 2) {
      score += 10;
    } else if (evidenceCount <= 4) {
      score += 6;
    } else {
      score += 3;
    }
  }

  return Math.min(Math.round(score), 100);
}

// Helper function to determine priority based on score
function getPriorityFromScore(score: number): string {
  if (score > 80) return 'urgent';
  if (score >= 66) return 'high';
  if (score >= 36) return 'medium';
  return 'low';
}

// Helper function to extract commissioner from context
function extractCommissionerFromContext(context: string): { name: string; title: string } | null {
  const commissionerMatch = context.match(/Commissioner\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i);
  
  if (commissionerMatch) {
    const fullMatch = commissionerMatch[0];
    const name = commissionerMatch[1];
    
    const title = fullMatch.toLowerCase().includes('deputy') 
      ? 'Deputy Commissioner' 
      : fullMatch.toLowerCase().includes('presiding')
      ? 'Presiding Commissioner'
      : 'Commissioner';
    
    return { name, title };
  }
  
  return null;
}

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
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Authorization check - get JWT from header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Create a Supabase client with the user's JWT token for RLS
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    // Verify the JWT token by getting the user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    
    if (userError || !user) {
      console.error('Auth verification failed:', userError);
      return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Authenticated user:', user.id);

    // Verify user has access to this analysis using RLS-enabled query
    const { data: analysis, error: authError } = await supabaseClient
      .from('analyses')
      .select('user_id, assigned_to')
      .eq('id', analysisId)
      .single();

    if (authError || !analysis) {
      console.error('Analysis access check failed:', authError);
      return new Response(JSON.stringify({ error: 'Analysis not found or access denied' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('User has access to analysis:', analysisId);

    // Create service role client for database operations (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
      const innocencePrompt = `Analyze the following parole hearing transcript and identify ALL explicit or implicit innocence claims. For each claim, try to identify the approximate page number or section where it appears in the transcript.`;

      const innocenceResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: 'You are an expert legal analyst. You MUST use the provided function to return structured analysis.' },
            { role: 'user', content: `${innocencePrompt}\n\nTranscript:\n${transcriptText.substring(0, 50000)}` }
          ],
          tools: [{
            type: "function",
            function: {
              name: "analyze_innocence_claims",
              description: "Analyze transcript for innocence claims with location information",
              parameters: {
                type: "object",
                properties: {
                  detected: { type: "boolean", description: "Whether innocence claims were found" },
                  count: { type: "number", description: "Number of innocence claims detected" },
                  examples: { 
                    type: "array", 
                    items: {
                      type: "object",
                      properties: {
                        quote: { type: "string", description: "Direct quote of the innocence claim" },
                        page: { type: "string", description: "Page number or section reference (e.g., 'Page 5', 'Beginning', 'Middle')" },
                        context: { type: "string", description: "Brief context about the claim" }
                      },
                      required: ["quote", "page"]
                    },
                    description: "Innocence claims with their locations in the transcript"
                  },
                  analysis: { type: "string", description: "Brief explanation of patterns found" }
                },
                required: ["detected", "count", "examples", "analysis"]
              }
            }
          }],
          tool_choice: { type: "function", function: { name: "analyze_innocence_claims" } }
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
      const toolCall = innocenceData.choices[0].message.tool_calls?.[0];
      
      if (toolCall?.function?.arguments) {
        results.innocenceClaims = JSON.parse(toolCall.function.arguments);
      } else {
        throw new Error("AI did not return structured innocence analysis");
      }
    }

    // Bias & Fairness Audit
    if (modules.includes('bias')) {
      console.log('Analyzing bias indicators...');
      const biasPrompt = `Analyze the parole hearing transcript for bias and fairness issues including victim-centric framing, demeanor comments, stigmatizing language, and focus on unchangeable past. For each example found, identify the approximate page number AND include the FULL NAME of the person who said it in the context (e.g., "Commissioner Neil Schneider said..."). Focus especially on identifying commissioners and their biased statements.`;

      const biasResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: 'You are an expert in criminal justice reform. You MUST use the provided function to return structured analysis.' },
            { role: 'user', content: `${biasPrompt}\n\nTranscript:\n${transcriptText.substring(0, 50000)}` }
          ],
          tools: [{
            type: "function",
            function: {
              name: "analyze_bias",
              description: "Analyze transcript for bias and fairness issues with location information",
              parameters: {
                type: "object",
                properties: {
                  found: { type: "boolean" },
                  categories: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        type: { type: "string" },
                        count: { type: "number" },
                        severity: { type: "string", enum: ["low", "moderate", "high"] },
                        occurrences: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              quote: { type: "string", description: "The problematic quote from the transcript" },
                              page: { type: "string", description: "Page number or section reference (e.g., 'Page 5', 'Beginning', 'Middle')" },
                              context: { type: "string", description: "Brief context including the FULL NAME of who said it (e.g., 'Commissioner Neil Schneider said...')" }
                            },
                            required: ["quote", "page"]
                          }
                        }
                      },
                      required: ["type", "count", "severity", "occurrences"]
                    }
                  },
                  overall_assessment: { type: "string" }
                },
                required: ["found", "categories", "overall_assessment"]
              }
            }
          }],
          tool_choice: { type: "function", function: { name: "analyze_bias" } }
        }),
      });

      if (!biasResponse.ok) {
        throw new Error(`AI request failed: ${biasResponse.status}`);
      }

      const biasData = await biasResponse.json();
      const toolCall = biasData.choices[0].message.tool_calls?.[0];
      
      if (toolCall?.function?.arguments) {
        results.biasIndicators = JSON.parse(toolCall.function.arguments);
        
        // Extract and store commissioner bias statements
        console.log('Extracting commissioners from bias statements...');
        if (results.biasIndicators?.categories) {
          for (const category of results.biasIndicators.categories) {
            for (const occurrence of category.occurrences) {
              const commissionerInfo = extractCommissionerFromContext(occurrence.context || '');
              
              if (commissionerInfo) {
                // Get or create commissioner
                const { data: commissioner, error: commissionerError } = await supabase
                  .from('commissioners')
                  .upsert({
                    name: commissionerInfo.name,
                    title: commissionerInfo.title
                  }, {
                    onConflict: 'name',
                    ignoreDuplicates: false
                  })
                  .select()
                  .single();
                
                if (commissionerError) {
                  console.error('Error upserting commissioner:', commissionerError);
                  continue;
                }
                
                // Insert bias statement
                const { error: statementError } = await supabase
                  .from('commissioner_bias_statements')
                  .insert({
                    commissioner_id: commissioner.id,
                    analysis_id: analysisId,
                    bias_type: category.type,
                    severity: category.severity,
                    quote: occurrence.quote,
                    page_reference: occurrence.page,
                    context: occurrence.context
                  });
                
                if (statementError) {
                  console.error('Error inserting bias statement:', statementError);
                }
              }
            }
          }
        }
      } else {
        throw new Error("AI did not return structured bias analysis");
      }
    }

    // Advocate Fact Sheet / Legal Memo
    if (modules.includes('summary')) {
      console.log('Generating comprehensive legal memo...');
      const memoPrompt = `Extract ALL available information from this parole hearing transcript to create a comprehensive legal memo. Include client information, conviction details, court information, and all available case details. Be thorough and extract every piece of factual information mentioned.`;

      const memoResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: 'You are a legal memo expert. Extract ALL factual information from the transcript. You MUST use the provided function to return structured data.' },
            { role: 'user', content: `${memoPrompt}\n\nTranscript:\n${transcriptText.substring(0, 50000)}` }
          ],
          tools: [{
            type: "function",
            function: {
              name: "extract_legal_memo",
              description: "Extract comprehensive legal memo information from parole transcript",
              parameters: {
                type: "object",
                properties: {
                  // Client Information
                  client_name: { type: "string", description: "Full name of the incarcerated person" },
                  cdcr_number: { type: "string", description: "CDCR identification number" },
                  contact_information: { type: "string", description: "Contact details or location" },
                  date_of_birth: { type: "string", description: "Date of birth" },
                  
                  // Introduction
                  short_summary: { type: "string", description: "3-4 sentence summary of conviction, defense, and innocence claims" },
                  evidence_used_to_convict: { type: "array", items: { type: "string" }, description: "List of evidence presented at trial" },
                  potential_theory_of_case: { type: "string", description: "Potential legal theory (mistaken ID, alibi, etc.)" },
                  
                  // Conviction & Sentence
                  date_of_crime: { type: "string" },
                  location_of_crime: { type: "string" },
                  date_of_arrest: { type: "string" },
                  date_of_conviction: { type: "string" },
                  convicted_of: { type: "string", description: "Charges convicted of" },
                  county_of_conviction: { type: "string" },
                  sentence: { type: "string", description: "Sentence imposed" },
                  parole_eligibility_date: { type: "string" },
                  prior_parole_hearing_result: { type: "string" },
                  client_priors: { type: "string", description: "Prior criminal history" },
                  
                  // Court Information
                  trial_court_case_no: { type: "string" },
                  trial_court_judge_dept: { type: "string" },
                  trial_attorney: { type: "string" },
                  prosecuting_attorney: { type: "string" },
                  co_defendant: { type: "string" },
                  co_defendant_attorney: { type: "string" },
                  appellate_case_no: { type: "string" },
                  appellate_attorneys: { type: "string" },
                  
                  // Post-Conviction Issues
                  direct_appeal_date: { type: "string" },
                  direct_appeal_issues: { type: "array", items: { type: "string" } },
                  petition_for_review_date: { type: "string" },
                  petition_for_review_issues: { type: "array", items: { type: "string" } },
                  habeas_petition_date: { type: "string" },
                  habeas_petition_issues: { type: "array", items: { type: "string" } },
                  
                  // Case Presentations
                  prosecution_presented: { type: "string", description: "What prosecution presented if mentioned" },
                  defense_presented: { type: "string", description: "What defense presented if mentioned" },
                  
                  // Wrongful Conviction Issues
                  wrongful_conviction_issues: { 
                    type: "array", 
                    items: { type: "string" },
                    description: "List any present: Eyewitness ID, Confessions, Bite marks, Hair analysis, DNA, Gang evidence, etc."
                  }
                },
                required: ["client_name", "short_summary"]
              }
            }
          }],
          tool_choice: { type: "function", function: { name: "extract_legal_memo" } }
        }),
      });

      if (!memoResponse.ok) {
        throw new Error(`AI request failed: ${memoResponse.status}`);
      }

      const memoData = await memoResponse.json();
      const toolCall = memoData.choices[0].message.tool_calls?.[0];
      
      if (toolCall?.function?.arguments) {
        const legalMemo = JSON.parse(toolCall.function.arguments);
        results.legalMemo = legalMemo;
        
        // Store in legal_memos table
        const { error: memoInsertError } = await supabase
          .from('legal_memos')
          .insert({
            analysis_id: analysisId,
            ...legalMemo
          });
        
        if (memoInsertError) {
          console.error('Error inserting legal memo:', memoInsertError);
        }
        
        // Update analyses table with client name and case number for easy display
        await supabase
          .from('analyses')
          .update({
            client_name: legalMemo.client_name || null,
            case_number: legalMemo.cdcr_number || null
          })
          .eq('id', analysisId);
      } else {
        throw new Error("AI did not return structured legal memo");
      }
    }

    // Extract People Mentioned (always run this for legal memo)
    let peopleMentioned: any[] = [];
    if (modules.includes('summary')) {
      console.log('Extracting people mentioned in transcript...');
      const peoplePrompt = `Extract ALL people mentioned in this parole hearing transcript. Include names, their roles/relationships to the case (victim, witness, board member, attorney, family member, etc.), and any relevant context about them.`;

      const peopleResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: 'You are an expert at extracting names and identifying people from legal transcripts. You MUST use the provided function to return structured data.' },
            { role: 'user', content: `${peoplePrompt}\n\nTranscript:\n${transcriptText.substring(0, 50000)}` }
          ],
          tools: [{
            type: "function",
            function: {
              name: "extract_people",
              description: "Extract all people mentioned in the transcript",
              parameters: {
                type: "object",
                properties: {
                  people: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string", description: "Full name of the person" },
                        role: { type: "string", description: "Role or relationship to case (e.g., victim, witness, attorney, board member)" },
                        context: { type: "string", description: "Brief context about this person or what they did/said" }
                      },
                      required: ["name", "role"]
                    }
                  }
                },
                required: ["people"]
              }
            }
          }],
          tool_choice: { type: "function", function: { name: "extract_people" } }
        }),
      });

      if (peopleResponse.ok) {
        const peopleData = await peopleResponse.json();
        const toolCall = peopleData.choices[0].message.tool_calls?.[0];
        
        if (toolCall?.function?.arguments) {
          const extracted = JSON.parse(toolCall.function.arguments);
          peopleMentioned = extracted.people || [];
          
          // Update the legal_memos table with people mentioned
          if (analysisId) {
            await supabase
              .from('legal_memos')
              .update({ people_mentioned: peopleMentioned })
              .eq('analysis_id', analysisId);
          }
        }
      }
    }

    // Language Pattern Analysis
    if (modules.includes('language')) {
      console.log('Analyzing language patterns...');
      const languagePrompt = `Analyze usage and context of key terms: "insight", "remorse", and "accountability" in the transcript.`;

      const languageResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: 'You are a linguistic analyst. You MUST use the provided function to return structured analysis.' },
            { role: 'user', content: `${languagePrompt}\n\nTranscript:\n${transcriptText.substring(0, 50000)}` }
          ],
          tools: [{
            type: "function",
            function: {
              name: "analyze_language_patterns",
              description: "Analyze language pattern usage in transcript",
              parameters: {
                type: "object",
                properties: {
                  insight: {
                    type: "object",
                    properties: {
                      frequency: { type: "number" },
                      context: { type: "string", enum: ["positive", "negative", "mixed"] },
                      examples: { type: "array", items: { type: "string" } }
                    },
                    required: ["frequency", "context", "examples"]
                  },
                  remorse: {
                    type: "object",
                    properties: {
                      frequency: { type: "number" },
                      context: { type: "string", enum: ["positive", "negative", "mixed"] },
                      examples: { type: "array", items: { type: "string" } }
                    },
                    required: ["frequency", "context", "examples"]
                  },
                  accountability: {
                    type: "object",
                    properties: {
                      frequency: { type: "number" },
                      context: { type: "string", enum: ["positive", "negative", "mixed"] },
                      examples: { type: "array", items: { type: "string" } }
                    },
                    required: ["frequency", "context", "examples"]
                  }
                },
                required: ["insight", "remorse", "accountability"]
              }
            }
          }],
          tool_choice: { type: "function", function: { name: "analyze_language_patterns" } }
        }),
      });

      if (!languageResponse.ok) {
        throw new Error(`AI request failed: ${languageResponse.status}`);
      }

      const languageData = await languageResponse.json();
      const toolCall = languageData.choices[0].message.tool_calls?.[0];
      
      if (toolCall?.function?.arguments) {
        results.languageAnalysis = JSON.parse(toolCall.function.arguments);
      } else {
        throw new Error("AI did not return structured language analysis");
      }
    }

    // Calculate innocence score and determine priority
    const innocenceScore = calculateInnocenceScore(results);
    const priority = getPriorityFromScore(innocenceScore);
    
    console.log(`Calculated innocence score: ${innocenceScore}, setting priority: ${priority}`);

    // Update analysis with results and priority
    const { error: updateError } = await supabase
      .from('analyses')
      .update({
        status: 'completed',
        results: results,
        priority: priority
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
    
    // Determine proper HTTP status for the client
    let statusCode = 500;
    const message = error instanceof Error ? error.message : 'Unknown error';
    const lower = typeof message === 'string' ? message.toLowerCase() : '';
    if (lower.includes('rate limit')) statusCode = 429;
    else if (lower.includes('credit') || lower.includes('payment')) statusCode = 402;
    
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
            error_message: message
          })
          .eq('id', analysisId);
      } catch (updateError) {
        console.error('Failed to update analysis status:', updateError);
      }
    }

    return new Response(
      JSON.stringify({ error: message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: statusCode,
      }
    );
  }
});
