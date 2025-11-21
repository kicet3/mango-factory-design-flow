import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';


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
    const { 
      format_selection_attrs_id,
      selected_format_ids,
      class_mate_info,
      course_type_id,
      course_material_scope,
      difficulty_id,
      expected_duration_min,
      generation_additional_message,
      selected_teaching_style_ids,
      selected_cowork_type_ids,
      user_id,
      use_v2 
    } = await req.json();

    console.log('Requesting multiple generations for:', { 
      format_selection_attrs_id, 
      selected_format_ids, 
      user_id 
    });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

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
    
    const baseUrl = backendBaseUrl.trim().replace(/\/+$/, '');
    const backendUrl = `${baseUrl}/generation/generation_request`;

    const generationAttrsIds: number[] = [];
    const errors: string[] = [];

    // Create generation request for each selected format
    for (const formatId of selected_format_ids) {
      try {
        // 1. Create generation_attrs for this format
        const generationAttrsData = {
          class_mate_info,
          course_type_id,
          course_material_scope,
          raw_generation_format_id: formatId,
          difficulty_id,
          expected_duration_min,
          user_id,
          generation_additional_message,
          use_v2: use_v2 || false
        };

        const { data: generationAttrs, error: attrsError } = await supabase
          .from('generation_attrs')
          .insert([generationAttrsData])
          .select()
          .single();

        if (attrsError) throw attrsError;

        // 2. Sync association tables
        if (selected_teaching_style_ids?.length > 0) {
          const { error: syncTsError } = await supabase.rpc('sync_association_table', {
            p_table_name: 'generation_attrs_teaching_style_map',
            p_parent_column: 'generation_attrs_id',
            p_child_column: 'teaching_style_id',
            p_parent_id: generationAttrs.generation_attrs_id,
            p_child_ids: selected_teaching_style_ids,
          });
          if (syncTsError) throw syncTsError;
        }

        if (selected_cowork_type_ids?.length > 0) {
          const { error: syncCwError } = await supabase.rpc('sync_association_table', {
            p_table_name: 'generation_attrs_cowork_type_map',
            p_parent_column: 'generation_attrs_id',
            p_child_column: 'cowork_type_id',
            p_parent_id: generationAttrs.generation_attrs_id,
            p_child_ids: selected_cowork_type_ids,
          });
          if (syncCwError) throw syncCwError;
        }

        // 3. Create generation_request
        const generationRequestData = {
          generation_attrs_id: generationAttrs.generation_attrs_id,
          user_id
        };

        const { data: generationRequest, error: requestError } = await supabase
          .from('generation_requests')
          .insert([generationRequestData])
          .select()
          .single();

        if (requestError) throw requestError;

        // Add generation_attrs_id to successful list
        generationAttrsIds.push(generationAttrs.generation_attrs_id);

        // 4. Call backend API asynchronously (fire-and-forget)
        console.log(`Requesting backend for format ${formatId}:`, backendUrl);
        EdgeRuntime.waitUntil(
          fetch(backendUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${jwtToken}`,
            },
            body: JSON.stringify({
              generation_attrs_id: generationAttrs.generation_attrs_id,
              user_id
            }),
          }).then(response => {
            if (!response.ok) {
              console.error(`Backend request failed for format ${formatId}:`, response.status, response.statusText);
            } else {
              console.log(`Backend request successful for format ${formatId}`);
            }
          }).catch(error => {
            console.error(`Error calling backend for format ${formatId}:`, error);
          })
        );

      } catch (error) {
        console.error(`Error processing format ${formatId}:`, error);
        errors.push(`Failed to process format ${formatId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Return results immediately with generation_attrs_ids
    const success = generationAttrsIds.length > 0;
    const response = {
      success,
      generation_attrs_ids: generationAttrsIds,
      errors: errors.length > 0 ? errors : undefined,
      total_requested: selected_format_ids.length,
      total_successful: generationAttrsIds.length
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in request-multiple-generation function:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Internal server error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});