import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Download S3 file request received');
    const { fileName } = await req.json();
    
    if (!fileName) {
      return new Response(JSON.stringify({ error: 'fileName is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Requested file:', fileName);

    // fileName이 전체 URL인 경우 경로만 추출
    let filePath = fileName;
    if (fileName.startsWith('https://')) {
      const url = new URL(fileName);
      filePath = url.pathname.substring(1); // Remove leading slash
      console.log('Extracted file path:', filePath);
    }

    // 인증 및 권한 확인
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
        auth: { autoRefreshToken: false, persistSession: false },
      }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 관리자 여부 확인 (자기 자신의 admin_users 레코드만 조회 가능)
    const { data: adminRow, error: adminCheckError } = await supabaseClient
      .from('admin_users')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (adminCheckError) {
      console.error('Admin check error:', adminCheckError);
    }

    let authorized = !!adminRow;

    // 관리자가 아니라면, 본인 소유의 교사 인증 파일만 허용
    if (!authorized) {
      const { data: ownTeacherInfo, error: tiError } = await supabaseClient
        .from('teacher_info')
        .select('teacher_info_id')
        .eq('teacher_verification_file_path', filePath)
        .maybeSingle();

      if (tiError) {
        console.error('Teacher info ownership check error:', tiError);
      }

      authorized = !!ownTeacherInfo;
    }

    if (!authorized) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const AWS_ACCESS_KEY_ID = Deno.env.get('AWS_ACCESS_KEY_ID');
    const AWS_SECRET_ACCESS_KEY = Deno.env.get('AWS_SECRET_ACCESS_KEY');
    const AWS_REGION = Deno.env.get('AWS_REGION') || 'ap-northeast-2';
    const AWS_S3_BUCKET_NAME = Deno.env.get('AWS_S3_BUCKET_NAME');

    if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY || !AWS_S3_BUCKET_NAME) {
      console.error('Missing AWS credentials');
      return new Response(JSON.stringify({ error: 'AWS credentials not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // presigned URL 생성을 위한 간단한 방법
    const encoder = new TextEncoder();
    const now = new Date();
    const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, '');
    const amzDate = now.toISOString().replace(/[:\-]|\.\d{3}/g, '');
    
    // Expiration time (1 hour from now)
    const expiration = new Date(now.getTime() + 3600000);
    const expirationEpoch = Math.floor(expiration.getTime() / 1000);

    const host = `${AWS_S3_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com`;
    const uri = `/${filePath}`;
    
    // 간단한 GET 요청으로 시도
    const method = 'GET';
    const canonicalHeaders = `host:${host}\nx-amz-date:${amzDate}\n`;
    const signedHeaders = 'host;x-amz-date';
    const payloadHash = 'UNSIGNED-PAYLOAD';
    
    const canonicalRequest = `${method}\n${uri}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
    
    // SHA256 해시 생성
    const canonicalRequestHash = await crypto.subtle.digest('SHA-256', encoder.encode(canonicalRequest));
    const canonicalRequestHashHex = Array.from(new Uint8Array(canonicalRequestHash))
      .map(b => b.toString(16).padStart(2, '0')).join('');
    
    // String to sign
    const algorithm = 'AWS4-HMAC-SHA256';
    const credentialScope = `${dateStamp}/${AWS_REGION}/s3/aws4_request`;
    const stringToSign = `${algorithm}\n${amzDate}\n${credentialScope}\n${canonicalRequestHashHex}`;
    
    // HMAC 키 생성
    const getSignatureKey = async (key: string, dateStamp: string, regionName: string, serviceName: string) => {
      const kDate = await crypto.subtle.importKey(
        'raw', 
        encoder.encode(`AWS4${key}`), 
        { name: 'HMAC', hash: 'SHA-256' }, 
        false, 
        ['sign']
      );
      const kDateResult = await crypto.subtle.sign('HMAC', kDate, encoder.encode(dateStamp));
      
      const kRegion = await crypto.subtle.importKey(
        'raw', 
        new Uint8Array(kDateResult), 
        { name: 'HMAC', hash: 'SHA-256' }, 
        false, 
        ['sign']
      );
      const kRegionResult = await crypto.subtle.sign('HMAC', kRegion, encoder.encode(regionName));
      
      const kService = await crypto.subtle.importKey(
        'raw', 
        new Uint8Array(kRegionResult), 
        { name: 'HMAC', hash: 'SHA-256' }, 
        false, 
        ['sign']
      );
      const kServiceResult = await crypto.subtle.sign('HMAC', kService, encoder.encode(serviceName));
      
      const kSigning = await crypto.subtle.importKey(
        'raw', 
        new Uint8Array(kServiceResult), 
        { name: 'HMAC', hash: 'SHA-256' }, 
        false, 
        ['sign']
      );
      const kSigningResult = await crypto.subtle.sign('HMAC', kSigning, encoder.encode('aws4_request'));
      
      return await crypto.subtle.importKey(
        'raw', 
        new Uint8Array(kSigningResult), 
        { name: 'HMAC', hash: 'SHA-256' }, 
        false, 
        ['sign']
      );
    };
    
    const signingKey = await getSignatureKey(AWS_SECRET_ACCESS_KEY, dateStamp, AWS_REGION, 's3');
    const signatureBytes = await crypto.subtle.sign('HMAC', signingKey, encoder.encode(stringToSign));
    const signature = Array.from(new Uint8Array(signatureBytes))
      .map(b => b.toString(16).padStart(2, '0')).join('');
    
    // Authorization header
    const authorizationHeader = `${algorithm} Credential=${AWS_ACCESS_KEY_ID}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
    
    console.log('Making S3 request to:', `https://${host}${uri}`);
    
    // S3 요청
    const s3Response = await fetch(`https://${host}${uri}`, {
      method: 'GET',
      headers: {
        'Authorization': authorizationHeader,
        'x-amz-date': amzDate,
        'x-amz-content-sha256': payloadHash,
      },
    });

    if (!s3Response.ok) {
      const errorText = await s3Response.text();
      console.error('S3 error:', errorText);
      return new Response(JSON.stringify({ error: 'File not found or access denied', details: errorText }), {
        status: s3Response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('S3 response successful');
    
    // 파일 내용과 메타데이터 가져오기 - stream을 사용하여 안전하게 처리
    const contentType = s3Response.headers.get('Content-Type') || 'application/octet-stream';
    const contentLength = s3Response.headers.get('Content-Length');
    
    // 파일 이름에서 확장자 추출
    const fileExtension = filePath.split('.').pop()?.toLowerCase();
    const finalContentType = fileExtension ? 
      (fileExtension === 'png' ? 'image/png' :
       fileExtension === 'jpg' || fileExtension === 'jpeg' ? 'image/jpeg' :
       fileExtension === 'gif' ? 'image/gif' :
       fileExtension === 'pdf' ? 'application/pdf' :
       fileExtension === 'doc' ? 'application/msword' :
       fileExtension === 'docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' :
       contentType) : contentType;

    console.log(`Successfully downloaded file: ${fileName}, size: ${contentLength}, type: ${finalContentType}`);

    // 파일명 추출 (URL 디코딩 포함)
    const filename = decodeURIComponent(filePath.split('/').pop() || 'download');

    // S3 response를 그대로 반환하여 스트리밍 처리
    return new Response(s3Response.body, {
      headers: {
        ...corsHeaders,
        'Content-Type': finalContentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': contentLength || '',
        'Cache-Control': 'no-cache',
      },
    });

  } catch (error) {
    console.error('Error in download-s3-file function:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});