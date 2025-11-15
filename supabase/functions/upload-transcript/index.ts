import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Verify user with anon client
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      console.error('Auth verification failed:', userError);
      return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Parse multipart/form-data
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const filePath = formData.get('filePath') as string;

    if (!file || !filePath) {
      return new Response(JSON.stringify({ error: 'Missing file or filePath' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Uploading file: ${file.name} (${file.size} bytes) to ${filePath}`);

    // Use service role client for storage operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Ensure bucket exists
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(b => b.id === 'transcripts');

    if (!bucketExists) {
      console.log('Creating transcripts bucket...');
      const { error: createError } = await supabase.storage.createBucket('transcripts', {
        public: false,
        fileSizeLimit: 52428800, // 50MB
      });
      if (createError) {
        console.error('Error creating bucket:', createError);
        throw createError;
      }
    }

    // Convert file to ArrayBuffer for upload
    const arrayBuffer = await file.arrayBuffer();

    // Upload file
    const { error: uploadError } = await supabase.storage
      .from('transcripts')
      .upload(filePath, arrayBuffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }

    console.log(`Successfully uploaded ${file.name}`);

    return new Response(
      JSON.stringify({ success: true, filePath }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in upload-transcript function:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
