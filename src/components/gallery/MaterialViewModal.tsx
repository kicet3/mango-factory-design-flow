import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Play, Sparkles, Share2, Copy, Check } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"

interface MaterialViewModalProps {
  isOpen: boolean
  onClose: () => void
  material: {
    id: string
    title: string
    subtitle: string // 부제목 (예: "4학년 1학기 과학 1단원 1-2차시")
    description?: string
    publisher?: string
    tags?: string[]
  }
}

export function MaterialViewModal({
  isOpen,
  onClose,
  material,
}: MaterialViewModalProps) {
  const [copied, setCopied] = useState(false)
  const [reviewText, setReviewText] = useState("")

  const shareUrl = `${window.location.origin}/gallery/material/${material.id}`

  const handleStartLesson = () => {
    console.log("프레젠테이션 모드 시작:", material.id)
    // TODO: 프레젠테이션 모드로 이동
    toast.success("프레젠테이션 모드를 시작합니다")
  }

  const handleCreateWithTemplate = () => {
    console.log("망고팩토리로 생성하기:", material.id)
    // TODO: 망고팩토리로 이동하면서 템플릿 선택된 상태로
    toast.success("이 템플릿으로 새 수업자료를 만들 수 있습니다")
  }

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      toast.success("링크가 복사되었습니다")
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error("Failed to copy:", error)
      toast.error("링크 복사에 실패했습니다")
    }
  }

  const handleSubmitReview = () => {
    if (!reviewText.trim()) {
      toast.error("후기를 입력해주세요")
      return
    }
    console.log("후기 등록:", reviewText)
    // TODO: 후기 등록 API 호출
    toast.success("후기가 등록되었습니다")
    setReviewText("")
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-4">
          {/* 부제목 + 제목 */}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {material.subtitle}
            </p>
            <h2 className="text-3xl font-bold tracking-tight">
              {material.title}
            </h2>
            {material.publisher && (
              <Badge variant="secondary" className="mt-2">
                {material.publisher}
              </Badge>
            )}
          </div>

          {/* 버튼 그룹 */}
          <div className="flex flex-wrap gap-3 pt-4">
            <Button
              onClick={handleStartLesson}
              size="lg"
              className="flex-1 min-w-[180px] bg-gradient-to-r from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600 text-white gap-2"
            >
              <Play className="w-5 h-5" />
              수업 시작하기
            </Button>

            <Button
              onClick={handleCreateWithTemplate}
              size="lg"
              variant="outline"
              className="flex-1 min-w-[180px] gap-2 group relative"
              title="이 활동 템플릿으로 새 수업자료를 만들어보세요!"
            >
              <Sparkles className="w-5 h-5" />
              망고팩토리로 생성하기

              {/* Hover 툴팁 */}
              <span className="absolute -top-12 left-1/2 -translate-x-1/2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                이 활동 템플릿으로 새 수업자료를 만들어보세요!
                <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-gray-900"></span>
              </span>
            </Button>
          </div>

          {/* 공유하기 섹션 */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Share2 className="w-4 h-4" />
              공유하기
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={shareUrl}
                readOnly
                className="flex-1 px-3 py-2 text-sm border rounded-md bg-muted/50 cursor-text"
                onClick={(e) => e.currentTarget.select()}
              />
              <Button
                onClick={handleCopyUrl}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    복사됨
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    복사
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogHeader>

        <Separator className="my-6" />

        {/* 탭 섹션 */}
        <Tabs defaultValue="description" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="description">자료 설명</TabsTrigger>
            <TabsTrigger value="reviews">후기 및 수업팁</TabsTrigger>
          </TabsList>

          <TabsContent value="description" className="space-y-4 mt-6">
            <div className="prose prose-sm max-w-none">
              {material.description ? (
                <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {material.description}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <p>등록된 설명이 없습니다</p>
                </div>
              )}
            </div>

            {/* 태그 */}
            {material.tags && material.tags.length > 0 && (
              <div className="space-y-2 pt-4">
                <h4 className="text-sm font-semibold">태그</h4>
                <div className="flex flex-wrap gap-2">
                  {material.tags.map((tag, index) => (
                    <Badge key={index} variant="outline">
                      #{tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="reviews" className="space-y-6 mt-6">
            {/* 후기 작성 */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold">수업팁 및 후기 남기기</h4>
              <Textarea
                placeholder="이 수업자료를 사용한 경험과 팁을 공유해주세요!"
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                className="min-h-[120px]"
              />
              <div className="flex justify-end">
                <Button onClick={handleSubmitReview} className="gap-2">
                  후기 등록
                </Button>
              </div>
            </div>

            <Separator />

            {/* 후기 목록 */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold">다른 선생님들의 후기</h4>

              {/* TODO: 실제 후기 데이터로 교체 */}
              <div className="text-center py-12 text-muted-foreground">
                <p>아직 등록된 후기가 없습니다</p>
                <p className="text-sm mt-2">첫 번째 후기를 남겨주세요!</p>
              </div>

              {/* 후기 예시 (실제 데이터 연동 시 사용) */}
              {/* <div className="space-y-4">
                <div className="p-4 border rounded-lg space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-semibold">김</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">김선생님</p>
                      <p className="text-xs text-muted-foreground">2025.10.03</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    학생들이 정말 좋아했어요! 골든벨 형식이라 집중도가 높았습니다.
                  </p>
                </div>
              </div> */}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
