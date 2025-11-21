import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'https://d982f9f4-4373-442d-b168-d0b5e763eaa6.lovableproject.com',
  'https://d982f9f4-4373-442d-b168-d0b5e763eaa6.sandbox.lovable.dev',
  'https://mango-factory-deploy-web.lovable.app',
  'https://mangofactory.co.kr',
  'https://www.mangofactory.co.kr',
  'https://mango-factory-design-flow.vercel.app',
  'https://mango-factory-design-flow-git-main-twoweeks-projects.vercel.app',
  'https://mango-factory-design-flow-git-dev-twoweeks-projects.vercel.app',
  'https://mango-factory-design-flow-git-staging-twoweeks-projects.vercel.app',
  'https://mango-factory-design-flow-git-main-edeal-projects.vercel.app',
  'https://mango-factory-design-flow-git-dev-edeal-projects.vercel.app',
  'https://mango-factory-design-flow-git-staging-edeal-projects.vercel.app'
];

interface S3UploadResponse {
  success: boolean;
  url?: string;
  error?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const origin = req.headers.get('Origin') || '';
  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    return new Response(
      JSON.stringify({ success: false, error: 'Origin not allowed' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Verify authentication
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized - Please login first' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check if user's email is confirmed
    if (!user.email_confirmed_at) {
      return new Response(
        JSON.stringify({ success: false, error: 'Email verification required' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    // Get AWS credentials from environment
    const accessKeyId = Deno.env.get('AWS_ACCESS_KEY_ID');
    const secretAccessKey = Deno.env.get('AWS_SECRET_ACCESS_KEY');
    const region = Deno.env.get('AWS_REGION');
    const bucketName = Deno.env.get('AWS_S3_BUCKET_NAME');

    if (!accessKeyId || !secretAccessKey || !region || !bucketName) {
      throw new Error('Missing AWS credentials');
    }

    // Parse form data
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const folder = formData.get('folder') as string || 'uploads';

    if (!file) {
      throw new Error('No file provided');
    }

    // Basic input validation
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    const folderSafe = typeof folder === 'string'
      && /^[a-zA-Z0-9/_-]{1,100}$/.test(folder)
      && !folder.includes('..')
      && !folder.startsWith('/');

    if (!folderSafe) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid folder name' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (typeof file.size === 'number' && file.size > MAX_SIZE) {
      return new Response(JSON.stringify({ success: false, error: 'File too large (max 10MB)' }), {
        status: 413,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    // Validate file type and generate safe filename
    const allowedTypes = [
      'image/jpeg','image/png','image/webp','application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/x-hwp',
      'application/haansofthwp',
      'application/vnd.hancom.hwp',
      'application/vnd.hancom.hwpx'
    ];
    if (!allowedTypes.includes(file.type)) {
      return new Response(JSON.stringify({ success: false, error: 'Unsupported file type' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extMap: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'application/pdf': 'pdf',
      'application/msword': 'doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
      'application/vnd.ms-powerpoint': 'ppt',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
      'application/x-hwp': 'hwp',
      'application/haansofthwp': 'hwp',
      'application/vnd.hancom.hwp': 'hwp',
      'application/vnd.hancom.hwpx': 'hwpx',
    };
    const fileExtension = extMap[file.type];
    const safeFolder = folder.replace(/^\/+|\/+$/g, '');
    const fileName = `${safeFolder}/${timestamp}_${randomString}.${fileExtension}`;

    // Read file content
    const fileContent = await file.arrayBuffer();

    // Create date for AWS signature
    const now = new Date();
    const dateString = now.toISOString().substring(0, 10).replace(/-/g, '');
    const timeString = now.toISOString().replace(/[:\-]|\.\d{3}/g, '');

    // Create AWS signature
    const algorithm = 'AWS4-HMAC-SHA256';
    const credentialScope = `${dateString}/${region}/s3/aws4_request`;
    const credential = `${accessKeyId}/${credentialScope}`;

    // Create canonical request
    const host = `${bucketName}.s3.${region}.amazonaws.com`;
    const canonicalHeaders = `host:${host}\nx-amz-content-sha256:UNSIGNED-PAYLOAD\nx-amz-date:${timeString}\n`;
    const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
    const canonicalRequest = `PUT\n/${fileName}\n\n${canonicalHeaders}\n${signedHeaders}\nUNSIGNED-PAYLOAD`;

    // Create string to sign
    const hashedCanonicalRequest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonicalRequest));
    const hashedCanonicalRequestHex = Array.from(new Uint8Array(hashedCanonicalRequest))
      .map(b => b.toString(16).padStart(2, '0')).join('');
    
    const stringToSign = `${algorithm}\n${timeString}\n${credentialScope}\n${hashedCanonicalRequestHex}`;

    // Create signing key
    const kDate = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(`AWS4${secretAccessKey}`),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const kDateSigned = await crypto.subtle.sign('HMAC', kDate, new TextEncoder().encode(dateString));
    
    const kRegion = await crypto.subtle.importKey(
      'raw',
      kDateSigned,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const kRegionSigned = await crypto.subtle.sign('HMAC', kRegion, new TextEncoder().encode(region));
    
    const kService = await crypto.subtle.importKey(
      'raw',
      kRegionSigned,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const kServiceSigned = await crypto.subtle.sign('HMAC', kService, new TextEncoder().encode('s3'));
    
    const kSigning = await crypto.subtle.importKey(
      'raw',
      kServiceSigned,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const kSigningSigned = await crypto.subtle.sign('HMAC', kSigning, new TextEncoder().encode('aws4_request'));
    
    const signature = await crypto.subtle.sign('HMAC', await crypto.subtle.importKey(
      'raw',
      kSigningSigned,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    ), new TextEncoder().encode(stringToSign));
    
    const signatureHex = Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0')).join('');

    // Upload to S3
    const url = `https://${host}/${fileName}`;
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `${algorithm} Credential=${credential}, SignedHeaders=${signedHeaders}, Signature=${signatureHex}`,
        'x-amz-content-sha256': 'UNSIGNED-PAYLOAD',
        'x-amz-date': timeString,
        'Content-Type': file.type,
      },
      body: fileContent,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('S3 upload failed:', response.status, errorText);
      throw new Error(`S3 upload failed: ${response.status}`);
    }

    const result: S3UploadResponse = {
      success: true,
      url: url,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Upload error:', error);
    
    const result: S3UploadResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});