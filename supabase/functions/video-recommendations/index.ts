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
    const { generation_response_id } = await req.json();

    if (!generation_response_id) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'generation_response_id is required' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Forwarding video recommendation request for generation_response_id:', generation_response_id);

    // Get backend configuration
    const backendUrl = Deno.env.get('BACKEND_URL');
    const backendToken = Deno.env.get('BACKEND_JWT_TOKEN');

    if (!backendUrl || !backendToken) {
      throw new Error('Backend configuration is missing');
    }

    // Forward request to backend
    const response = await fetch(`${backendUrl}/recommendation/video_recommendation`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${backendToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ generation_response_id }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Backend request failed:', response.status, errorText);
      throw new Error(`Backend request failed: ${response.status}`);
    }

    const data = await response.json();
    console.log('Successfully received video recommendations from backend');

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in video-recommendations function:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Internal server error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});