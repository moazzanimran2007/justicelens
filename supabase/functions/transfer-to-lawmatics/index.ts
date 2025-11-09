import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const lawmaticsApiKey = Deno.env.get('LAWMATICS_API_KEY');
    const lawmaticsApiUrl = Deno.env.get('LAWMATICS_API_URL');

    if (!lawmaticsApiKey || !lawmaticsApiUrl) {
      console.error('Missing Lawmatics credentials');
      throw new Error('Lawmatics integration is not configured. Please configure API credentials.');
    }

    const { caseId, matterId, caseData } = await req.json();

    if (!matterId) {
      throw new Error('Matter ID is required');
    }

    console.log(`Transferring case ${caseId} to Lawmatics matter ${matterId}`);

    // Prepare the data to send to Lawmatics
    const lawmaticsData = {
      matter_id: matterId,
      case_details: {
        client_name: caseData.client_name,
        case_number: caseData.case_number,
        file_name: caseData.file_name,
        status: caseData.status,
        priority: caseData.priority,
      },
      analysis_results: caseData.results,
      timestamp: new Date().toISOString(),
    };

    // Make the API call to Lawmatics
    const response = await fetch(`${lawmaticsApiUrl}/matters/${matterId}/notes`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lawmaticsApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        note: JSON.stringify(lawmaticsData, null, 2),
        note_type: 'Case Transfer',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lawmatics API error:', errorText);
      throw new Error(`Lawmatics API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    console.log('Successfully transferred case to Lawmatics:', result);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Case transferred successfully',
        lawmatics_response: result 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in transfer-to-lawmatics function:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
