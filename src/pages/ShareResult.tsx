import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SUPABASE_CONFIG } from "@/config/supabase";
import { toast } from "sonner";
import { formatKoreanTime } from '@/lib/utils';

interface SharedGenerationData {
  generation_response_id: number;
  generation_name: string | null;
  generation_status_type_id: number;
  created_at: string;
  output_path: string | null;
  version_no: number;
  can_share: boolean;
  generation_attrs: {
    course_type_id: number;
    difficulty_id: number | null;
    expected_duration_min: number | null;
    course_types?: { course_type_name: string } | null;
    difficulties?: { difficulty_name: string } | null;
    raw_generation_formats?: { generation_format_name: string } | null;
  };
  generation_status_types?: { generation_status_type_name: string } | null;
}

const ShareResult: React.FC = () => {
  console.log('ShareResult component loaded!');
  const { id } = useParams<{ id: string }>();
  console.log('ShareResult - ID from params:', id);
  
  const [data, setData] = useState<SharedGenerationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchSharedGeneration();
    }
  }, [id]);

  const fetchSharedGeneration = async () => {
    if (!id) {
      console.log('❌ No ID provided');
      return;
    }

    try {
      console.log('🔍 Starting fetchSharedGeneration for ID:', id);
      console.log('🔍 Parsed ID:', parseInt(id));
      setLoading(true);
      
      // First, check if the record exists at all (without can_share filter)
      console.log('🔍 Step 1: Checking if record exists without can_share filter...');
      const { data: checkData, error: checkError } = await supabase
        .from('generation_responses')
        .select('generation_response_id, can_share')
        .eq('generation_response_id', parseInt(id))
        .maybeSingle();
      
      console.log('🔍 Check result:', { checkData, checkError });
      
      if (checkError) {
        console.error('❌ Error checking record:', checkError);
      }
      
      if (!checkData) {
        console.log('❌ Record does not exist at all for ID:', id);
        setNotFound(true);
        return;
      }
      
      console.log('✅ Record exists. can_share value:', checkData.can_share);
      
      if (!checkData.can_share) {
        console.log('❌ Record exists but can_share is false');
        setNotFound(true);
        return;
      }
      
      // Now fetch full data
      console.log('🔍 Step 2: Fetching full data with can_share=true filter...');
      const { data: generationData, error } = await supabase
        .from('generation_responses')
        .select(`
          generation_response_id,
          generation_name,
          generation_status_type_id,
          created_at,
          output_path,
          version_no,
          can_share,
          generation_attrs (
            course_type_id,
            difficulty_id,
            expected_duration_min,
            course_types (course_type_name),
            difficulties (difficulty_name),
            raw_generation_formats (generation_format_name)
          ),
          generation_status_types (generation_status_type_name)
        `)
        .eq('generation_response_id', parseInt(id))
        .eq('can_share', true)
        .maybeSingle();

      console.log('🔍 Full query result:', { generationData, error });

      if (error) {
        console.error('❌ Error fetching shared generation:', error);
        setNotFound(true);
        return;
      }

      if (!generationData) {
        console.log('❌ No data returned from full query');
        setNotFound(true);
        return;
      }

      setData(generationData as SharedGenerationData);
      
      console.log('ShareResult - Generation data:', generationData);
      console.log('ShareResult - Status:', generationData.generation_status_types?.generation_status_type_name);
      console.log('ShareResult - Output path:', generationData.output_path);
      
      // Redirect to viewer HTML for completed documents  
      if (generationData.output_path && generationData.generation_status_type_id === 4) {
        console.log('ShareResult - Redirecting to viewer...');
        // Get bucket info from secure-download and construct S3 URL
        try {
          const response = await fetch(`https://${SUPABASE_CONFIG.projectId}.supabase.co/functions/v1/secure-download`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              filePath: generationData.output_path,
              fileType: 'generation',
              generationId: generationData.generation_response_id
            })
          });
          
          const result = await response.json();
          
          if (result.success && result.downloadUrl) {
            // Extract bucket name and region from presigned URL
            const urlMatch = result.downloadUrl.match(/https:\/\/([^.]+)\.s3\.([^.]+)\.amazonaws\.com/);
            if (urlMatch) {
              const bucketName = urlMatch[1];
              const region = urlMatch[2];
              const s3Url = `https://${bucketName}.s3.${region}.amazonaws.com/${generationData.output_path}`;
              const viewerUrl = `${window.location.origin}/viewer.html?s3Url=${encodeURIComponent(s3Url)}`;
              console.log('ShareResult - Viewer URL:', viewerUrl);
              window.location.href = viewerUrl;
              return;
            }
          }
        } catch (error) {
          console.error('Error getting S3 config:', error);
        }
        
        // Fallback: use output_path directly
        const viewerUrl = `${window.location.origin}/viewer.html?outputPath=${encodeURIComponent(generationData.output_path)}`;
        console.log('ShareResult - Viewer URL (fallback):', viewerUrl);
        window.location.href = viewerUrl;
        return;
      } else {
        console.log('ShareResult - Not redirecting. Reasons:', {
          hasOutputPath: !!generationData.output_path,
          statusId: generationData.generation_status_type_id,
          isCompleted: generationData.generation_status_type_id === 4
        });
      }
    } catch (error) {
      console.error('Error in fetchSharedGeneration:', error);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const getDocumentUrl = async (filePath: string, generationResponseId: number) => {
    try {
      console.log('Getting document URL for:', filePath);
      
      // Get the public URL for the document to use with Google Docs viewer
      const response = await fetch(`https://${SUPABASE_CONFIG.projectId}.supabase.co/functions/v1/secure-download`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          filePath: filePath, 
          fileType: 'generation',
          generationId: generationResponseId
        })
      });

      const result = await response.json();
      console.log('Document URL response:', result);

      if (response.ok && result.success && result.downloadUrl) {
        // For shared documents, use the S3 URL directly with Google Docs viewer
        const googleDocsUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(result.downloadUrl)}&embedded=true`;
        console.log('Generated Google Docs URL:', googleDocsUrl);
        setDocumentUrl(googleDocsUrl);
      } else {
        console.error('Failed to get document URL:', result.error);
        toast.error('문서를 불러올 수 없습니다.');
      }
    } catch (error) {
      console.error('Error getting document URL:', error);
      toast.error('문서를 불러오는 중 오류가 발생했습니다.');
    }
  };

  const getStatusName = () => {
    if (data?.generation_status_types?.generation_status_type_name) {
      return data.generation_status_types.generation_status_type_name;
    }
    // Fallback for when join doesn't work
    const statusMap: { [key: number]: string } = {
      1: '생성 요청',
      2: '생성 중', 
      3: '생성 실패',
      4: '생성 완료'
    };
    return statusMap[data?.generation_status_type_id || 0] || 'Unknown';
  };

  const getStatusVariant = () => {
    const statusName = getStatusName().toLowerCase();
    if (statusName.includes('완료') || statusName === 'completed') return 'default';
    if (statusName.includes('실패') || statusName.includes('failed') || statusName === 'error') return 'destructive';
    return 'secondary';
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="text-center py-12">
            <Eye className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">자료를 찾을 수 없습니다</h2>
            <p className="text-muted-foreground mb-4">
              공유된 자료가 존재하지 않거나 공유가 중단되었습니다.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">공유된 수업자료</h1>
        <p className="text-muted-foreground">이 자료는 교사가 공유한 수업자료입니다.</p>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <h2 className="text-xl font-bold">{data.generation_name || 'Unnamed Generation'}</h2>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">V{data.version_no}</Badge>
                  <Badge variant={getStatusVariant()}>
                    {getStatusName()}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  생성일: {formatKoreanTime(data.created_at)}
                </p>
              </div>
              {documentUrl && (
                <div className="flex gap-2">
                  <a
                    href={documentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    새 창에서 보기
                  </a>
                </div>
              )}
            </div>
          </CardContent>
        </CardHeader>
      </Card>

      {/* Document Viewer */}
      {documentUrl && getStatusName().toLowerCase().includes('완료') && (
        <Card>
          <CardHeader>
            <CardTitle>자료 미리보기</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative w-full" style={{ height: '800px' }}>
              <iframe
                src={documentUrl}
                className="w-full h-full border rounded-md"
                title="Shared Document"
                loading="lazy"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generation Settings */}
      <Card>
        <CardHeader>
          <CardTitle>생성 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">교과목</label>
              <p className="text-foreground">{data.generation_attrs?.course_types?.course_type_name || 'N/A'}</p>
            </div>
            
            {data.generation_attrs?.difficulties && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">난이도</label>
                <p className="text-foreground">{data.generation_attrs.difficulties.difficulty_name}</p>
              </div>
            )}
            
            {data.generation_attrs?.expected_duration_min && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">예상 수업 시간</label>
                <p className="text-foreground">{data.generation_attrs.expected_duration_min}분</p>
              </div>
            )}

            {data.generation_attrs?.raw_generation_formats && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">자료 형식</label>
                <p className="text-foreground">{data.generation_attrs.raw_generation_formats.generation_format_name}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <Card className="bg-muted/50">
        <CardContent className="text-center py-6">
          <p className="text-sm text-muted-foreground">
            이 자료는 교사 도우미 서비스를 통해 생성되었습니다.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ShareResult;