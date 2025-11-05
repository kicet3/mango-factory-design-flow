import { useState, useEffect } from "react";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { GalleryHeader } from "@/components/gallery/GalleryHeader";
import { TeachingMaterialCard } from "@/components/generate-v2/TeachingMaterialCard";
import { EmptyState } from "@/components/gallery/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";

// 데이터 인터페이스
interface MaterialData {
  raw_generation_format_id: number;
  generation_format_name: string;
  generation_format_desc: string;
  gallery_desc: string;
  likes_count: number;
  downloads_count: number;
  created_at: string;
  can_share: boolean;
  course_types: Array<{ course_type_name: string }>;
  tags: Array<{ tag_name: string }>;
  uploader: {
    nickname: string;
    avatar: string;
    isOwner: boolean;
  };
  isLiked: boolean;
}

const ITEMS_PER_PAGE = 12;

const GalleryMaterials = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchKeyword, setSearchKeyword] = useState("");
  const [sortBy, setSortBy] = useState("latest");
  const [selectedCourseTypes, setSelectedCourseTypes] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [materials, setMaterials] = useState<MaterialData[]>([]);
  const [courseTypes, setCourseTypes] = useState<Array<{ id: string; name: string }>>([]);
  const [tags, setTags] = useState<Array<{ id: string; name: string }>>([]);
  const [showOnlyLiked, setShowOnlyLiked] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    await Promise.all([
      fetchMaterials(),
      fetchCourseTypes(),
      fetchTags()
    ]);
    setLoading(false);
  };

  const fetchMaterials = async () => {
    try {
      const { data, error } = await supabase
        .from('raw_generation_formats')
        .select(`
          *,
          raw_generation_format_course_type_map(
            course_types(course_type_name)
          ),
          raw_generation_format_tag_map(
            tags(tag_name)  
          )
        `)
        .eq('can_share', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get unique uploader user IDs
      const uploaderIds = [...new Set(data?.map(item => item.uploaded_user_id).filter(Boolean) || [])];
      
      // Fetch teacher info for all uploaders
      const { data: teacherInfoData } = await supabase
        .from('teacher_info')
        .select('user_id, nickname, personal_photo_path')
        .in('user_id', uploaderIds);

      // Create a map for quick lookup
      const teacherInfoMap = new Map(
        teacherInfoData?.map(ti => [ti.user_id, ti]) || []
      );

      // Fetch download counts and like counts for all materials
      const formatIds = data?.map(item => item.raw_generation_format_id) || [];
      
      const { data: downloadData } = await supabase
        .from('user_material_interactions')
        .select('raw_generation_format_id')
        .in('raw_generation_format_id', formatIds)
        .eq('interaction_type_id', 2);

      const { data: likeData } = await supabase
        .from('raw_generation_format_likes')
        .select('raw_generation_format_id, user_id')
        .in('raw_generation_format_id', formatIds);

      // Create download count map
      const downloadCountMap = new Map<number, number>();
      downloadData?.forEach(item => {
        const currentCount = downloadCountMap.get(item.raw_generation_format_id) || 0;
        downloadCountMap.set(item.raw_generation_format_id, currentCount + 1);
      });

      // Create like count map and user like status map
      const likeCountMap = new Map<number, number>();
      const userLikedMap = new Map<number, boolean>();
      likeData?.forEach(item => {
        const currentCount = likeCountMap.get(item.raw_generation_format_id) || 0;
        likeCountMap.set(item.raw_generation_format_id, currentCount + 1);
        
        // Check if current user liked this material
        if (user && item.user_id === user.id) {
          userLikedMap.set(item.raw_generation_format_id, true);
        }
      });

      const formattedMaterials: MaterialData[] = (data || []).map(item => {
        const teacherInfo = item.uploaded_user_id ? teacherInfoMap.get(item.uploaded_user_id) : null;
        
        return {
          raw_generation_format_id: item.raw_generation_format_id,
          generation_format_name: item.generation_format_name,
          generation_format_desc: item.generation_format_desc,
          gallery_desc: item.gallery_desc,
          likes_count: likeCountMap.get(item.raw_generation_format_id) || 0,
          downloads_count: downloadCountMap.get(item.raw_generation_format_id) || 0,
          created_at: item.created_at,
          can_share: item.can_share,
          course_types: item.raw_generation_format_course_type_map?.map(ct => ({
            course_type_name: ct.course_types?.course_type_name || ""
          })) || [],
          tags: item.raw_generation_format_tag_map?.map(tag => ({
            tag_name: tag.tags?.tag_name || ""
          })) || [],
          uploader: {
            nickname: teacherInfo?.nickname || "익명",
            avatar: teacherInfo?.personal_photo_path || "",
            isOwner: false
          },
          isLiked: userLikedMap.get(item.raw_generation_format_id) || false
        };
      });

      setMaterials(formattedMaterials);
    } catch (error) {
      console.error('Error fetching materials:', error);
      toast.error('수업자료를 불러오는데 실패했습니다.');
      // Set empty array on error to show empty state
      setMaterials([]);
    }
  };

  const fetchCourseTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('course_types')
        .select('course_type_id, course_type_name')
        .order('course_type_name');

      if (error) throw error;
      
      setCourseTypes((data || []).map(ct => ({
        id: ct.course_type_id.toString(),
        name: ct.course_type_name
      })));
    } catch (error) {
      console.error('Error fetching course types:', error);
    }
  };

  const fetchTags = async () => {
    try {
      const { data, error } = await supabase
        .from('tags')
        .select('tag_id, tag_name')
        .order('tag_name');

      if (error) throw error;
      
      setTags((data || []).map(tag => ({
        id: tag.tag_id.toString(),
        name: tag.tag_name
      })));
    } catch (error) {
      console.error('Error fetching tags:', error);
    }
  };

  const handleLikeToggle = async (id: number) => {
    if (!user) {
      toast.error('좋아요를 누르려면 로그인이 필요합니다.');
      return;
    }

    const material = materials.find(m => m.raw_generation_format_id === id);
    if (!material) return;

    try {
      if (material.isLiked) {
        // Unlike
        await supabase
          .from('raw_generation_format_likes')
          .delete()
          .eq('raw_generation_format_id', id)
          .eq('user_id', user.id);
      } else {
        // Like
        await supabase
          .from('raw_generation_format_likes')
          .insert({
            raw_generation_format_id: id,
            user_id: user.id
          });
      }

      // Update local state
      setMaterials(prev => prev.map(m => 
        m.raw_generation_format_id === id 
          ? { 
              ...m, 
              isLiked: !m.isLiked,
              likes_count: m.isLiked ? m.likes_count - 1 : m.likes_count + 1
            }
          : m
      ));
    } catch (error) {
      console.error('Error toggling like:', error);
      toast.error('좋아요 처리에 실패했습니다.');
    }
  };

  const handleCardClick = (id: number) => {
    setSelectedMaterialId(id);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    // Refresh materials to sync like status
    fetchMaterials();
  };

  const handleShare = async (id: number) => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("페이지 주소가 클립보드에 복사되었습니다.");
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
      toast.error("주소 복사에 실패했습니다.");
    }
  };

  const handleAddMaterial = () => {
    console.log("Open add material modal");
    // TODO: 수업자료 등록 모달 열기
  };

  const filteredMaterials = materials.filter(material => {
    const matchesSearch = material.generation_format_name.toLowerCase().includes(searchKeyword.toLowerCase());
    const matchesCourseTypes = selectedCourseTypes.length === 0 ||
      material.course_types.some(ct => selectedCourseTypes.includes(
        courseTypes.find(mct => mct.name === ct.course_type_name)?.id || ""
      ));
    const matchesTags = selectedTags.length === 0 ||
      material.tags.some(tag => selectedTags.includes(
        tags.find(mt => mt.name === tag.tag_name)?.id || ""
      ));
    const matchesLiked = !showOnlyLiked || material.isLiked;

    return matchesSearch && matchesCourseTypes && matchesTags && matchesLiked;
  });

  // 페이지네이션 로직
  const totalPages = Math.ceil(filteredMaterials.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentMaterials = filteredMaterials.slice(startIndex, endIndex);

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(totalPages, prev + 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleTogglePublic = (materialId: string) => {
    // TODO: 공개 설정 토글 로직
    console.log("Toggle public:", materialId);
  };

  const handleStartLesson = (materialId: string) => {
    // 자료 상세보기 페이지로 이동
    navigate(`/gallery/material/${materialId}`);
  };

  const handleShareMaterial = (materialId: string) => {
    handleShare(parseInt(materialId));
  };

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
          <Tabs value="generation_formats" className="w-full">
            <div className="border-b bg-card">
              <div className="px-6 pt-6">
                <TabsList className="grid w-full max-w-md grid-cols-2">
                  <TabsTrigger value="generation_formats" className="gap-2">
                    수업 자료
                  </TabsTrigger>
                  <TabsTrigger value="results" className="gap-2" asChild>
                    <Link to="/gallery/results">생성 결과</Link>
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
                selectedTags={selectedTags}
                onTagsChange={setSelectedTags}
                showTagFilter={true}
                showOnlyLiked={showOnlyLiked}
                onShowOnlyLikedChange={setShowOnlyLiked}
                courseTypes={courseTypes}
                tags={tags}
              />
            </div>

            <TabsContent value="generation_formats" className="mt-0">
              {loading ? (
                <LoadingSkeleton />
              ) : filteredMaterials.length > 0 ? (
                <div className="space-y-8 p-6">
                  {/* 교안 그리드 (3열 x 4행 = 12개) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {currentMaterials.map((material) => (
                      <div key={material.raw_generation_format_id} className="transform transition-transform hover:scale-[1.02]">
                        <TeachingMaterialCard
                          materialType="teacher_ppt"
                          createdAt={material.created_at}
                          publisher={material.course_types[0]?.course_type_name || "미분류"}
                          grade=""
                          semester=""
                          subject=""
                          unit=""
                          lesson=""
                          title={material.generation_format_name}
                          previewImage={undefined}
                          teachingStyle={[]}
                          activityType={[]}
                          competencies={[]}
                          otherTags={material.tags.map(tag => tag.tag_name)}
                          usageCount={0}
                          templateUsageCount={material.downloads_count}
                          likesCount={material.likes_count}
                          viewCount={0}
                          isPublic={material.can_share}
                          onStartLesson={() => handleStartLesson(material.raw_generation_format_id.toString())}
                          onShare={() => handleShareMaterial(material.raw_generation_format_id.toString())}
                          onTogglePublic={() => handleTogglePublic(material.raw_generation_format_id.toString())}
                          startButtonText="자료 살펴보기"
                        />
                      </div>
                    ))}
                  </div>

                  {/* 페이지네이션 */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-4 pt-8">
                      <Button
                        variant="outline"
                        onClick={handlePreviousPage}
                        disabled={currentPage === 1}
                        className="gap-2"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        이전
                      </Button>

                      <div className="flex items-center gap-2">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                          <button
                            key={page}
                            onClick={() => {
                              setCurrentPage(page);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className={`w-10 h-10 rounded-lg transition-all ${
                              page === currentPage
                                ? "bg-primary text-primary-foreground font-semibold"
                                : "bg-white hover:bg-gray-100 text-gray-700"
                            }`}
                          >
                            {page}
                          </button>
                        ))}
                      </div>

                      <Button
                        variant="outline"
                        onClick={handleNextPage}
                        disabled={currentPage === totalPages}
                        className="gap-2"
                      >
                        다음
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  )}

                  {/* 카운터 */}
                  <div className="text-center text-sm text-muted-foreground">
                    총 {filteredMaterials.length}개 | {currentPage} / {totalPages} 페이지
                  </div>
                </div>
              ) : (
                <EmptyState
                  type={searchKeyword || selectedCourseTypes.length > 0 || selectedTags.length > 0 ? "search" : "materials"}
                  onAction={handleAddMaterial}
                  actionLabel="내 수업자료 등록"
                />
              )}
            </TabsContent>
          </Tabs>

          {/* 하단 고정 버튼 */}
          <div className="fixed bottom-6 right-6">
            <Button
              onClick={handleAddMaterial}
              size="lg"
              className="rounded-full shadow-lg gap-2"
            >
              <Plus className="w-5 h-5" />
              내 수업자료 등록
            </Button>
          </div>
        </div>

      </div>
    </Layout>
  );
};

export default GalleryMaterials;