import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

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

    console.log('Generating video recommendations for generation_response_id:', generation_response_id);

    // Get OpenAI API key
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    // Get generation response details for context
    const { data: generationResponse, error: genError } = await supabaseClient
      .from('generation_responses')
      .select(`
        generation_name,
        generation_result_messages,
        params_snapshot,
        generation_attrs!inner(
          course_type_id,
          difficulty_id,
          generation_additional_message
        )
      `)
      .eq('generation_response_id', generation_response_id)
      .single();

    if (genError) {
      console.error('Error fetching generation response:', genError);
      throw new Error('Failed to fetch generation response details');
    }

    // Create prompt for video recommendations
    const prompt = `다음 교육 자료에 대한 관련 학습 동영상 3개를 추천해주세요:

자료 이름: ${generationResponse.generation_name || '교육 자료'}
자료 내용: ${generationResponse.generation_result_messages || '내용 없음'}
추가 메시지: ${(generationResponse.generation_attrs as any)?.generation_additional_message || '없음'}

다음 JSON 형식으로 3개의 동영상을 추천해주세요:
{
  "videos": [
    {
      "video_name": "동영상 제목",
      "video_url": "https://youtube.com/watch?v=...",
      "video_desc": "간단한 설명 (100자 내외)"
    }
  ]
}

실제 존재하는 YouTube 동영상을 추천하되, 교육적 가치가 높은 내용으로 선별해주세요.`;

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: '당신은 교육 콘텐츠 전문가입니다. 주어진 교육 자료와 관련된 유용한 학습 동영상을 추천해주세요.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API request failed: ${response.status} ${response.statusText}`);
    }

    const aiData = await response.json();
    const aiResponse = aiData.choices[0].message.content;

    // Parse AI response
    let videoRecommendations;
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        videoRecommendations = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Invalid JSON format from AI response');
      }
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      throw new Error('Failed to parse video recommendations');
    }

    // Insert video recommendations into database
    const videoInserts = videoRecommendations.videos.map((video: any) => ({
      generation_response_id: generation_response_id,
      video_name: video.video_name,
      video_url: video.video_url,
      video_desc: video.video_desc
    }));

    const { data: insertedVideos, error: insertError } = await supabaseClient
      .from('video_recommendations')
      .insert(videoInserts)
      .select();

    if (insertError) {
      console.error('Error inserting video recommendations:', insertError);
      throw new Error('Failed to save video recommendations');
    }

    console.log('Successfully created video recommendations:', insertedVideos);

    return new Response(JSON.stringify({ 
      success: true, 
      message: `${insertedVideos?.length || 0}개의 동영상 추천이 생성되었습니다.`,
      videos: insertedVideos
    }), {
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