import { Share2, Lock, Globe, Play, Eye, ThumbsUp, Trash2, Edit } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// 자료 타입별 아이콘 매핑
const MaterialTypeIcon = {
  teacher_ppt: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-blue-600">
      <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="2"/>
      <path d="M3 8h18M8 4v4M16 4v4" stroke="currentColor" strokeWidth="2"/>
      <text x="12" y="16" fontSize="8" textAnchor="middle" fill="currentColor" fontWeight="bold">PPT</text>
    </svg>
  ),
  student_worksheet: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-green-600">
      <rect x="4" y="2" width="16" height="20" rx="2" stroke="currentColor" strokeWidth="2"/>
      <path d="M8 7h8M8 11h8M8 15h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="17" cy="17" r="2" fill="currentColor"/>
    </svg>
  ),
  teacher_answer: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-orange-600">
      <rect x="4" y="2" width="16" height="20" rx="2" stroke="currentColor" strokeWidth="2"/>
      <path d="M8 7h8M8 11h8M8 15h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M9 16l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
}

interface TeachingMaterialCardProps {
  // 자료 종류
  materialType: 'teacher_ppt' | 'student_worksheet' | 'teacher_answer'

  // 기본 정보
  createdAt: string
  publisher: string // 출판사 (예: "22교육과정", "동아출판", "박성선")

  // 제목 정보
  grade: string // 학년 (예: "4학년")
  semester: string // 학기 (예: "1학기")
  subject: string // 과목 (예: "과학")
  unit: string // 단원 (예: "1단원")
  lesson: string // 차시 (예: "1-2차시")
  title: string // 템플릿 이름 (예: "도전 골든벨")

  // 미리보기
  previewImage?: string

  // 태그
  recommendedSubjects?: string[] // 추천과목 (국어, 수학, 사회, 과학, 통합교과, 영어)
  teachingStyle?: string[] // 수업 스타일 (교과서 중심 수업, 의사소통 및 협력, 프로젝트 기반, 만들기 및 제작, 게임 기반)
  activityType?: string[] // 활동 형태
  competencies?: string[] // 역량
  otherTags?: string[] // 그 외

  // 통계
  usageCount: number // 이 수업자료 활용 횟수
  templateUsageCount: number // 전체 템플릿 활용 횟수
  likesCount: number // 좋아요 횟수
  viewCount: number // 조회 횟수

  // 공개 여부
  isPublic: boolean

  // 콜백
  onStartLesson?: () => void
  onShare?: () => void
  onTogglePublic?: () => void
  onDelete?: () => void
  onEdit?: () => void

  // 커스터마이징
  startButtonText?: string // 시작 버튼 텍스트 (기본값: "수업 시작하기")
}

