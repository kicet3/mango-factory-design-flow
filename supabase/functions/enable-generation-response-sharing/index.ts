import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// AWS S3 helper functions
async function sha256(message: string): Promise<ArrayBuffer> {
  const msgUint8 = new TextEncoder().encode(message)
  return await crypto.subtle.digest('SHA-256', msgUint8)
}

async function hmacSha256(key: Uint8Array, message: string): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    new Uint8Array(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message))
  return new Uint8Array(signature)
}

async function updateS3ObjectTag(bucketName: string, objectKey: string, enable: boolean) {
  const region = Deno.env.get('AWS_REGION') || 'ap-northeast-2'
  const accessKeyId = Deno.env.get('AWS_ACCESS_KEY_ID')
  const secretAccessKey = Deno.env.get('AWS_SECRET_ACCESS_KEY')

  if (!accessKeyId || !secretAccessKey) {
    throw new Error('AWS credentials not configured')
  }

  const date = new Date()
  const dateString = date.toISOString().slice(0, 10).replace(/-/g, '')
  const datetimeString = date.toISOString().replace(/[:\-]|\.\d{3}/g, '')
  
  const service = 's3'
  const host = `${bucketName}.s3.${region}.amazonaws.com`
  const canonicalUri = `/${objectKey}`
  
  // Create the tagging XML
  const taggingXml = enable 
    ? '<?xml version="1.0" encoding="UTF-8"?><Tagging><TagSet><Tag><Key>public</Key><Value>true</Value></Tag></TagSet></Tagging>'
    : '<?xml version="1.0" encoding="UTF-8"?><Tagging><TagSet></TagSet></Tagging>'
  
  const payloadHash = Array.from(new Uint8Array(await sha256(taggingXml)))
    .map(b => b.toString(16).padStart(2, '0')).join('')
  
  const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${datetimeString}\n`
  const signedHeaders = 'host;x-amz-content-sha256;x-amz-date'
  
  const canonicalRequest = `PUT\n${canonicalUri}\ntagging=\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`
  
  const credentialScope = `${dateString}/${region}/${service}/aws4_request`
  const stringToSign = `AWS4-HMAC-SHA256\n${datetimeString}\n${credentialScope}\n${Array.from(new Uint8Array(await sha256(canonicalRequest))).map(b => b.toString(16).padStart(2, '0')).join('')}`
  
  // Calculate signature
  const dateKey = await hmacSha256(new TextEncoder().encode(`AWS4${secretAccessKey}`), dateString)
  const dateRegionKey = await hmacSha256(dateKey, region)
  const dateRegionServiceKey = await hmacSha256(dateRegionKey, service)
  const signingKey = await hmacSha256(dateRegionServiceKey, 'aws4_request')
  const signature = await hmacSha256(signingKey, stringToSign)
  
  const authorizationHeader = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${Array.from(signature).map(b => b.toString(16).padStart(2, '0')).join('')}`
  
  const url = `https://${host}${canonicalUri}?tagging=`
  
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': authorizationHeader,
      'X-Amz-Date': datetimeString,
      'X-Amz-Content-Sha256': payloadHash,
      'Content-Type': 'application/xml',
    },
    body: taggingXml,
  })
  
  if (!response.ok) {
    console.error('S3 tagging failed:', await response.text())
    throw new Error(`Failed to update S3 object tags: ${response.status}`)
  }
  
  console.log(`S3 object tagging ${enable ? 'enabled' : 'disabled'} for ${objectKey}`)
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const bucketName = Deno.env.get('AWS_S3_BUCKET_NAME')!

    // Create supabase client with service role key for admin access
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
    
    // Get user from the request
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create client with user token for authentication
    const supabaseClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: {
        headers: { Authorization: authHeader },
      },
    })

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { generation_response_id, enable } = await req.json()
    
    if (!generation_response_id || typeof enable !== 'boolean') {
      return new Response(
        JSON.stringify({ error: 'Invalid parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user owns the generation response
    const { data: generationData, error: checkError } = await supabaseClient
      .from('generation_responses')
      .select('output_path, user_id')
      .eq('generation_response_id', generation_response_id)
      .single()

    if (checkError || !generationData) {
      return new Response(
        JSON.stringify({ error: 'Generation response not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (generationData.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update the can_share field in the database
    const { error: updateError } = await supabaseAdmin
      .from('generation_responses')
      .update({ can_share: enable })
      .eq('generation_response_id', generation_response_id)

    if (updateError) {
      console.error('Database update error:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to update sharing status' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update S3 object tags if output_path exists
    if (generationData.output_path) {
      try {
        // Extract the object key from the full path
        const objectKey = generationData.output_path.replace(/^https?:\/\/[^\/]+\//, '')
        await updateS3ObjectTag(bucketName, objectKey, enable)
      } catch (s3Error) {
        console.error('S3 tagging error:', s3Error)
        // Don't fail the request if S3 tagging fails, just log it
      }
    }

    console.log(`Sharing ${enable ? 'enabled' : 'disabled'} for generation ${generation_response_id}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: enable ? 'Sharing enabled successfully' : 'Sharing disabled successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in enable-generation-response-sharing:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})