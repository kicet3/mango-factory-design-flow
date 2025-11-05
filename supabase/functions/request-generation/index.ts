import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { generation_attrs_id, raw_course_material_id, user_id } = await req.json();

    console.log('Requesting generation for:', { generation_attrs_id, raw_course_material_id, user_id });

    // Get JWT token from Supabase secrets
    const jwtToken = Deno.env.get('BACKEND_JWT_TOKEN');
    if (!jwtToken) {
      throw new Error('BACKEND_JWT_TOKEN is not configured');
    }

    // Get backend URL from Supabase secrets  
    const backendBaseUrl = Deno.env.get('BACKEND_URL');
    if (!backendBaseUrl) {
      throw new Error('BACKEND_URL is not configured');
    }
    
    // Normalize to avoid double slashes when joining
    const baseUrl = backendBaseUrl.trim().replace(/\/+$/, '');
    const backendUrl = `${baseUrl}/generation/generation_request`;
    console.log('Requesting backend URL:', backendUrl);
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`,
      },
      body: JSON.stringify({
        generation_attrs_id,
        raw_course_material_id,
        user_id
      }),
    });

    if (!response.ok) {
      throw new Error(`Backend request failed (${backendUrl}): ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Backend response:', data);

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in request-generation function:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Internal server error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});