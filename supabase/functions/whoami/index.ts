import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Parse request body
    const body = await req.json().catch(() => ({}))
    const { name } = body

    // Get user from Authorization header if present
    const authHeader = req.headers.get('authorization')
    let user = null
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token)
      
      if (!authError && authUser) {
        user = authUser
      }
    }

    // Prepare response data
    const responseData = {
      message: name ? `안녕하세요, ${name}님!` : '안녕하세요!',
      timestamp: new Date().toISOString(),
      userInfo: user ? {
        id: user.id,
        email: user.email,
        created_at: user.created_at
      } : null,
      isAuthenticated: !!user
    }

    return new Response(
      JSON.stringify(responseData),
      {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
      },
    )
  } catch (error) {
    console.error('Error in whoami function:', error)
    
    return new Response(
      JSON.stringify({ 
        error: '서버 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
      },
    )
  }
})