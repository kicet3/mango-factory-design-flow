import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const { response_id } = await req.json();

    console.log('Regenerating for response_id:', response_id);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get JWT token from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header required');
    }
    const token = authHeader.replace('Bearer ', '');
    
    // Set auth for user context
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      throw new Error('Invalid authentication');
    }

    // Get the source generation response and its root
    const { data: sourceResponse, error: sourceError } = await supabase
      .from('generation_responses')
      .select(`
        *,
        generation_attrs!inner(*)
      `)
      .eq('generation_response_id', response_id)
      .eq('generation_attrs.user_id', user.id)
      .single();

    if (sourceError || !sourceResponse) {
      throw new Error('Generation response not found or access denied');
    }

    const rootResponseId = sourceResponse.root_response_id;

    // Check current max version for this root
    const { data: versions, error: versionError } = await supabase
      .from('generation_responses')
      .select('version_no')
      .eq('root_response_id', rootResponseId)
      .order('version_no', { ascending: false })
      .limit(1);

    if (versionError) {
      throw new Error('Failed to check version count');
    }

    const maxVersion = versions?.[0]?.version_no || 1;
    if (maxVersion >= 4) {
      throw new Error('Maximum regeneration limit (3 retries) reached');
    }

    const newVersionNo = maxVersion + 1;

    // Use existing generation_attrs (no need to copy)
    const originalAttrs = sourceResponse.generation_attrs;

    // Create new generation response with version info
    const paramsSnapshot = {
      generation_attrs_id: originalAttrs.generation_attrs_id,
      course_type_id: originalAttrs.course_type_id,
      difficulty_id: originalAttrs.difficulty_id,
      expected_duration_min: originalAttrs.expected_duration_min,
      class_mate_info: originalAttrs.class_mate_info,
      course_material_id: originalAttrs.course_material_id,
      course_material_scope: originalAttrs.course_material_scope,
      raw_generation_format_id: originalAttrs.raw_generation_format_id,
      generation_additional_message: originalAttrs.generation_additional_message,
    };

    const { data: newResponse, error: responseError } = await supabase
      .from('generation_responses')
      .insert({
        generation_attrs_id: originalAttrs.generation_attrs_id, // Use existing generation_attrs_id
        user_id: user.id,
        root_response_id: rootResponseId,
        version_no: newVersionNo,
        params_snapshot: paramsSnapshot,
        generation_status_type_id: 1, // Processing
        generation_name: `${sourceResponse.generation_name} V${newVersionNo}`
      })
      .select()
      .single();

    if (responseError || !newResponse) {
      throw new Error('Failed to create new generation response');
    }

    // Call the generation backend
    const jwtToken = Deno.env.get('BACKEND_JWT_TOKEN');
    const backendBaseUrl = Deno.env.get('BACKEND_URL');
    
    if (!jwtToken || !backendBaseUrl) {
      throw new Error('Backend configuration missing');
    }

    const baseUrl = backendBaseUrl.trim().replace(/\/+$/, '');
    const backendUrl = `${baseUrl}/generation/generation_request`;
    
    console.log('Calling backend URL:', backendUrl);
    console.log('Backend payload:', {
      generation_attrs_id: originalAttrs.generation_attrs_id, // Use existing generation_attrs_id
      generation_response_id: newResponse.generation_response_id, // Use newly created response id
      raw_course_material_id: originalAttrs.course_material_id,
      user_id: user.id
    });
    
    const backendResponse = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`,
      },
      body: JSON.stringify({
        generation_attrs_id: originalAttrs.generation_attrs_id, // Use existing generation_attrs_id
        generation_response_id: newResponse.generation_response_id, // Use newly created response id
        raw_course_material_id: originalAttrs.course_material_id,
        user_id: user.id
      }),
    });

    console.log('Backend response status:', backendResponse.status);
    
    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error('Backend error response:', errorText);
      throw new Error(`Backend request failed: ${backendResponse.status} - ${errorText}`);
    }

    const backendData = await backendResponse.json();
    console.log('Backend response:', backendData);

    return new Response(JSON.stringify({
      success: true,
      data: {
        new_response_id: newResponse.generation_response_id,
        root_response_id: rootResponseId,
        version_no: newVersionNo,
        remaining_retries: 4 - newVersionNo
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in regenerate-generation function:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Internal server error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});