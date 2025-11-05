// GenerateV2Materials - 수업 자료 관리 페이지
import { useState } from "react"
import { Layout } from "@/components/layout/Layout"
import { TeachingMaterialCard } from "@/components/generate-v2/TeachingMaterialCard"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useNavigate } from "react-router-dom"

// 예시 데이터 생성 (12개 이상)
const generateExampleMaterials = () => {
  const materials = []
  const types = ["teacher_ppt", "student_worksheet", "teacher_answer"] as const
  const publishers = ["22교육과정", "동아출판", "박성선", "천재교육", "비상교육"]
  const subjects = ["과학", "수학", "국어", "영어", "사회", "미술"]
  const titles = [
    "도전 골든벨", "분수의 덧셈과 뺄셈", "토론과 논증", "식물의 한살이",
    "도형의 넓이", "문학의 이해", "현재진행형", "우리나라의 역사",
    "색채의 원리", "물질의 상태", "비와 비율", "설명문 쓰기",
    "과거시제", "지도와 지구본", "입체 작품 만들기", "에너지와 생활"
  ]

  for (let i = 0; i < 16; i++) {
    materials.push({
      id: `${i + 1}`,
      materialType: types[i % 3],
      createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
      publisher: publishers[i % publishers.length],
      grade: `${(i % 6) + 1}학년`,
      semester: `${(i % 2) + 1}학기`,
      subject: subjects[i % subjects.length],
      unit: `${(i % 5) + 1}단원`,
      lesson: `${(i % 3) + 1}-${(i % 3) + 2}차시`,
      title: titles[i % titles.length],
      previewImage: undefined,
      teachingStyle: ["산호 스터디 협동", "개별 학습", "토론 중심"][i % 3] ? [["산호 스터디 협동", "개별 학습", "토론 중심"][i % 3]] : [],
      activityType: ["개별활동", "모둠활동", "전체활동"][i % 3] ? [["개별활동", "모둠활동", "전체활동"][i % 3]] : [],
      competencies: i % 2 === 0 ? ["문제해결력", "창의적 사고"] : ["의사소통", "비판적 사고"],
      otherTags: i % 3 === 0 ? ["심화학습"] : [],
      usageCount: Math.floor(Math.random() * 150) + 50,
      templateUsageCount: Math.floor(Math.random() * 300) + 100,
      likesCount: Math.floor(Math.random() * 100) + 20,
      viewCount: Math.floor(Math.random() * 1000) + 200,
      isPublic: i % 2 === 0,
    })
  }
  return materials
}

const ITEMS_PER_PAGE = 12

export default function GenerateV2Materials() {
  const navigate = useNavigate()
  const [materials, setMaterials] = useState(generateExampleMaterials())
  const [currentPage, setCurrentPage] = useState(1)

  const totalPages = Math.ceil(materials.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const currentMaterials = materials.slice(startIndex, endIndex)

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
    console.log("수업 시작:", title)
    navigate('/teaching-plan-viewer', { state: { materialId } })
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

          {/* 교안 그리드 (3열 x 4행 = 12개) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {currentMaterials.map((material) => (
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

          {/* 페이지네이션 */}
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

          {/* 카운터 */}
          <div className="text-center text-sm text-muted-foreground">
            총 {materials.length}개 | {currentPage} / {totalPages} 페이지
          </div>
        </div>
      </div>
    </Layout>
  )
}
