import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { memoData } = await req.json();

    if (!memoData) {
      throw new Error('Memo data is required');
    }

    // Use Lovable AI to format the legal memo professionally
    const { data: aiData, error: aiError } = await supabaseClient.functions.invoke('ai', {
      body: {
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a legal document formatting assistant. Format the provided legal memo data into a professional, well-organized HTML document suitable for printing as a PDF. Use proper legal memo formatting standards with clear sections, proper headings, and professional typography. Return ONLY the HTML body content (no <html>, <head>, or <body> tags), ready to be inserted into a document.`
          },
          {
            role: 'user',
            content: `Format this legal memo data into a professional document:

${JSON.stringify(memoData, null, 2)}

Requirements:
1. Use proper legal memo structure
2. Include clear section headings with uppercase titles
3. Format dates, names, and case numbers professionally
4. Present lists in a clear, readable format
5. Include all available information from the data
6. Use proper legal terminology
7. Organize information logically
8. Return clean HTML with proper semantic tags (h1, h2, h3, p, ul, ol, strong, em)
9. Do not include any wrapper tags like <html>, <head>, or <body>`
          }
        ],
        temperature: 0.3,
        max_tokens: 4000
      }
    });

    if (aiError) {
      console.error('AI formatting error:', aiError);
      throw new Error(`AI formatting failed: ${aiError.message}`);
    }

    const formattedContent = aiData.choices[0].message.content;

    return new Response(
      JSON.stringify({ formattedContent }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