export function TeachingMaterialCard({
  materialType,
  createdAt,
  publisher,
  grade,
  semester,
  subject,
  unit,
  lesson,
  title,
  previewImage,
  recommendedSubjects = [],
  teachingStyle = [],
  activityType = [],
  competencies = [],
  otherTags = [],
  usageCount,
  templateUsageCount,
  likesCount,
  viewCount,
  isPublic,
  onStartLesson,
  onShare,
  onTogglePublic,
  onDelete,
  onEdit,
  startButtonText = "수업 시작하기",
}: TeachingMaterialCardProps) {

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return `${date.getFullYear()}. ${date.getMonth() + 1}. ${date.getDate()}.`
  }

  const getMaterialTypeLabel = () => {
    switch (materialType) {
      case 'teacher_ppt':
        return '교사용 피피티'
      case 'student_worksheet':
        return '학생용 활동지'
      case 'teacher_answer':
        return '교사용 정답지'
    }
  }

  return (
    <Card className="max-w-4xl mx-auto overflow-hidden">
      <CardContent className="p-8 space-y-6">
        {/* 상단: 자료 종류 아이콘 & 생성 일시 */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {MaterialTypeIcon[materialType]}
            <span className="text-sm font-medium text-muted-foreground">
              {getMaterialTypeLabel()}
            </span>
          </div>
          <time className="text-sm text-muted-foreground">
            {formatDate(createdAt)}
          </time>
        </div>

        {/* 출판사/교육과정 태그 */}
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="rounded-full bg-green-100 text-green-700 hover:bg-green-100">
            {publisher}
          </Badge>
        </div>

        {/* 제목 영역 */}
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {grade} {semester} {unit} {lesson}
          </p>
          <h2 className="text-3xl font-bold tracking-tight">
            {title}
          </h2>
        </div>

        {/* 자료 미리보기 */}
        <div className="relative bg-gray-100 rounded-lg aspect-video flex items-center justify-center overflow-hidden">
          {previewImage ? (
            <img
              src={previewImage}
              alt={title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-center space-y-3">
              <div className="w-16 h-16 mx-auto text-gray-400">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="2"/>
                  <path d="M9 9h6M9 13h6" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <p className="text-sm text-gray-500">자료 미리보기</p>
            </div>
          )}
        </div>

        {/* 태그 섹션 */}
        <div className="space-y-3">
          {recommendedSubjects.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground min-w-[100px]">
                추천과목
              </span>
              <div className="flex flex-wrap gap-2">
                {recommendedSubjects.map((tag, index) => (
                  <Badge key={index} variant="outline" className="rounded-md">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {teachingStyle.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground min-w-[100px]">
                수업 스타일
              </span>
              <div className="flex flex-wrap gap-2">
                {teachingStyle.map((tag, index) => (
                  <Badge key={index} variant="outline" className="rounded-md">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {activityType.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground min-w-[100px]">
                활동 형태
              </span>
              <div className="flex flex-wrap gap-2">
                {activityType.map((tag, index) => (
                  <Badge key={index} variant="outline" className="rounded-md">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {competencies.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground min-w-[100px]">
                역량
              </span>
              <div className="flex flex-wrap gap-2">
                {competencies.map((tag, index) => (
                  <Badge key={index} variant="outline" className="rounded-md">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {otherTags.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground min-w-[100px]">
                그 외
              </span>
              <div className="flex flex-wrap gap-2">
                {otherTags.map((tag, index) => (
                  <Badge key={index} variant="outline" className="rounded-md">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 통계 */}
        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Play className="w-4 h-4" />
            <span>{usageCount}</span>
          </div>
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4" />
            <span>{templateUsageCount}</span>
          </div>
          <div className="flex items-center gap-2">
            <ThumbsUp className="w-4 h-4" />
            <span>{likesCount}</span>
          </div>
        </div>

        {/* 공개 여부 버튼 */}
        <div className="flex items-center gap-2">
          <Button
            variant={isPublic ? "outline" : "secondary"}
            size="sm"
            onClick={onTogglePublic}
            className={cn(
              "gap-2",
              !isPublic && "bg-gray-900 text-white hover:bg-gray-800"
            )}
          >
            <Lock className="w-4 h-4" />
            나만 보기
          </Button>
          {isPublic && (
            <Button
              variant="outline"
              size="sm"
              onClick={onTogglePublic}
              className="gap-2"
            >
              <Globe className="w-4 h-4" />
              마켓에 공개
            </Button>
          )}
        </div>

        {/* 하단 버튼 */}
        <div className="flex gap-2 sm:gap-3 pt-4">
          <Button
            onClick={onStartLesson}
            size="lg"
            className="flex-1 bg-gradient-to-r from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600 text-white gap-1 sm:gap-2 h-10 sm:h-12 md:h-14 text-sm sm:text-base md:text-lg font-semibold px-2 sm:px-4"
          >
            <Play className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden xs:inline">{startButtonText}</span>
            <span className="xs:hidden">시작</span>
          </Button>
          {onEdit && (
            <Button
              onClick={onEdit}
              variant="outline"
              size="lg"
              className="gap-1 sm:gap-2 h-10 sm:h-12 md:h-14 px-3 sm:px-4 md:px-6"
            >
              <Edit className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
          )}
          <Button
            onClick={onShare}
            variant="outline"
            size="lg"
            className="gap-1 sm:gap-2 h-10 sm:h-12 md:h-14 px-3 sm:px-4 md:px-6"
          >
            <Share2 className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
          {onDelete && (
            <Button
              onClick={onDelete}
              variant="outline"
              size="lg"
              className="gap-1 sm:gap-2 h-10 sm:h-12 md:h-14 px-3 sm:px-4 md:px-6 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
            >
              <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
