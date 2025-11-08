import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import * as pdfjsLib from 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/+esm';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs';

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
  let filePath: string | undefined;
  
  try {
    const body = await req.json();
    analysisId = body.analysisId;
    transcriptText = body.transcriptText;
    modules = body.modules;
    filePath = body.filePath;
    
    console.log('Starting analysis for ID:', analysisId);
    console.log('Selected modules:', modules);
    console.log('File path:', filePath);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // If file path is provided and it's a PDF, extract text
    if (filePath && filePath.toLowerCase().endsWith('.pdf')) {
      console.log('Detected PDF file, extracting text...');
      try {
        // Download PDF from storage
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('transcripts')
          .download(filePath);
        
        if (downloadError) throw downloadError;
        
        // Convert blob to array buffer
        const arrayBuffer = await fileData.arrayBuffer();
        
        // Extract text from PDF using pdfjs
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdfDoc = await loadingTask.promise;
        
        let extractedText = '';
        const numPages = pdfDoc.numPages;
        console.log(`Extracting text from ${numPages} pages...`);
        
        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
          const page = await pdfDoc.getPage(pageNum);
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .map((item: any) => item.str)
            .join(' ');
          extractedText += pageText + '\n\n';
        }
        
        transcriptText = extractedText.trim();
        console.log(`Successfully extracted ${transcriptText.length} characters from PDF`);
        
        if (!transcriptText || transcriptText.length < 100) {
          throw new Error('PDF appears to be empty or contains only images. OCR not yet implemented.');
        }
      } catch (pdfError) {
        console.error('PDF extraction error:', pdfError);
        const errorMessage = pdfError instanceof Error ? pdfError.message : 'Unknown error';
        throw new Error(`Failed to extract text from PDF: ${errorMessage}`);
      }
    }

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
      const innocencePrompt = `Analyze the following parole hearing transcript and identify ALL explicit or implicit innocence claims.`;

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
              description: "Analyze transcript for innocence claims",
              parameters: {
                type: "object",
                properties: {
                  detected: { type: "boolean", description: "Whether innocence claims were found" },
                  count: { type: "number", description: "Number of innocence claims detected" },
                  examples: { 
                    type: "array", 
                    items: { type: "string" },
                    description: "Direct quotes of innocence claims from the transcript"
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
      const biasPrompt = `Analyze the parole hearing transcript for bias and fairness issues including victim-centric framing, demeanor comments, stigmatizing language, and focus on unchangeable past.`;

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
              description: "Analyze transcript for bias and fairness issues",
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
                        examples: { type: "array", items: { type: "string" } }
                      },
                      required: ["type", "count", "severity", "examples"]
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
      } else {
        throw new Error("AI did not return structured bias analysis");
      }
    }

    // Advocate Fact Sheet
    if (modules.includes('summary')) {
      console.log('Generating advocate fact sheet...');
      const summaryPrompt = `Generate a concise advocate fact sheet extracting offense context, years served, programming, parole factors, and evidence.`;

      const summaryResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: 'You are a legal advocate assistant. You MUST use the provided function to return structured data.' },
            { role: 'user', content: `${summaryPrompt}\n\nTranscript:\n${transcriptText.substring(0, 50000)}` }
          ],
          tools: [{
            type: "function",
            function: {
              name: "generate_fact_sheet",
              description: "Generate advocate fact sheet from transcript",
              parameters: {
                type: "object",
                properties: {
                  offenseContext: { type: "string" },
                  yearsServed: { type: "number" },
                  programming: { type: "string" },
                  paroleFactors: { type: "string" },
                  supportingEvidence: { type: "array", items: { type: "string" } },
                  concerns: { type: "array", items: { type: "string" } }
                },
                required: ["offenseContext", "yearsServed", "programming", "paroleFactors", "supportingEvidence", "concerns"]
              }
            }
          }],
          tool_choice: { type: "function", function: { name: "generate_fact_sheet" } }
        }),
      });

      if (!summaryResponse.ok) {
        throw new Error(`AI request failed: ${summaryResponse.status}`);
      }

      const summaryData = await summaryResponse.json();
      const toolCall = summaryData.choices[0].message.tool_calls?.[0];
      
      if (toolCall?.function?.arguments) {
        results.summary = JSON.parse(toolCall.function.arguments);
      } else {
        throw new Error("AI did not return structured summary");
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
