import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GalleryHeader } from "@/components/gallery/GalleryHeader";
import { ResultCard } from "@/components/gallery/ResultCard";
import { EmptyState } from "@/components/gallery/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

interface CourseType {
  course_type_id: number;
  course_type_name: string;
}

interface ResultItem {
  id: string;
  title: string;
  author: {
    nickname: string;
    avatar: string;
    isOwner: boolean;
  };
  courseType: string;
  canShare: boolean;
  likesCount: number;
  downloadsCount: number;
  createdAt: string;
  status: string;
  isLiked: boolean;
  outputPath: string | null;
  generationResponseId: number;
}

const GalleryResults = () => {
  const [searchKeyword, setSearchKeyword] = useState("");
  const [sortBy, setSortBy] = useState("latest");
  const [selectedCourseTypes, setSelectedCourseTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<ResultItem[]>([]);
  const [courseTypes, setCourseTypes] = useState<CourseType[]>([]);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchCourseTypes();
    fetchGalleryResults();
  }, []);

  const fetchCourseTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('course_types')
        .select('course_type_id, course_type_name')
        .order('course_type_name');

      if (error) throw error;
      setCourseTypes(data || []);
    } catch (error) {
      console.error('Error fetching course types:', error);
    }
  };

  const fetchGalleryResults = async () => {
    try {
      setLoading(true);
      console.log('📊 Starting to fetch gallery results...');
      
      // First, get generation responses
      const { data, error } = await supabase
        .from('generation_responses')
        .select(`
          generation_response_id,
          output_path,
          generation_status_type_id,
          generation_result_messages,
          generation_name,
          created_at,
          user_id,
          likes_count,
          can_share,
          generation_attrs!generation_responses_generation_attrs_id_fkey (
            course_material_id,
            course_materials!generation_attrs_course_material_id_fkey (
              raw_course_material_id,
              raw_course_materials!course_materials_raw_course_material_id_fkey (
                course_material_name,
                course_id,
                courses!course_id (
                  course_grade,
                  course_type_id,
                  course_types!course_type_id (
                    course_type_name
                  )
                )
              )
            )
          )
        `)
        .eq('can_share', true)
        .eq('generation_status_type_id', 4)  // 생성 완료된 것만
        .order('created_at', { ascending: false });

      console.log('📊 Generation responses query result:', { data, error });

      if (error) throw error;

      if (!data || data.length === 0) {
        console.log('📊 No data found or empty result');
        setResults([]);
        setLoading(false);
        return;
      }

      console.log('📊 Found', data.length, 'generation responses');

      // Get unique user IDs
      const userIds = [...new Set(data.map(item => item.user_id).filter(Boolean))];
      console.log('📊 Unique user IDs:', userIds);
      
      // Fetch teacher info for all users
      const { data: teacherData, error: teacherError } = await supabase
        .from('teacher_info')
        .select('user_id, nickname, personal_photo_path')
        .in('user_id', userIds);

      console.log('📊 Teacher info query result:', { teacherData, teacherError });

      if (teacherError) {
        console.error('Error fetching teacher info:', teacherError);
      }

      // Create a map for teacher info
      const teacherMap = new Map();
      (teacherData || []).forEach(teacher => {
        teacherMap.set(teacher.user_id, teacher);
      });

      console.log('📊 Teacher map:', teacherMap);

      // Get user's likes
      const userLikes = user ? await fetchUserLikes(data.map(item => item.generation_response_id)) : [];
      const likedSet = new Set(userLikes);

      console.log('📊 User likes:', userLikes);

      // Get download counts
      const downloadCounts = await fetchDownloadCounts(data.map(item => item.generation_response_id));

      console.log('📊 Download counts:', downloadCounts);

      const formattedData: ResultItem[] = data.map(item => {
        const teacher = teacherMap.get(item.user_id);
        const formatted = {
          id: item.generation_response_id.toString(),
          title: item.generation_name || item.generation_attrs?.course_materials?.raw_course_materials?.course_material_name || '제목 없음',
          author: {
            nickname: teacher?.nickname || '익명',
            avatar: teacher?.personal_photo_path || '',
            isOwner: user?.id === item.user_id,
          },
          courseType: item.generation_attrs?.course_materials?.raw_course_materials?.courses?.course_types?.course_type_name || '기타',
          canShare: item.can_share,
          likesCount: item.likes_count || 0,
          downloadsCount: downloadCounts[item.generation_response_id] || 0,
          createdAt: item.created_at,
          status: getStatusText(item.generation_status_type_id),
          isLiked: likedSet.has(item.generation_response_id),
          outputPath: item.output_path,
          generationResponseId: item.generation_response_id,
        };
        console.log('📊 Formatted item:', formatted);
        return formatted;
      });

      console.log('📊 Final formatted data:', formattedData);
      setResults(formattedData);
    } catch (error) {
      console.error('❌ Error fetching gallery results:', error);
      toast.error('갤러리 데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserLikes = async (responseIds: number[]): Promise<number[]> => {
    if (!user || responseIds.length === 0) return [];
    
    try {
      const { data, error } = await supabase
        .from('generation_response_likes')
        .select('generation_response_id')
        .eq('user_id', user.id)
        .in('generation_response_id', responseIds);

      if (error) throw error;
      return data?.map(item => item.generation_response_id) || [];
    } catch (error) {
      console.error('Error fetching user likes:', error);
      return [];
    }
  };

  const fetchDownloadCounts = async (responseIds: number[]): Promise<Record<number, number>> => {
    if (responseIds.length === 0) return {};
    
    try {
      const { data, error } = await supabase
        .from('generation_response_download_events')
        .select('generation_response_id')
        .in('generation_response_id', responseIds);

      if (error) throw error;
      
      const counts: Record<number, number> = {};
      data?.forEach(item => {
        counts[item.generation_response_id] = (counts[item.generation_response_id] || 0) + 1;
      });
      
      return counts;
    } catch (error) {
      console.error('Error fetching download counts:', error);
      return {};
    }
  };

  const getStatusText = (statusId: number): string => {
    switch (statusId) {
      case 1: return '대기중';
      case 2: return '진행중';
      case 3: return '완료';
      default: return '알 수 없음';
    }
  };

  const handleLikeToggle = async (id: string) => {
    if (!user) {
      toast.error('로그인이 필요합니다.');
      return;
    }

    const responseId = parseInt(id);
    const result = results.find(r => r.id === id);
    if (!result) return;

    try {
      if (result.isLiked) {
        // Unlike
        await supabase
          .from('generation_response_likes')
          .delete()
          .eq('user_id', user.id)
          .eq('generation_response_id', responseId);

        // Update likes count in generation_responses table
        await supabase
          .from('generation_responses')
          .update({ likes_count: Math.max(0, result.likesCount - 1) })
          .eq('generation_response_id', responseId);
      } else {
        // Like
        await supabase
          .from('generation_response_likes')
          .insert({
            user_id: user.id,
            generation_response_id: responseId,
          });

        // Update likes count in generation_responses table  
        await supabase
          .from('generation_responses')
          .update({ likes_count: result.likesCount + 1 })
          .eq('generation_response_id', responseId);
      }

      // Update local state
      setResults(prev => prev.map(result => 
        result.id === id 
          ? { 
              ...result, 
              isLiked: !result.isLiked,
              likesCount: result.isLiked ? result.likesCount - 1 : result.likesCount + 1
            }
          : result
      ));
    } catch (error) {
      console.error('Error toggling like:', error);
      toast.error('좋아요 처리 중 오류가 발생했습니다.');
    }
  };

  const handleCardClick = (id: string) => {
    navigate(`/generation/${id}`, { state: { from: 'gallery' } });
  };

  const handleDownload = async (id: string) => {
    const result = results.find(r => r.id === id);
    if (!result?.outputPath) {
      toast.error('다운로드할 파일이 없습니다.');
      return;
    }

    try {
      // Record download event
      if (user) {
        await supabase
          .from('generation_response_download_events')
          .insert({
            generation_response_id: result.generationResponseId,
            actor_user_id: user.id,
          });
      }

      // Download file using existing secure download function
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      const { data, error } = await supabase.functions.invoke('secure-download', {
        body: { 
          filePath: result.outputPath, 
          fileType: 'generation',
          generationId: result.generationResponseId
        },
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }

      if (data?.success && data?.downloadUrl) {
        const link = document.createElement('a');
        link.href = data.downloadUrl;
        link.download = data.filename || 'generated-file';
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Update download count in UI
        setResults(prev => prev.map(r => 
          r.id === id ? { ...r, downloadsCount: r.downloadsCount + 1 } : r
        ));
        
        toast.success('파일이 성공적으로 다운로드되었습니다.');
      } else {
        throw new Error(data?.error || '다운로드에 실패했습니다.');
      }
    } catch (error: any) {
      console.error('Download error:', error);
      const msg = String(error?.message || '');
      if (/401/.test(msg)) toast.error('인증이 필요합니다. 다시 로그인해 주세요.');
      else if (/403/.test(msg)) toast.error('접근 권한이 없습니다.');
      else if (/404/.test(msg)) toast.error('파일을 찾을 수 없습니다.');
      else toast.error(`파일 다운로드 중 오류가 발생했습니다: ${msg || '알 수 없는 오류'}`);
    }
  };

  const filteredResults = results.filter(result => {
    const matchesSearch = result.title.toLowerCase().includes(searchKeyword.toLowerCase());
    const matchesCourseTypes = selectedCourseTypes.length === 0 || 
      selectedCourseTypes.includes(courseTypes.find(ct => ct.course_type_name === result.courseType)?.course_type_id.toString() || "");
    
    return matchesSearch && matchesCourseTypes;
  });

  // Apply sorting
  const sortedResults = [...filteredResults].sort((a, b) => {
    switch (sortBy) {
      case 'likes':
        return b.likesCount - a.likesCount;
      case 'downloads':
        return b.downloadsCount - a.downloadsCount;
      case 'latest':
      default:
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

  const LoadingSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="space-y-3">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-20 w-full" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-16" />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <Layout>
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto">
          {/* 탭 네비게이션 */}
          <Tabs value="results" className="w-full">
            <div className="border-b bg-card">
              <div className="px-6 pt-6">
                <TabsList className="grid w-full max-w-md grid-cols-2">
                  <TabsTrigger value="generation_formats" className="gap-2" asChild>
                    <Link to="/gallery/generation_formats">수업 자료</Link>
                  </TabsTrigger>
                  <TabsTrigger value="results" className="gap-2">
                    생성 결과
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* 헤더 필터 */}
              <GalleryHeader
                searchKeyword={searchKeyword}
                onSearchChange={setSearchKeyword}
                sortBy={sortBy}
                onSortChange={setSortBy}
                selectedCourseTypes={selectedCourseTypes}
                onCourseTypesChange={setSelectedCourseTypes}
                showTagFilter={false}
                courseTypes={courseTypes.map(ct => ({ id: ct.course_type_id.toString(), name: ct.course_type_name }))}
              />
            </div>

            <TabsContent value="results" className="mt-0">
              {loading ? (
                <LoadingSkeleton />
              ) : sortedResults.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
                  {sortedResults.map((result) => (
                    <ResultCard
                      key={result.id}
                      id={result.id}
                      title={result.title}
                      author={result.author}
                      courseType={result.courseType}
                      canShare={result.canShare}
                      likesCount={result.likesCount}
                      downloadsCount={result.downloadsCount}
                      createdAt={result.createdAt}
                      status={result.status}
                      isLiked={result.isLiked}
                      onLikeToggle={handleLikeToggle}
                      onCardClick={handleCardClick}
                      onDownload={handleDownload}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState 
                  type={searchKeyword || selectedCourseTypes.length > 0 ? "search" : "results"}
                />
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
};

export default GalleryResults;