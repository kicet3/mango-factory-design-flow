// GenerateV2Materials - 수업 자료 관리 페이지
import { useState, useEffect } from "react"
import { Layout } from "@/components/layout/Layout"
import { TeachingMaterialCard } from "@/components/generate-v2/TeachingMaterialCard"
import { GenerateMaterialDialog } from "@/components/generate-v2/GenerateMaterialDialog"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Loader2, Plus } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { fetchMaterials, deleteMaterial, type MaterialSummary } from "@/services/conversions"
import { toast } from "sonner"
import { supabase } from "@/integrations/supabase/client"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

const ITEMS_PER_PAGE = 12

// 난이도 한글 변환
const difficultyMap: Record<string, string> = {
  'easy': '쉬움',
  'medium': '보통',
  'hard': '어려움'
}

// API 데이터를 TeachingMaterialCard props로 변환
const convertToMaterialCard = (material: MaterialSummary) => ({
  id: material.material_id.toString(),
  materialType: 'teacher_ppt' as const,
  createdAt: material.created_at,
  publisher: material.gpt_model, // GPT 모델을 출판사 위치에 표시
  grade: material.grade_level || "정보 없음",
  semester: "정보 없음", // API에 없는 정보
  subject: material.subject_name,
  unit: material.topic,
  lesson: material.content_name || "정보 없음", // content_name을 lesson에 표시
  title: material.material_name,
  previewImage: undefined, // API에 없는 정보
  teachingStyle: material.lesson_style || [], // API의 lesson_style 사용
  activityType: material.activity_type || [], // API의 activity_type 사용
  competencies: material.competency || [], // API의 competency 사용
  otherTags: [
    difficultyMap[material.difficulty] || material.difficulty,
    `${material.num_items_generated}개 아이템`,
    material.class_duration_minutes ? `${material.class_duration_minutes}분` : null
  ].filter(Boolean),
  usageCount: 0, // API에 없는 정보
  templateUsageCount: material.num_items_generated,
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
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [materialToDelete, setMaterialToDelete] = useState<{ id: string; title: string } | null>(null)

  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE)

  // API 데이터 가져오기
  useEffect(() => {
    const loadMaterials = async () => {
      setLoading(true)
      try {
        // Get auth token
        const { data: { session } } = await supabase.auth.getSession()
        const accessToken = session?.access_token

        const response = await fetchMaterials({
          limit: ITEMS_PER_PAGE,
          offset: (currentPage - 1) * ITEMS_PER_PAGE,
          order_by: 'created_at',
          order_dir: 'DESC'
        }, accessToken)

        const convertedMaterials = response.materials.map(convertToMaterialCard)
        setMaterials(convertedMaterials)
        setTotalItems(response.total)
      } catch (error) {
        console.error('Failed to fetch materials:', error)
        toast.error('자료 목록을 불러오는데 실패했습니다', {
          duration: 2000,
          position: 'top-right'
        })
      } finally {
        setLoading(false)
      }
    }

    loadMaterials()
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

  const handleGenerateSuccess = () => {
    // Reload materials to show updated data
    const loadMaterials = async () => {
      setLoading(true)
      try {
        // Get auth token
        const { data: { session } } = await supabase.auth.getSession()
        const accessToken = session?.access_token

        const response = await fetchMaterials({
          limit: ITEMS_PER_PAGE,
          offset: (currentPage - 1) * ITEMS_PER_PAGE,
          order_by: 'created_at',
          order_dir: 'DESC'
        }, accessToken)

        const convertedMaterials = response.materials.map(convertToMaterialCard)
        setMaterials(convertedMaterials)
        setTotalItems(response.total)
      } catch (error) {
        console.error('Failed to fetch materials:', error)
      } finally {
        setLoading(false)
      }
    }
    loadMaterials()
  }

  const handleDeleteClick = (materialId: string, title: string) => {
    setMaterialToDelete({ id: materialId, title })
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!materialToDelete) return

    try {
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token

      // Call delete API
      await deleteMaterial(parseInt(materialToDelete.id), accessToken)

      toast.success('자료가 삭제되었습니다', {
        duration: 2000,
        position: 'top-right'
      })

      // Reload materials list
      setLoading(true)
      const response = await fetchMaterials({
        limit: ITEMS_PER_PAGE,
        offset: (currentPage - 1) * ITEMS_PER_PAGE,
        order_by: 'created_at',
        order_dir: 'DESC'
      }, accessToken)
      const convertedMaterials = response.materials.map(convertToMaterialCard)
      setMaterials(convertedMaterials)
      setTotalItems(response.total)
      setLoading(false)

      // Close dialog
      setDeleteDialogOpen(false)
      setMaterialToDelete(null)
    } catch (error) {
      console.error('Failed to delete material:', error)
      toast.error('자료 삭제에 실패했습니다', {
        duration: 2000,
        position: 'top-right'
      })
    }
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4">
        <div className="container mx-auto max-w-7xl space-y-8">
          {/* 헤더 */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold tracking-tight">수업 자료 관리</h1>
            <p className="text-muted-foreground">
              생성된 수업 자료를 확인하고 관리할 수 있습니다
            </p>
            <div className="flex justify-center">
              <Button
                onClick={() => setDialogOpen(true)}
                size="lg"
                className="gap-2"
              >
                <Plus className="w-5 h-5" />
                새 자료 생성하기
              </Button>
            </div>
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
              {/* 교안 그리드 (반응형: 1~4열) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                {materials.map((material) => (
                  <div key={material.id} className="transform transition-transform hover:scale-[1.02]">
                    <TeachingMaterialCard
                      {...material}
                      onStartLesson={() => handleStartLesson(material.id, material.title)}
                      onShare={() => handleShare(material.id, material.title)}
                      onTogglePublic={() => handleTogglePublic(material.id)}
                      onDelete={() => handleDeleteClick(material.id, material.title)}
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

      {/* 자료 생성 다이얼로그 */}
      <GenerateMaterialDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={handleGenerateSuccess}
      />

      {/* 자료 삭제 확인 다이얼로그 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>자료 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              "{materialToDelete?.title}" 자료를 정말 삭제하시겠습니까?
              <br />
              이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setMaterialToDelete(null)}>
              취소
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  )
}
