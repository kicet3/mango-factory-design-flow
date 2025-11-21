import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

const isAllowedOrigin = (origin: string) => {
  if (!origin) return true;
  try {
    const url = new URL(origin);
    const host = url.host;
    return origin === 'http://localhost:5173'
      || origin === 'http://localhost:3000'
      || host === 'mango.co.kr'
      || host === 'www.mango.co.kr'
      || host.endsWith('.mango.co.kr')
      || host === 'mangofactory.co.kr'
      || host === 'www.mangofactory.co.kr'
      || host.endsWith('.mangofactory.co.kr')
      || host.endsWith('.lovableproject.com')
      || host.endsWith('.sandbox.lovable.dev')
      || host.endsWith('.lovable.app')
      || host.endsWith('.vercel.app');
  } catch {
    return false;
  }
};

serve(async (req) => {
  console.log('Secure download request received');
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const origin = req.headers.get('Origin') || '';
  if (origin && !isAllowedOrigin(origin)) {
    return new Response(
      JSON.stringify({ success: false, error: 'Origin not allowed' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Parse request body first to check file type
    const { filePath, fileType, generationId } = await req.json();
    console.log('Requested file path:', filePath, 'type:', fileType, 'generationId:', generationId);

    // If generationId is provided, get file path from database
    let actualFilePath = filePath;
    let generationUserId: string | null = null;
    let generationCanShare = false;
    
    if (generationId) {
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const { data: generationData, error: generationError } = await supabaseAdmin
        .from('generation_responses')
        .select('output_path, can_share, user_id')
        .eq('generation_response_id', generationId)
        .single();

      if (generationError || !generationData || !generationData.output_path) {
        console.error('Generation not found:', generationError);
        return new Response(
          JSON.stringify({ success: false, error: 'Generation not found' }),
          { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      actualFilePath = generationData.output_path;
      generationUserId = generationData.user_id;
      generationCanShare = generationData.can_share === true;
      console.log('Using file path from database:', actualFilePath, 'userId:', generationUserId, 'canShare:', generationCanShare);
    }

    if (!actualFilePath) {
      return new Response(
        JSON.stringify({ success: false, error: 'File path is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const validPath = /^[a-zA-Z0-9/_\.-]{1,300}$/.test(actualFilePath) && !actualFilePath.includes('..') && !actualFilePath.startsWith('/') && !actualFilePath.endsWith('/');
    if (!validPath) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid file path' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check if this is a shared generation file (no auth required for shared files)
    let isSharedGeneration = false;
    if (fileType === 'generation') {
      if (generationId) {
        // Use data from above query
        isSharedGeneration = generationCanShare;
      } else {
        const supabaseAdmin = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );
        
        const { data: generationData } = await supabaseAdmin
          .from('generation_responses')
          .select('can_share')
          .eq('output_path', actualFilePath)
          .single();

        isSharedGeneration = generationData?.can_share === true;
      }
      
      console.log('Is shared generation:', isSharedGeneration);
    }

    // Verify authentication (skip only for shared generations)
    let user = null;
    if (!isSharedGeneration) {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        {
          global: {
            headers: { Authorization: req.headers.get('Authorization')! },
          },
        }
      );

      const { data: { user: authUser }, error: authError } = await supabaseClient.auth.getUser();
      
      if (authError || !authUser) {
        console.log('Authentication failed:', authError);
        return new Response(
          JSON.stringify({ success: false, error: 'Unauthorized' }),
          { 
            status: 401, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      user = authUser;
      console.log('Authenticated user ID:', user.id);
    } else {
      console.log('Skipping authentication for shared generation');
    }

    // Authorization check based on file type
    if (fileType === 'teacher-verification') {
      if (!user) {
        return new Response(
          JSON.stringify({ success: false, error: 'Authentication required' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        {
          global: {
            headers: { Authorization: req.headers.get('Authorization')! },
          },
        }
      );

      // Check if user is authorized to access this verification document
      const { data: teacherInfo, error: teacherError } = await supabaseClient
        .from('teacher_info')
        .select('user_id, teacher_verification_file_path')
        .eq('teacher_verification_file_path', filePath)
        .single();

      if (teacherError || !teacherInfo) {
        console.log('Teacher verification file not found or error:', teacherError);
        return new Response(
          JSON.stringify({ success: false, error: 'File not found or access denied' }),
          { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      // Check if user owns this file or is approved admin
      const { data: isApprovedAdmin } = await supabaseClient.rpc('is_approved_admin_user');
      
      if (teacherInfo.user_id !== user.id && !isApprovedAdmin) {
        console.log('Access denied - not owner or admin');
        return new Response(
          JSON.stringify({ success: false, error: 'Access denied' }),
          { 
            status: 403, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    } else if (fileType === 'personal-photo') {
      if (!user) {
        return new Response(
          JSON.stringify({ success: false, error: 'Authentication required' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        {
          global: {
            headers: { Authorization: req.headers.get('Authorization')! },
          },
        }
      );

      // Check if user is authorized to access this personal photo
      // Personal photos are stored in personal_photos/{user_id}/ format
      const pathMatch = filePath.match(/^personal_photos\/([^\/]+)\//);
      if (!pathMatch) {
        console.log('Invalid personal photo path format:', filePath);
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid file path format' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      
      const fileUserId = pathMatch[1];
      const { data: isApprovedAdmin } = await supabaseClient.rpc('is_approved_admin_user');
      
      if (fileUserId !== user.id && !isApprovedAdmin) {
        console.log('Access denied - not owner or admin for personal photo');
        return new Response(
          JSON.stringify({ success: false, error: 'Access denied' }),
          { 
            status: 403, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    } else if (filePath.startsWith('image_contents/')) {
      if (!user) {
        return new Response(
          JSON.stringify({ success: false, error: 'Authentication required' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        {
          global: {
            headers: { Authorization: req.headers.get('Authorization')! },
          },
        }
      );

      // For image_contents files, check admin access only
      console.log('Checking admin access for image_contents file:', filePath);
      const { data: isApprovedAdmin } = await supabaseClient.rpc('is_approved_admin_user');
      
      if (!isApprovedAdmin) {
        console.log('Access denied - admin access required for image_contents');
        return new Response(
          JSON.stringify({ success: false, error: 'Admin access required' }),
          { 
            status: 403, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      console.log('Admin access granted for user:', user.id);
    } else if (fileType === 'generation') {
      // Check if user is owner (from generationId lookup) or if it's shared
      const isOwner = generationUserId && user && generationUserId === user.id;
      
      if (isSharedGeneration) {
        console.log('Access granted - shared generation');
      } else if (isOwner) {
        console.log('Access granted - generation owner');
      } else {
        // For generation files, allow shared files or check ownership/admin access
        console.log('Checking generation_responses for file:', filePath);
        
        const supabaseAdmin = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );
        
        const { data: generationData, error: genError } = await supabaseAdmin
          .from('generation_responses')
          .select('user_id, can_share')
          .eq('output_path', actualFilePath)
          .single();

        console.log('Generation data query result:', generationData, 'error:', genError);

        if (genError || !generationData) {
          console.log('Generation file not found or error:', genError);
          return new Response(
            JSON.stringify({ success: false, error: 'File not found or access denied' }),
            { 
              status: 404, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

        // Allow access if file is publicly shared OR (user is authenticated AND (user owns the file OR user is admin))
        let hasAccess = generationData.can_share === true;
        
        if (!hasAccess && user) {
          const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            {
              global: {
                headers: { Authorization: req.headers.get('Authorization')! },
              },
            }
          );
          
          const { data: isApprovedAdmin } = await supabaseClient.rpc('is_approved_admin_user');
          hasAccess = generationData.user_id === user.id || isApprovedAdmin;
        }
        
        console.log('Access check - User ID:', user?.id, 'File owner ID:', generationData.user_id, 'Can share:', generationData.can_share, 'Has access:', hasAccess);
        
        if (!hasAccess) {
          console.log('Access denied - file not shared and not owner/admin');
          return new Response(
            JSON.stringify({ success: false, error: 'Access denied' }),
            { 
              status: 403, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

        console.log('Access granted for generation file');
      }
    }

    // Get AWS credentials from environment
    const accessKeyId = Deno.env.get('AWS_ACCESS_KEY_ID');
    const secretAccessKey = Deno.env.get('AWS_SECRET_ACCESS_KEY');
    const region = Deno.env.get('AWS_REGION');
    const bucketName = Deno.env.get('AWS_S3_BUCKET_NAME');

    if (!accessKeyId || !secretAccessKey || !region || !bucketName) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing AWS configuration' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Create presigned URL for download
    console.log('Creating presigned URL for:', actualFilePath);
    console.log('AWS Config - Region:', region, 'Bucket:', bucketName);
    
    let presignedUrl;
    try {
      presignedUrl = await createPresignedUrl(
        bucketName,
        actualFilePath,
        accessKeyId,
        secretAccessKey,
        region
      );
      console.log('Successfully generated presigned URL');
    } catch (urlError) {
      console.error('Error creating presigned URL:', urlError);
      throw new Error(`Failed to create presigned URL: ${urlError instanceof Error ? urlError.message : 'Unknown error'}`);
    }

    console.log('Generated secure presigned URL for user:', user?.id || 'anonymous');

    // Return the download URL to the client
    const filename = actualFilePath.split('/').pop() || 'download';
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        downloadUrl: presignedUrl,
        filename: filename
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Secure download error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}` 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function createPresignedUrl(
  bucketName: string, 
  objectKey: string, 
  accessKeyId: string, 
  secretAccessKey: string, 
  region: string,
  expirationSeconds: number = 300 // 5 minutes
): Promise<string> {
  try {
    console.log('createPresignedUrl - Starting for:', objectKey);
    const date = new Date();
    const dateString = date.toISOString().slice(0, 10).replace(/-/g, '');
    const timeString = date.toISOString().slice(0, 19).replace(/[-:]/g, '') + 'Z';
    console.log('createPresignedUrl - Date strings generated:', dateString, timeString);
  
  const credentialScope = `${dateString}/${region}/s3/aws4_request`;
  const host = `${bucketName}.s3.${region}.amazonaws.com`;
  
  // Query parameters for presigned URL
  const queryParams = new URLSearchParams({
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${accessKeyId}/${credentialScope}`,
    'X-Amz-Date': timeString,
    'X-Amz-Expires': expirationSeconds.toString(),
    'X-Amz-SignedHeaders': 'host',
  });

  // Create canonical request
  const canonicalRequest = [
    'GET',
    `/${objectKey}`,
    queryParams.toString(),
    `host:${host}`,
    '',
    'host',
    'UNSIGNED-PAYLOAD'
  ].join('\n');

  // Create string to sign
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    timeString,
    credentialScope,
    await sha256(canonicalRequest)
  ].join('\n');

    // Calculate signature
    console.log('createPresignedUrl - Calculating signature');
    const signature = await calculateSignature(secretAccessKey, dateString, region, stringToSign);
    console.log('createPresignedUrl - Signature calculated');
    
    // Add signature to query parameters
    queryParams.set('X-Amz-Signature', signature);
    
    const finalUrl = `https://${host}/${objectKey}?${queryParams.toString()}`;
    console.log('createPresignedUrl - URL generated successfully');
    return finalUrl;
  } catch (error) {
    console.error('createPresignedUrl - Error:', error);
    throw error;
  }
}

async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function hmacSha256(key: Uint8Array, message: string): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    new Uint8Array(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message));
  return new Uint8Array(signature);
}

async function calculateSignature(secretKey: string, date: string, region: string, stringToSign: string): Promise<string> {
  const kDate = await hmacSha256(new TextEncoder().encode(`AWS4${secretKey}`), date);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, 's3');
  const kSigning = await hmacSha256(kService, 'aws4_request');
  const signature = await hmacSha256(kSigning, stringToSign);
  
  return Array.from(signature).map(b => b.toString(16).padStart(2, '0')).join('');
}