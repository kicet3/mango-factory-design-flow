import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { RefreshCw, Edit2, Check, X, ArrowLeft, Play, ExternalLink, Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "@/components/ui/sonner";
import { VersionTabs } from "@/components/VersionTabs";

interface StatusType {
  generation_status_type_id: number;
  generation_status_type_name: string | null;
}

interface VideoRecommendation {
  video_recommendation_id: number;
  video_name: string;
  video_url: string;
  video_desc: string | null;
  created_at: string;
}

interface GenerationDetailData {
  generation_response_id: number;
  generation_name: string | null;
  generation_status_type_id: number;
  created_at: string;
  output_path: string | null;
  root_response_id: number;
  version_no: number;
  is_final: boolean;
  can_share: boolean;
  generation_attrs_id: number;
  generation_attrs: {
    course_type_id: number;
    difficulty_id: number | null;
    expected_duration_min: number | null;
    class_mate_info: any;
    course_material_scope: any;
    course_material_id: number | null;
    raw_generation_format_id: number | null;
    generation_additional_message: string | null;
    course_types?: {
      course_type_name: string;
    } | null;
    difficulties?: {
      difficulty_name: string;
    } | null;
    raw_generation_formats?: {
      generation_format_name: string;
    } | null;
    course_materials?: {
      course_material_desc: string;
      course_structure: any[];
      raw_course_materials?: {
        courses?: {
          course_grade: string;
          course_semester_id: number;
          course_material_publisher_id: number;
          course_semesters?: {
            course_semester_name: string;
          } | null;
          course_material_publishers?: {
            course_material_publisher_name: string;
          } | null;
        } | null;
      } | null;
    } | null;
  };
  course_types: {
    course_type_name: string;
  } | null;
  difficulties: {
    difficulty_name: string;
  } | null;
  raw_generation_formats: {
    generation_format_name: string;
  } | null;
  course_materials: {
    course_material_desc: string;
    raw_course_materials?: {
      courses?: {
        course_grade: string;
        course_semester_id: number;
        course_material_publisher_id: number;
        course_semesters?: {
          course_semester_name: string;
        } | null;
        course_material_publishers?: {
          course_material_publisher_name: string;
        } | null;
      } | null;
    } | null;
  } | null;
  course_structure?: any;
  versions?: Array<{
    generation_response_id: number;
    version_no: number;
    created_at: string;
    generation_name: string;
    generation_status_type_id: number;
    output_path?: string;
    is_final: boolean;
  }>;
  statusTypes?: StatusType[];
}

const GenerationDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [data, setData] = useState<GenerationDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [currentVersionId, setCurrentVersionId] = useState<number | null>(null);
  const [videoRecommendations, setVideoRecommendations] = useState<VideoRecommendation[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [generatingVideos, setGeneratingVideos] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const [updatingShare, setUpdatingShare] = useState(false);
  const [downloadsCount, setDownloadsCount] = useState<number>(0);

  useEffect(() => {
    if (id) {
      fetchGenerationDetail();
    }
  }, [user, id]);

  const fetchGenerationDetail = async () => {
    if (!id) return;

    try {
      setLoading(true);

      const { data: generationData, error } = await supabase
        .from('generation_responses')
        .select(`
          generation_response_id,
          generation_name,
          generation_status_type_id,
          created_at,
          output_path,
          root_response_id,
          version_no,
          is_final,
          can_share,
          user_id,
          generation_attrs_id,
          generation_attrs!inner (
            course_type_id,
            difficulty_id,
            expected_duration_min,
            class_mate_info,
            course_material_scope,
            course_material_id,
            raw_generation_format_id,
            generation_additional_message,
            course_types (
              course_type_name
            ),
            difficulties (
              difficulty_name
            ),
            raw_generation_formats (
              generation_format_name
            ),
            course_materials (
              course_material_desc,
              course_structure,
              raw_course_materials (
                courses (
                  course_grade,
                  course_semester_id,
                  course_material_publisher_id,
                  course_semesters (
                    course_semester_name
                  ),
                  course_material_publishers (
                    course_material_publisher_name
                  )
                )
              )
            )
          )
        `)
        .eq('generation_response_id', parseInt(id!))
        .single();

      if (error) {
        console.error('Error fetching generation detail:', error);
        setData(null);
        setLoading(false);
        return;
      }

      if (!generationData) {
        setData(null);
        setLoading(false);
        return;
      }

      // Check access permissions
      const isOwner = user ? generationData.user_id === user.id : false;
      const isShared = generationData.can_share === true;
      
      if (!isOwner && !isShared) {
        console.log('Access denied: not owner and not shared');
        toast.error('접근 권한이 없습니다.');
        setData(null);
        setLoading(false);
        return;
      }

      // Fetch all versions for this root
      const { data: versionsData, error: versionsError } = await supabase
        .from('generation_responses')
        .select(`
          generation_response_id,
          version_no,
          created_at,
          generation_name,
          generation_status_type_id,
          output_path,
          is_final
        `)
        .eq('root_response_id', generationData.root_response_id)
        .order('version_no', { ascending: true });

      if (versionsError) {
        console.error('Error fetching versions:', versionsError);
      }

      // Fetch generation status types
      const { data: statusTypesData, error: statusTypesError } = await supabase
        .from('generation_status_types')
        .select(`
          generation_status_type_id,
          generation_status_type_name
        `);

      if (statusTypesError) {
        console.error('Error fetching status types:', statusTypesError);
      }

      // Course structure is already included in the main query, no need for separate fetch

      const finalData: GenerationDetailData = {
        generation_response_id: generationData.generation_response_id,
        generation_name: generationData.generation_name,
        generation_status_type_id: generationData.generation_status_type_id,
        created_at: generationData.created_at,
        output_path: generationData.output_path,
        root_response_id: generationData.root_response_id,
        version_no: generationData.version_no,
        is_final: generationData.is_final,
        can_share: generationData.can_share,
        generation_attrs_id: generationData.generation_attrs_id,
        generation_attrs: {
          course_type_id: generationData.generation_attrs.course_type_id,
          difficulty_id: generationData.generation_attrs.difficulty_id,
          expected_duration_min: generationData.generation_attrs.expected_duration_min,
          class_mate_info: generationData.generation_attrs.class_mate_info,
          course_material_scope: generationData.generation_attrs.course_material_scope,
          course_material_id: generationData.generation_attrs.course_material_id,
          raw_generation_format_id: generationData.generation_attrs.raw_generation_format_id,
          generation_additional_message: generationData.generation_attrs.generation_additional_message,
          course_types: (generationData.generation_attrs?.course_types as any) || null,
          difficulties: (generationData.generation_attrs?.difficulties as any) || null,
          raw_generation_formats: (generationData.generation_attrs?.raw_generation_formats as any) || null,
          course_materials: (generationData.generation_attrs?.course_materials as any) || null
        },
        course_types: (generationData.generation_attrs?.course_types as any) || null,
        difficulties: (generationData.generation_attrs?.difficulties as any) || null,
        raw_generation_formats: (generationData.generation_attrs?.raw_generation_formats as any) || null,
        course_materials: (generationData.generation_attrs?.course_materials as any) || null,
        course_structure: generationData.generation_attrs?.course_materials?.course_structure || null,
        versions: versionsData || [],
        statusTypes: statusTypesData || []
      };

      setData(finalData);
      setEditedName(generationData.generation_name || '');
      setCurrentVersionId(generationData.generation_response_id);
      setCanShare(generationData.can_share);
      
      // Fetch download count
      const { count: downloadCount } = await supabase
        .from('generation_response_download_events')
        .select('*', { count: 'exact', head: true })
        .eq('generation_response_id', parseInt(id!));
      
      setDownloadsCount(downloadCount || 0);
      
      // Fetch video recommendations
      fetchVideoRecommendations(generationData.generation_response_id);
      
      setLoading(false);
    } catch (error) {
      console.error('Error in fetchGenerationDetail:', error);
      setData(null);
      setLoading(false);
    }
  };

  const handleSaveName = async () => {
    if (!data || !editedName.trim()) return;

    try {
      const { error } = await supabase
        .from('generation_responses')
        .update({ generation_name: editedName.trim() })
        .eq('generation_response_id', data.generation_response_id)
        .eq('user_id', user?.id);

      if (error) throw error;

      setData(prev => prev ? { ...prev, generation_name: editedName.trim() } : null);
      setIsEditingName(false);
      toast.success('Name updated successfully');
    } catch (error) {
      console.error('Error updating name:', error);
      toast.error('Failed to update name');
    }
  };

  const handleCancelEdit = () => {
    setEditedName(data?.generation_name || '');
    setIsEditingName(false);
  };

  const handleDownload = async () => {
    if (!data?.output_path) {
      toast.error('No output file available');
      return;
    }

    try {
      const { data: downloadData, error } = await supabase.functions.invoke('secure-download', {
        body: { 
          filePath: data.output_path, 
          fileType: 'generation',
          generationId: data.generation_response_id
        }
      });

      if (error) throw error;

      if (downloadData?.success && downloadData?.downloadUrl) {
        const link = document.createElement('a');
        link.href = downloadData.downloadUrl;
        link.download = downloadData.filename || 'generated-file';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Record download event
        if (user && data.generation_response_id) {
          await supabase
            .from('generation_response_download_events')
            .insert({
              generation_response_id: data.generation_response_id,
              actor_user_id: user.id,
            });
          
          // Update local count
          setDownloadsCount(prev => prev + 1);
        }
        
        toast.success('Download started');
      } else {
        throw new Error(downloadData?.error || 'Failed to get download URL');
      }
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Download failed');
    }
  };

  const handleVersionChange = async (versionId: number) => {
    setCurrentVersionId(versionId);
    navigate(`/generation/${versionId}`);
  };

  const handleRegenerate = () => {
    // Refresh the data to get updated versions
    fetchGenerationDetail();
  };

  const fetchVideoRecommendations = async (responseId: number) => {
    try {
      setLoadingVideos(true);
      const { data: videos, error } = await supabase
        .from('video_recommendations')
        .select('*')
        .eq('generation_response_id', responseId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching video recommendations:', error);
        return;
      }

      setVideoRecommendations(videos || []);
    } catch (error) {
      console.error('Error in fetchVideoRecommendations:', error);
    } finally {
      setLoadingVideos(false);
    }
  };

  const generateVideoRecommendations = async () => {
    if (!data?.generation_response_id) return;

    try {
      setGeneratingVideos(true);
      const { data: result, error } = await supabase.functions.invoke('video-recommendations', {
        body: { generation_response_id: data.generation_response_id }
      });

      if (error) throw error;

      if (result.success) {
        toast.success(result.message);
        // Refresh video recommendations
        fetchVideoRecommendations(data.generation_response_id);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error generating video recommendations:', error);
      toast.error('동영상 추천 생성에 실패했습니다.');
    } finally {
      setGeneratingVideos(false);
    }
  };

  const openVideoInNewTab = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleShareToggle = async (enable: boolean) => {
    if (!data?.generation_response_id) return;

    try {
      setUpdatingShare(true);
      const { data: result, error } = await supabase.functions.invoke('enable-generation-response-sharing', {
        body: { 
          generation_response_id: data.generation_response_id,
          enable 
        }
      });

      if (error) throw error;

      if (result?.success) {
        setCanShare(enable);
        setData(prev => prev ? { ...prev, can_share: enable } : null);
        toast.success(enable ? '자료 공유가 활성화되었습니다.' : '자료 공유가 비활성화되었습니다.');
      } else {
        throw new Error(result?.error || 'Failed to update sharing status');
      }
    } catch (error) {
      console.error('Error updating share status:', error);
      toast.error('공유 설정 변경에 실패했습니다.');
    } finally {
      setUpdatingShare(false);
    }
  };

  const getStatusName = (statusId: number) => {
    const statusType = data?.statusTypes?.find(st => st.generation_status_type_id === statusId);
    return statusType?.generation_status_type_name || 'Unknown';
  };

  const getStatusVariant = (statusId: number) => {
    const statusName = getStatusName(statusId).toLowerCase();
    if (statusName.includes('완료') || statusName === 'completed') return 'default';
    if (statusName.includes('실패') || statusName.includes('failed') || statusName === 'error') return 'destructive';
    return 'secondary';
  };

  const getSectionName = (index: number) => {
    const courseStructure = data?.generation_attrs?.course_materials?.course_structure;
    if (courseStructure && courseStructure[index]) {
      return courseStructure[index].section_name || `Section ${index + 1}`;
    }
    return `Section ${index + 1}`;
  };

  const getWeekNames = (sectionIndex: number, weekIndices: number[]) => {
    const courseStructure = data?.generation_attrs?.course_materials?.course_structure;
    if (!courseStructure || !courseStructure[sectionIndex]) return [];
    
    const section = courseStructure[sectionIndex];
    const sectionWeeks = section?.section_weeks || [];
    
    return weekIndices.map((weekIndex: number) => {
      const week = sectionWeeks[weekIndex];
      if (week?.section_content_order !== undefined) {
        return `${week.section_content_order}차시`;
      }
      return week?.section_content_name || `${weekIndex + 1}차시`;
    });
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

  if (!data) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">Generation not found or access denied.</p>
            <Button 
              variant="outline" 
              onClick={() => navigate('/history')}
              className="mt-4"
            >
              Back to History
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Navigation Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => {
            const from = (location.state as any)?.from;
            if (from === 'gallery') {
              navigate('/gallery/results');
            } else {
              navigate('/history');
            }
          }}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          돌아가기
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isEditingName ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      className="text-xl font-bold"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveName();
                        if (e.key === 'Escape') handleCancelEdit();
                      }}
                    />
                    <Button size="sm" variant="ghost" onClick={handleSaveName}>
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-bold">{data.generation_name || 'Unnamed Generation'}</h1>
                    <Badge variant="outline">V{data.version_no} of #{data.root_response_id}</Badge>
                    {data.is_final && <Badge variant="default">최종</Badge>}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setIsEditingName(true)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 mt-2">
              <Badge variant={getStatusVariant(data.generation_status_type_id)}>
                {getStatusName(data.generation_status_type_id)}
              </Badge>
            </div>

            {/* Version Tabs */}
            {data.versions && data.versions.length > 0 && currentVersionId && data.statusTypes && (
              <VersionTabs
                versions={data.versions}
                rootResponseId={data.root_response_id}
                currentVersionId={currentVersionId}
                onVersionChange={handleVersionChange}
                onRegenerate={handleRegenerate}
                statusTypes={data.statusTypes}
              />
            )}
          </CardContent>
        </CardHeader>
      </Card>

      {/* Sharing Settings */}
      <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5" />
              자료 공유 설정
            </CardTitle>
          </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">자료 공유하기</p>
              <p className="text-xs text-muted-foreground">
                {canShare 
                  ? "이 자료는 공유 링크를 통해 누구나 열람 및 다운로드할 수 있습니다."
                  : "공유를 활성화하면 로그인 없이도 자료를 확인할 수 있는 링크가 생성됩니다."
                }
              </p>
            </div>
            <Switch
              checked={canShare}
              onCheckedChange={handleShareToggle}
              disabled={updatingShare || !data.output_path || !getStatusName(data.generation_status_type_id).toLowerCase().includes('완료')}
            />
          </div>
          {canShare && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground mb-2">공유 링크:</p>
              <div className="flex items-center gap-2">
                <code className="text-xs bg-background px-2 py-1 rounded border flex-1">
                  {window.location.origin}/share/result/{data.generation_response_id}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const shareUrl = `${window.location.origin}/share/result/${data.generation_response_id}`;
                    navigator.clipboard.writeText(shareUrl);
                    toast.success('링크가 복사되었습니다.');
                  }}
                >
                  복사
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Generation Settings */}
      <Card>
        <CardHeader>
          <CardTitle>생성 세팅</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Course Type</label>
              <p className="text-foreground">{data.generation_attrs.course_types?.course_type_name || 'N/A'}</p>
            </div>
            
            {data.generation_attrs.difficulties && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Difficulty</label>
                <p className="text-foreground">{data.generation_attrs.difficulties.difficulty_name}</p>
              </div>
            )}
            
            {data.generation_attrs.expected_duration_min && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Expected Duration</label>
                <p className="text-foreground">{data.generation_attrs.expected_duration_min} minutes</p>
              </div>
            )}
            
            {data.generation_attrs.raw_generation_formats && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Format</label>
                <p className="text-foreground">{data.generation_attrs.raw_generation_formats.generation_format_name}</p>
              </div>
            )}

            {/* Additional course information */}
            {data.generation_attrs.course_materials?.raw_course_materials?.courses && (
              <>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Grade</label>
                  <p className="text-foreground">{data.generation_attrs.course_materials.raw_course_materials.courses.course_grade}</p>
                </div>
                
                {data.generation_attrs.course_materials.raw_course_materials.courses.course_semesters && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Semester</label>
                    <p className="text-foreground">{data.generation_attrs.course_materials.raw_course_materials.courses.course_semesters.course_semester_name}</p>
                  </div>
                )}
                
                {data.generation_attrs.course_materials.raw_course_materials.courses.course_material_publishers && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Publisher</label>
                    <p className="text-foreground">{data.generation_attrs.course_materials.raw_course_materials.courses.course_material_publishers.course_material_publisher_name}</p>
                  </div>
                )}
              </>
            )}
          </div>

          {data.generation_attrs.class_mate_info && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">Class Information</label>
              <p className="text-foreground">
                Students: {data.generation_attrs.class_mate_info.male_student_count || 0} male, 
                {data.generation_attrs.class_mate_info.female_student_count || 0} female
              </p>
            </div>
          )}

          {data.generation_attrs.generation_additional_message && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">Additional Message</label>
              <p className="text-foreground">{data.generation_attrs.generation_additional_message}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Course Material Scope */}
      {data.generation_attrs.course_material_scope && (
        <Card>
          <CardHeader>
            <CardTitle>생성 범위</CardTitle>
          </CardHeader>
          <CardContent>
            {typeof data.generation_attrs.course_material_scope === 'object' && data.generation_attrs.course_material_scope.course_sections_index !== undefined && (
              <div>
                <p className="font-medium">
                  단원: {getSectionName(data.generation_attrs.course_material_scope.course_sections_index)}
                </p>
                {data.generation_attrs.course_material_scope.course_weeks_indices && (
                  <div className="mt-2">
                    <p className="text-sm text-muted-foreground">선택된 차시:</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {getWeekNames(
                        data.generation_attrs.course_material_scope.course_sections_index,
                        data.generation_attrs.course_material_scope.course_weeks_indices
                      ).map((weekName, index) => (
                        <Badge key={index} variant="secondary">
                          {weekName}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Video Recommendations */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5" />
              관련 동영상 추천
            </CardTitle>
            <Button 
              onClick={generateVideoRecommendations}
              disabled={generatingVideos}
              variant="outline"
              size="sm"
            >
              {generatingVideos ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  생성 중...
                </>
              ) : (
                '동영상 추천 생성'
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingVideos ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : videoRecommendations.length > 0 ? (
            <div className="grid gap-4">
              {videoRecommendations.map((video) => (
                <Card 
                  key={video.video_recommendation_id} 
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => openVideoInNewTab(video.video_url)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 space-y-2">
                        <h4 className="font-medium text-foreground hover:text-primary transition-colors">
                          {video.video_name}
                        </h4>
                        {video.video_desc && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {video.video_desc}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <ExternalLink className="h-4 w-4" />
                        <Play className="h-4 w-4" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Play className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">아직 동영상 추천이 생성되지 않았습니다.</p>
              <p className="text-xs mt-1">위의 버튼을 클릭하여 관련 동영상 추천을 받아보세요.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default GenerationDetail;