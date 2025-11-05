import { useState } from "react"
import { TeachingMaterialCard } from "@/components/generate-v2/TeachingMaterialCard"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"

// 예시 데이터
const exampleMaterials = [
  {
    id: "1",
    materialType: "teacher_ppt" as const,
    createdAt: "2025-10-04",
    publisher: "22교육과정",
    grade: "4학년",
    semester: "1학기",
    subject: "과학",
    unit: "1단원",
    lesson: "1-2차시",
    title: "도전 골든벨",
    previewImage: undefined,
    teachingStyle: ["산호 스터디 협동"],
    activityType: ["개별활동"],
    competencies: [],
    otherTags: [],
    usageCount: 89,
    templateUsageCount: 156,
    likesCount: 42,
    viewCount: 523,
    isPublic: false,
  },
  {
    id: "2",
    materialType: "student_worksheet" as const,
    createdAt: "2025-10-03",
    publisher: "동아출판",
    grade: "5학년",
    semester: "2학기",
    subject: "수학",
    unit: "2단원",
    lesson: "3-4차시",
    title: "분수의 덧셈과 뺄셈",
    previewImage: undefined,
    teachingStyle: ["개별 학습"],
    activityType: ["모둠활동"],
    competencies: ["문제해결력", "창의적 사고"],
    otherTags: ["심화학습"],
    usageCount: 124,
    templateUsageCount: 287,
    likesCount: 78,
    viewCount: 892,
    isPublic: true,
  },
  {
    id: "3",
    materialType: "teacher_answer" as const,
    createdAt: "2025-10-02",
    publisher: "박성선",
    grade: "6학년",
    semester: "1학기",
    subject: "국어",
    unit: "3단원",
    lesson: "5-6차시",
    title: "토론과 논증",
    previewImage: undefined,
    teachingStyle: ["토론 중심"],
    activityType: ["전체활동"],
    competencies: ["의사소통", "비판적 사고"],
    otherTags: ["디베이트"],
    usageCount: 67,
    templateUsageCount: 145,
    likesCount: 34,
    viewCount: 421,
    isPublic: false,
  },
]

export default function TeachingMaterialsExample() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [materials, setMaterials] = useState(exampleMaterials)

  const currentMaterial = materials[currentIndex]

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : materials.length - 1))
  }

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < materials.length - 1 ? prev + 1 : 0))
  }

  const handleTogglePublic = () => {
    setMaterials((prev) =>
      prev.map((material, index) =>
        index === currentIndex
          ? { ...material, isPublic: !material.isPublic }
          : material
      )
    )
  }

  const handleStartLesson = () => {
    console.log("수업 시작:", currentMaterial.title)
    // TODO: 수업 시작 로직 구현
  }

  const handleShare = () => {
    console.log("공유:", currentMaterial.title)
    // TODO: URL 공유 로직 구현
  }

  const handlePrint = () => {
    console.log("인쇄:", currentMaterial.title)
    // TODO: 인쇄 로직 구현
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4">
      <div className="container mx-auto max-w-5xl space-y-8">
        {/* 헤더 */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">교안 관리</h1>
          <p className="text-muted-foreground">
            생성된 교안을 확인하고 관리할 수 있습니다
          </p>
        </div>

        {/* 페이지 인디케이터 */}
        <div className="flex items-center justify-center gap-2">
          {materials.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`h-2 rounded-full transition-all ${
                index === currentIndex
                  ? "w-8 bg-primary"
                  : "w-2 bg-gray-300 hover:bg-gray-400"
              }`}
              aria-label={`자료 ${index + 1}로 이동`}
            />
          ))}
        </div>

        {/* 교안 카드 */}
        <div className="relative">
          <TeachingMaterialCard
            {...currentMaterial}
            onStartLesson={handleStartLesson}
            onShare={handleShare}
            onPrint={handlePrint}
            onTogglePublic={handleTogglePublic}
          />

          {/* 네비게이션 버튼 */}
          {materials.length > 1 && (
            <>
              <Button
                variant="outline"
                size="icon"
                onClick={handlePrevious}
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-16 rounded-full w-12 h-12 shadow-lg bg-white hover:bg-gray-50"
              >
                <ChevronLeft className="w-6 h-6" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleNext}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-16 rounded-full w-12 h-12 shadow-lg bg-white hover:bg-gray-50"
              >
                <ChevronRight className="w-6 h-6" />
              </Button>
            </>
          )}
        </div>

        {/* 카운터 */}
        <div className="text-center text-sm text-muted-foreground">
          {currentIndex + 1} / {materials.length}
        </div>
      </div>
    </div>
  )
}
