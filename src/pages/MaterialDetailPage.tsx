import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Layout } from "@/components/layout/Layout"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Play, Sparkles, Share2, Copy, Check, ArrowLeft } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { supabase } from "@/integrations/supabase/client"

interface MaterialDetail {
  raw_generation_format_id: number
  generation_format_name: string
  generation_format_desc: string
  gallery_desc: string
  created_at: string
  can_share: boolean
  course_types: Array<{ course_type_name: string }>
  tags: Array<{ tag_name: string }>
}

export default function MaterialDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [material, setMaterial] = useState<MaterialDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [reviewText, setReviewText] = useState("")

  const shareUrl = `${window.location.origin}/gallery/material/${id}`

  useEffect(() => {
    if (id) {
      fetchMaterialDetail(id)
    }
  }, [id])

  const fetchMaterialDetail = async (materialId: string) => {
    try {
      setLoading(true)
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
        .eq('raw_generation_format_id', parseInt(materialId))
        .single()

      if (error) throw error

      setMaterial({
        raw_generation_format_id: data.raw_generation_format_id,
        generation_format_name: data.generation_format_name,
        generation_format_desc: data.generation_format_desc,
        gallery_desc: data.gallery_desc,
        created_at: data.created_at,
        can_share: data.can_share,
        course_types: data.raw_generation_format_course_type_map?.map((ct: any) => ({
          course_type_name: ct.course_types?.course_type_name || ""
        })) || [],
        tags: data.raw_generation_format_tag_map?.map((tag: any) => ({
          tag_name: tag.tags?.tag_name || ""
        })) || [],
      })
    } catch (error) {
      console.error('Error fetching material:', error)
      toast.error('자료를 불러오는데 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const handleStartLesson = () => {
    console.log("프레젠테이션 모드 시작:", id)
    // TODO: 프레젠테이션 모드로 이동
    toast.success("프레젠테이션 모드를 시작합니다")
  }

  const handleCreateWithTemplate = () => {
    console.log("망고팩토리로 생성하기:", id)
    // TODO: 망고팩토리로 이동하면서 템플릿 선택된 상태로
    navigate('/generate-v2/generate', { state: { selectedTemplateId: id } })
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

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground">자료를 불러오는 중...</p>
          </div>
        </div>
      </Layout>
    )
  }

  if (!material) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">자료를 찾을 수 없습니다</p>
            <Button onClick={() => navigate('/gallery')}>갤러리로 돌아가기</Button>
          </div>
        </div>
      </Layout>
    )
  }

  const subtitle = material.course_types.map(ct => ct.course_type_name).join(", ")

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4">
        <div className="container mx-auto max-w-4xl space-y-8">
          {/* 뒤로가기 버튼 */}
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            뒤로가기
          </Button>

          {/* 메인 콘텐츠 카드 */}
          <div className="bg-white rounded-lg shadow-sm p-8 space-y-6">
            {/* 부제목 + 제목 */}
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {subtitle}
              </p>
              <h1 className="text-4xl font-bold tracking-tight">
                {material.generation_format_name}
              </h1>
              {material.course_types[0] && (
                <Badge variant="secondary" className="mt-2">
                  {material.course_types[0].course_type_name}
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
                <span className="absolute -top-12 left-1/2 -translate-x-1/2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
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

            <Separator className="my-6" />

            {/* 자료 카드 정보 */}
            <div className="space-y-4 p-6 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border-l-4 border-purple-500">
              <div className="flex items-center gap-2 text-lg font-semibold">
                <span>📋</span>
                <h3>자료 카드 정보</h3>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">학년</span>
                    <span className="font-medium">4학년</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">학기</span>
                    <span className="font-medium">1학기</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">과목</span>
                    <span className="font-medium">수학</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">출판사</span>
                    <span className="font-medium">교학사</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-muted-foreground">단원</span>
                    <span className="font-medium">1단원</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">차시</span>
                    <span className="font-medium">2차시</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">소요시간</span>
                    <span className="font-medium">40분</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">난이도</span>
                    <span className="font-medium">중</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">활동형태</span>
                    <span className="font-medium">모둠활동</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-muted-foreground">추천 참여학생수</span>
                    <span className="font-medium">4-6명</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 만든 사람들 */}
            <div className="space-y-4 p-6 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border-l-4 border-yellow-500">
              <div className="flex items-center gap-2 text-lg font-semibold">
                <span>👥</span>
                <h3>만든 사람들</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">수업자료 생성자</p>
                  <p className="font-medium">김선생님</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">망고씨앗 생성자</p>
                  <p className="font-medium">박선생님(활동 템플릿) · 이선생님(디자인 템플릿) · 최선생님(디자인 템플릿)</p>
                </div>
              </div>
            </div>

            {/* 자료 설명 */}
            <div className="space-y-4 p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border-l-4 border-green-500">
              <div className="flex items-center gap-2 text-lg font-semibold">
                <span>📝</span>
                <h3>자료 설명</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                {material.gallery_desc || material.generation_format_desc || "구체물을 사용하여 만 단위를 체험하는 활동입니다."}
              </p>
            </div>

            {/* 자료 구성 */}
            <div className="space-y-4 p-6 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border-l-4 border-blue-500">
              <div className="flex items-center gap-2 text-lg font-semibold">
                <span>📦</span>
                <h3>자료 구성</h3>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• 교사용 PPT (15 슬라이드)</li>
                <li>• 학생용 활동지 (2 페이지)</li>
                <li>• 교사용 지도안 (1 페이지)</li>
              </ul>
            </div>

            <Separator className="my-6" />

            {/* 후기 및 수업팁 섹션 */}
            <div className="space-y-4 p-6 bg-white rounded-lg border">
              <div className="flex items-center gap-2 text-lg font-semibold">
                <span>💬</span>
                <h3>후기 및 활용팁 (32개)</h3>
              </div>

              <div className="space-y-6 mt-6">
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
                  {/* 후기 예시 데이터 */}
                  <div className="space-y-4">
                    <div className="p-4 border rounded-lg space-y-3 bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-sm font-semibold text-blue-700">김</span>
                          </div>
                          <div>
                            <p className="text-sm font-medium">김선생님</p>
                            <p className="text-xs text-muted-foreground">2025. 10. 3.</p>
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        학생들이 정말 좋아하는 활동입니다! 수업 분위기가 활기차지고 모든 학생들이 적극적으로 참여했어요.
                      </p>
                      <div className="flex gap-2">
                        <Badge variant="outline" className="text-xs">개인 학습</Badge>
                        <Badge variant="outline" className="text-xs">참여도 높음</Badge>
                      </div>
                    </div>

                    <div className="p-4 border rounded-lg space-y-3 bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                            <span className="text-sm font-semibold text-green-700">박</span>
                          </div>
                          <div>
                            <p className="text-sm font-medium">박선생님</p>
                            <p className="text-xs text-muted-foreground">2025. 10. 1.</p>
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        준비가 간편하고 효과는 확실합니다. 다양한 과목에 활용할 수 있어서 자주 사용하고 있어요.
                      </p>
                      <div className="flex gap-2">
                        <Badge variant="outline" className="text-xs">준비 간편</Badge>
                      </div>
                    </div>

                    <div className="p-4 border rounded-lg space-y-3 bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                            <span className="text-sm font-semibold text-purple-700">이</span>
                          </div>
                          <div>
                            <p className="text-sm font-medium">이선생님</p>
                            <p className="text-xs text-muted-foreground">2025. 9. 28.</p>
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        특히 저학년에게 효과적입니다. 규칙이 간단해서 쉽게 이해하고, 반복 학습 효과도 뛰어나요!
                      </p>
                      <div className="flex gap-2">
                        <Badge variant="outline" className="text-xs">저학년 추천</Badge>
                        <Badge variant="outline" className="text-xs">반복 학습</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
