// GenerateV2Materials - 수업 자료 관리 페이지
import { useState, useEffect } from "react"
import { Layout } from "@/components/layout/Layout"
import { TeachingMaterialCard } from "@/components/generate-v2/TeachingMaterialCard"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { fetchConversions, type ConversionSummary } from "@/services/conversions"
import { toast } from "sonner"

const ITEMS_PER_PAGE = 12

// API 데이터를 TeachingMaterialCard props로 변환
const convertToMaterialCard = (conversion: ConversionSummary) => ({
  id: conversion.id.toString(),
  materialType: 'teacher_ppt' as const, // API에서 file_type으로 매핑 필요
  createdAt: conversion.created_at,
  publisher: conversion.original_filename, // 파일명을 출판사 위치에 표시
  grade: "정보 없음", // API에 없는 정보
  semester: "정보 없음", // API에 없는 정보
  subject: "정보 없음", // API에 없는 정보
  unit: "정보 없음", // API에 없는 정보
  lesson: "정보 없음", // API에 없는 정보
  title: conversion.content_name, // 콘텐츠 이름을 큰 제목으로 표시
  previewImage: undefined, // API에 없는 정보
  teachingStyle: [], // API에 없는 정보
  activityType: [], // API에 없는 정보
  competencies: [], // API에 없는 정보
  otherTags: [
    conversion.framework,
    conversion.styling,
    conversion.file_type
  ].filter(Boolean),
  usageCount: 0, // API에 없는 정보
  templateUsageCount: conversion.total_slides,
  likesCount: 0, // API에 없는 정보
  viewCount: 0, // API에 없는 정보
  isPublic: false,
})

export default function GenerateV2Materials() {
  const navigate = useNavigate()
  const [materials, setMaterials] = useState<ReturnType<typeof convertToMaterialCard>[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [loading, setLoading] = useState(true)

  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE)

  // API 데이터 가져오기
  useEffect(() => {
    const loadConversions = async () => {
      setLoading(true)
      try {
        const response = await fetchConversions({
          page: currentPage,
          page_size: ITEMS_PER_PAGE,
          success_only: false,
        })

        const convertedMaterials = response.conversions.map(convertToMaterialCard)
        setMaterials(convertedMaterials)
        setTotalItems(response.total)
      } catch (error) {
        console.error('Failed to fetch conversions:', error)
        toast.error('자료 목록을 불러오는데 실패했습니다', {
          duration: 2000,
          position: 'top-right'
        })
      } finally {
        setLoading(false)
      }
    }

    loadConversions()
  }, [currentPage])

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(1, prev - 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleTogglePublic = (materialId: string) => {
    setMaterials((prev) =>
      prev.map((material) =>
        material.id === materialId
          ? { ...material, isPublic: !material.isPublic }
          : material
      )
    )
  }

  const handleStartLesson = (materialId: string, title: string) => {
    console.log("수업 시작:", title, "ID:", materialId)
    navigate(`/teaching-session/${materialId}`)
  }

  const handleShare = (materialId: string, title: string) => {
    console.log("공유:", title)
    const shareUrl = `${window.location.origin}/share/material/${materialId}`
    navigator.clipboard.writeText(shareUrl)
    alert("공유 링크가 복사되었습니다!")
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4">
        <div className="container mx-auto max-w-7xl space-y-8">
          {/* 헤더 */}
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold tracking-tight">수업 자료 관리</h1>
            <p className="text-muted-foreground">
              생성된 수업 자료를 확인하고 관리할 수 있습니다
            </p>
          </div>

          {/* 로딩 상태 */}
          {loading ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center space-y-4">
                <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
                <p className="text-muted-foreground">자료 목록을 불러오는 중...</p>
              </div>
            </div>
          ) : materials.length === 0 ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center space-y-4">
                <p className="text-xl text-muted-foreground">생성된 수업 자료가 없습니다</p>
                <Button onClick={() => navigate('/generate-v2/upload')}>
                  새 자료 생성하기
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* 교안 그리드 (3열 x 4행 = 12개) */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {materials.map((material) => (
                  <div key={material.id} className="transform transition-transform hover:scale-[1.02]">
                    <TeachingMaterialCard
                      {...material}
                      onStartLesson={() => handleStartLesson(material.id, material.title)}
                      onShare={() => handleShare(material.id, material.title)}
                      onTogglePublic={() => handleTogglePublic(material.id)}
                    />
                  </div>
                ))}
              </div>
            </>
          )}

          {/* 페이지네이션 */}
          {!loading && materials.length > 0 && totalPages > 1 && (
            <>
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
                    let page: number
                    if (totalPages <= 10) {
                      page = i + 1
                    } else if (currentPage <= 5) {
                      page = i + 1
                    } else if (currentPage >= totalPages - 4) {
                      page = totalPages - 9 + i
                    } else {
                      page = currentPage - 4 + i
                    }
                    return (
                      <button
                        key={page}
                        onClick={() => {
                          setCurrentPage(page)
                          window.scrollTo({ top: 0, behavior: 'smooth' })
                        }}
                        className={`w-10 h-10 rounded-lg transition-all ${
                          page === currentPage
                            ? "bg-primary text-primary-foreground font-semibold"
                            : "bg-white hover:bg-gray-100 text-gray-700"
                        }`}
                      >
                        {page}
                      </button>
                    )
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

              {/* 카운터 */}
              <div className="text-center text-sm text-muted-foreground">
                총 {totalItems}개 | {currentPage} / {totalPages} 페이지
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  )
}
