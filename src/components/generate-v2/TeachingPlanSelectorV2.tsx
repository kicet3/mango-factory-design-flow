// TeachingPlanSelectorV2 - 교안 선택 (수업 활동 선택 스타일)
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FileText, Search, CheckCircle, Sparkles, Plus, Trash2, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { fetchConversions, generateMaterials, type ConversionSummary, type SubjectData } from "@/services/conversions"
import type { CourseData, TeachingPlanData } from "@/pages/GenerateV2Main"
import { useAuth } from "@/hooks/use-auth"
import { supabase } from "@/integrations/supabase/client"
import { useNavigate } from "react-router-dom"

interface TeachingPlanSelectorV2Props {
  onSelect: (data: TeachingPlanData) => void
  courseData: CourseData
}

interface TeachingPlan {
  teaching_plan_id: number
  teaching_plan_name: string
  teaching_plan_description: string
  teaching_plan_format: any
  course_type_id?: number
  created_at?: string
  // Conversion 데이터 매핑
  total_slides?: number
  framework?: string
  styling?: string
}

interface Example {
  question: string
  answer: string
}

export function TeachingPlanSelectorV2({ onSelect, courseData }: TeachingPlanSelectorV2Props) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [teachingPlans, setTeachingPlans] = useState<TeachingPlan[]>([])
  const [filteredPlans, setFilteredPlans] = useState<TeachingPlan[]>([])
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  // 교과목 데이터 폼
  const [showSubjectForm, setShowSubjectForm] = useState(false)
  const [subjectName, setSubjectName] = useState(courseData.course_type_name || "")
  const [topic, setTopic] = useState(courseData.description || "")
  const [difficulty, setDifficulty] = useState<string>(
    courseData.difficulty_id === 1 ? "easy" :
    courseData.difficulty_id === 3 ? "hard" :
    "medium"
  )
  const [learningGoals, setLearningGoals] = useState<string[]>(
    courseData.additional_message ? [courseData.additional_message] : [""]
  )
  const [examples, setExamples] = useState<Example[]>([{ question: "", answer: "" }])
  const [classDuration, setClassDuration] = useState<number>(courseData.expected_duration_min || 45)
  const [numItems, setNumItems] = useState<number>(5)

  useEffect(() => {
    loadTeachingPlans()
  }, [courseData.course_type_id])

  useEffect(() => {
    if (searchQuery) {
      const filtered = teachingPlans.filter(plan =>
        plan.teaching_plan_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (plan.teaching_plan_description && plan.teaching_plan_description.toLowerCase().includes(searchQuery.toLowerCase()))
      )
      setFilteredPlans(filtered)
    } else {
      setFilteredPlans(teachingPlans)
    }
  }, [searchQuery, teachingPlans])

  const loadTeachingPlans = async () => {
    try {
      setLoading(true)

      // Load conversions from /conversions/ API
      const response = await fetchConversions({
        page: 1,
        page_size: 100,
        success_only: true
      })

      // Convert ConversionSummary to TeachingPlan format
      const convertedPlans: TeachingPlan[] = response.conversions.map((conversion) => ({
        teaching_plan_id: conversion.id,
        teaching_plan_name: conversion.content_name,
        teaching_plan_description: conversion.description || `${conversion.original_filename} - ${conversion.framework} / ${conversion.styling}`,
        teaching_plan_format: {
          framework: conversion.framework,
          styling: conversion.styling,
          total_components: conversion.total_components,
          total_slides: conversion.total_slides
        },
        total_slides: conversion.total_slides,
        framework: conversion.framework,
        styling: conversion.styling,
        created_at: conversion.created_at
      }))

      setTeachingPlans(convertedPlans)
      setFilteredPlans(convertedPlans)

    } catch (error) {
      console.error('교안 로딩 실패:', error)
      toast.error("교안 목록을 불러오는데 실패했습니다")
      setTeachingPlans([])
      setFilteredPlans([])
    } finally {
      setLoading(false)
    }
  }

  const handlePlanSelect = (plan: TeachingPlan) => {
    setSelectedPlanId(plan.teaching_plan_id)
    setShowSubjectForm(true)
  }

  const handleAddLearningGoal = () => {
    setLearningGoals([...learningGoals, ""])
  }

  const handleRemoveLearningGoal = (index: number) => {
    setLearningGoals(learningGoals.filter((_, i) => i !== index))
  }

  const handleUpdateLearningGoal = (index: number, value: string) => {
    const updated = [...learningGoals]
    updated[index] = value
    setLearningGoals(updated)
  }

  const handleAddExample = () => {
    setExamples([...examples, { question: "", answer: "" }])
  }

  const handleRemoveExample = (index: number) => {
    setExamples(examples.filter((_, i) => i !== index))
  }

  const handleUpdateExample = (index: number, field: 'question' | 'answer', value: string) => {
    const updated = [...examples]
    updated[index][field] = value
    setExamples(updated)
  }

  const handleGenerate = async () => {
    if (!selectedPlanId) {
      toast.error("교안을 선택해주세요")
      return
    }

    if (!user?.id) {
      toast.error("로그인이 필요합니다")
      return
    }

    const validLearningGoals = learningGoals.filter(goal => goal.trim())
    const validExamples = examples.filter(ex => ex.question.trim() && ex.answer.trim())

    // courseData에서 과목명 가져오기
    const finalSubjectName = courseData.course_type_name
    const finalTopic = topic.trim() || courseData.description || "일반 수업"

    const subjectData: SubjectData = {
      subject_name: finalSubjectName,
      topic: finalTopic,
      difficulty: difficulty,
      learning_goals: validLearningGoals.length > 0 ? validLearningGoals : undefined,
      examples: validExamples.length > 0 ? validExamples : undefined
    }

    setGenerating(true)
    try {
      // Get access token from Supabase session
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token

      if (!accessToken) {
        toast.error("인증 토큰을 가져올 수 없습니다. 다시 로그인해주세요.")
        return
      }

      const response = await generateMaterials({
        user_id: parseInt(user.id),
        conversion_id: selectedPlanId,
        subject_data: subjectData,
        class_duration_minutes: classDuration,
        num_items: numItems,
        preserve_structure: true
      }, accessToken)

      toast.success(
        `자료 생성 완료!\n${response.num_items_generated}개 아이템이 생성되었습니다 (${response.generation_time.toFixed(2)}초)`,
        {
          duration: 3000,
          position: 'top-right'
        }
      )

      // 수업 자료 관리 페이지로 이동
      setTimeout(() => {
        navigate('/generate-v2/materials')
      }, 1500)
    } catch (error) {
      console.error('Material generation failed:', error)
      toast.error(
        error instanceof Error ? error.message : '자료 생성에 실패했습니다',
        {
          duration: 3000,
          position: 'top-right'
        }
      )
    } finally {
      setGenerating(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2">
              <Sparkles className="w-5 h-5 text-primary animate-spin" />
              <p className="text-muted-foreground">교안 목록을 불러오는 중...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="animate-scale-in">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          교안 선택
        </CardTitle>
        <CardDescription>
          생성할 교안의 형태를 선택해주세요.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Search Input */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="교안 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {filteredPlans.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-base text-muted-foreground">
                {selectedPlanId ? '1개 교안 선택됨' : '교안을 선택해주세요'}
              </p>
            </div>

            <div className="p-4 border border-border rounded-lg bg-muted/20">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPlans.map((plan) => {
                  const isSelected = selectedPlanId === plan.teaching_plan_id

                  return (
                    <Card
                      key={plan.teaching_plan_id}
                      className={`h-44 cursor-pointer transition-all hover:scale-[1.02] flex flex-col ${
                        isSelected
                          ? 'ring-2 ring-primary bg-primary/10'
                          : 'hover:shadow-md'
                      }`}
                      onClick={() => handlePlanSelect(plan)}
                    >
                      <CardHeader className="pb-3 flex-1">
                        <div className="flex items-start gap-3 h-full">
                          <div className="relative flex-shrink-0">
                            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                              <FileText className="w-5 h-5 text-primary" />
                            </div>
                            {isSelected && (
                              <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                                <CheckCircle className="w-3 h-3 text-primary-foreground" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-base leading-tight line-clamp-2" title={plan.teaching_plan_name}>
                              {plan.teaching_plan_name}
                            </CardTitle>
                            {plan.teaching_plan_description && (
                              <CardDescription className="text-sm mt-1 line-clamp-2">
                                {plan.teaching_plan_description}
                              </CardDescription>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex flex-wrap gap-1">
                          {plan.framework && (
                            <Badge variant="secondary" className="text-xs">
                              {plan.framework}
                            </Badge>
                          )}
                          {plan.styling && (
                            <Badge variant="outline" className="text-xs">
                              {plan.styling}
                            </Badge>
                          )}
                          {plan.total_slides && (
                            <Badge variant="outline" className="text-xs">
                              {plan.total_slides}개 슬라이드
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {searchQuery ? '검색 결과가 없습니다.' : '사용 가능한 교안이 없습니다.'}
            </p>
          </div>
        )}

        {/* 교과목 데이터 입력 폼 */}
        {showSubjectForm && selectedPlanId && (
          <Card className="mt-6 border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-lg">수업 자료 생성 정보</CardTitle>
              <CardDescription>선택한 교과 정보를 확인하고 추가 정보를 입력해주세요</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 선택된 교과 정보 (읽기 전용) */}
              <div className="p-4 bg-background border rounded-lg space-y-3">
                <h4 className="font-semibold text-sm">선택된 교과 정보</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">과목명: </span>
                    <span className="font-medium">{courseData.course_type_name}</span>
                  </div>
                  {courseData.description && (
                    <div>
                      <span className="text-muted-foreground">주제: </span>
                      <span className="font-medium">{courseData.description}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">난이도: </span>
                    <span className="font-medium">
                      {difficulty === 'easy' ? '쉬움' : difficulty === 'hard' ? '어려움' : '보통'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">수업 시간: </span>
                    <span className="font-medium">{classDuration}분</span>
                  </div>
                </div>
                {courseData.additional_message && (
                  <div className="text-sm pt-2 border-t">
                    <span className="text-muted-foreground">추가 메시지: </span>
                    <span>{courseData.additional_message}</span>
                  </div>
                )}
              </div>

              {/* 추가 주제 입력 (선택) */}
              <div className="space-y-2">
                <Label htmlFor="topic">세부 주제 (선택)</Label>
                <Input
                  id="topic"
                  placeholder="예: 2자리 수 곱셈, 나눗셈의 기초"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  교과 정보에 추가할 세부 주제를 입력하세요
                </p>
              </div>

              {/* 학습 목표 (선택) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>학습 목표 (선택)</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddLearningGoal}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    추가
                  </Button>
                </div>
                <div className="space-y-2">
                  {learningGoals.map((goal, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        placeholder={`학습 목표 ${index + 1}`}
                        value={goal}
                        onChange={(e) => handleUpdateLearningGoal(index, e.target.value)}
                      />
                      {learningGoals.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => handleRemoveLearningGoal(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* 예제 (선택) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>예제 (선택)</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddExample}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    추가
                  </Button>
                </div>
                <div className="space-y-3">
                  {examples.map((example, index) => (
                    <div key={index} className="space-y-2 p-3 border rounded-lg bg-background">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">예제 {index + 1}</Label>
                        {examples.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveExample(index)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      <Input
                        placeholder="질문"
                        value={example.question}
                        onChange={(e) => handleUpdateExample(index, 'question', e.target.value)}
                      />
                      <Input
                        placeholder="답변"
                        value={example.answer}
                        onChange={(e) => handleUpdateExample(index, 'answer', e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* 생성 설정 */}
              <div className="space-y-4 pt-4 border-t">
                <h4 className="font-semibold text-sm">생성 설정</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="duration">수업 시간 (분)</Label>
                    <Input
                      id="duration"
                      type="number"
                      min={1}
                      max={180}
                      value={classDuration}
                      onChange={(e) => setClassDuration(parseInt(e.target.value) || 45)}
                    />
                    <p className="text-xs text-muted-foreground">
                      약 {Math.round(classDuration * 0.8)}~{Math.round(classDuration * 1.25)}개 아이템 생성
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="items">아이템 개수 (선택)</Label>
                    <Input
                      id="items"
                      type="number"
                      min={1}
                      max={100}
                      value={numItems}
                      onChange={(e) => setNumItems(parseInt(e.target.value) || 5)}
                    />
                    <p className="text-xs text-muted-foreground">
                      수업 시간이 우선 적용됨
                    </p>
                  </div>
                </div>
              </div>

              {/* 생성 버튼 */}
              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowSubjectForm(false)}
                  disabled={generating}
                  className="flex-1"
                >
                  취소
                </Button>
                <Button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="flex-1"
                >
                  {generating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {generating ? '생성 중...' : '생성하기'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  )
}
