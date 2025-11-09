// Format Legal Memo with Lovable AI Gateway
// Uses LOVABLE_API_KEY secret; do not expose on client.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { memoData } = await req.json();
    if (!memoData) {
      return new Response(JSON.stringify({ error: 'memoData is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const API_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';
    const API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(JSON.stringify({ error: 'AI gateway not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const systemPrompt = `You are a legal document formatting assistant. Format the provided legal memo data into a professional, well-organized HTML fragment suitable for printing as a PDF. Use proper legal memo formatting with clear sections, headings, and professional typography. Return ONLY the HTML body content (no <html>, <head>, or <body> tags). Use semantic tags (h1, h2, h3, p, ul, ol, strong, em, table) and ensure clean, printable structure. Do not invent facts.`;

    const userPrompt = `Format this legal memo into a professional, printable document. Organize by major sections (Client Information; Introduction; Conviction & Sentence Summary; Superior Court Case; Appellate Court Information; Post-Conviction Issues; Case Presentations; People Mentioned; Wrongful Conviction Issues). Use uppercase section headings, concise paragraphs, and lists where appropriate. Include all provided data.

JSON Data:\n\n${JSON.stringify(memoData, null, 2)}`;

    const payload = {
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    };

    const aiResp = await fetch(API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!aiResp.ok) {
      const text = await aiResp.text();
      console.error('AI gateway error:', aiResp.status, text);
      const status = aiResp.status;
      if (status === 402 || status === 429) {
        return new Response(JSON.stringify({ error: text || 'AI limits reached' }), {
          status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: 'AI gateway error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiJson = await aiResp.json();
    const formattedContent: string | undefined = aiJson?.choices?.[0]?.message?.content;
    if (!formattedContent) {
      console.error('AI response missing content:', aiJson);
      return new Response(JSON.stringify({ error: 'AI returned no content' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ formattedContent }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('format-legal-memo error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
