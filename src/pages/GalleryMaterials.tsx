import { useState, useEffect } from "react";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ConversionCard } from "@/components/gallery/ConversionCard";
import { EmptyState } from "@/components/gallery/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { ConversionData, ConversionsResponse } from "@/types/conversion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const ITEMS_PER_PAGE = 12;
const API_BASE_URL = "http://127.0.0.1:8000";

const GalleryMaterials = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [conversions, setConversions] = useState<ConversionData[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => {
    fetchConversions(currentPage);
  }, [currentPage]);

  const fetchConversions = async (page: number) => {
    try {
      setLoading(true);

      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      const response = await fetch(
        `${API_BASE_URL}/conversions/?page=${page}&page_size=${ITEMS_PER_PAGE}`,
        {
          method: 'GET',
          headers,
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch conversions");
      }

      const data: ConversionsResponse = await response.json();

      if (data.success) {
        setConversions(data.conversions);
        setTotalItems(data.total);
        setTotalPages(Math.ceil(data.total / data.page_size));
      } else {
        throw new Error("API response was not successful");
      }
    } catch (error) {
      console.error("Error fetching conversions:", error);
      toast.error("변환 데이터를 불러오는 중 오류가 발생했습니다.");
      setConversions([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(totalPages, prev + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePlay = (id: number) => {
    // TODO: 변환된 콘텐츠 재생 페이지로 이동
    console.log("Play conversion:", id);
    toast.info(`콘텐츠 ${id} 재생 기능은 준비 중입니다.`);
  };

  const LoadingSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="space-y-3">
          <Skeleton className="h-48 w-full rounded-lg" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
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
                    교안
                  </TabsTrigger>
                  <TabsTrigger value="results" className="gap-2" asChild>
                    <Link to="/gallery/results">생성 결과</Link>
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* 헤더 */}
              <div className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">교안 갤러리</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      다양한 교안을 확인하고 활용하세요
                    </p>
                  </div>
                  <div className="text-sm text-gray-600">
                    총 <span className="font-semibold text-primary">{totalItems}</span>개
                  </div>
                </div>
              </div>
            </div>

            <TabsContent value="generation_formats" className="mt-0">
              {loading ? (
                <LoadingSkeleton />
              ) : conversions.length > 0 ? (
                <div className="space-y-8 p-6">
                  {/* 교안 그리드 (3열 x 4행 = 12개) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {conversions.map((conversion) => (
                      <div
                        key={conversion.id}
                        className="transform transition-transform hover:scale-[1.02]"
                      >
                        <ConversionCard conversion={conversion} onPlay={handlePlay} />
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
                        {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => {
                          // 페이지 번호 표시 로직 (최대 10개)
                          let page;
                          if (totalPages <= 10) {
                            page = i + 1;
                          } else if (currentPage <= 5) {
                            page = i + 1;
                          } else if (currentPage >= totalPages - 4) {
                            page = totalPages - 9 + i;
                          } else {
                            page = currentPage - 5 + i;
                          }

                          return (
                            <button
                              key={page}
                              onClick={() => {
                                setCurrentPage(page);
                                window.scrollTo({ top: 0, behavior: "smooth" });
                              }}
                              className={`w-10 h-10 rounded-lg transition-all ${
                                page === currentPage
                                  ? "bg-primary text-primary-foreground font-semibold"
                                  : "bg-white hover:bg-gray-100 text-gray-700 border"
                              }`}
                            >
                              {page}
                            </button>
                          );
                        })}
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
                    총 {totalItems}개 | {currentPage} / {totalPages} 페이지
                  </div>
                </div>
              ) : (
                <EmptyState type="search" />
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
};

export default GalleryMaterials;