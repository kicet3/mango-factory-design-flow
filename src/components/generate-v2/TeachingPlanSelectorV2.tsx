// TeachingPlanSelectorV2 - 교안 선택 (수업 활동 선택 스타일)
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
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
  const [progress, setProgress] = useState(0)

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

    const finalSubjectName = courseData.course_type_name
    const finalTopic = topic.trim() || courseData.description || "일반 수업"

    const subjectData: SubjectData = {
      subject_name: finalSubjectName,
      topic: finalTopic,
      difficulty: difficulty,
      learning_goals: validLearningGoals.length > 0 ? validLearningGoals : undefined,
      examples: validExamples.length > 0 ? validExamples : undefined,
      course_info: {
        course_id: courseData.course_id,
        course_type_id: courseData.course_type_id,
        course_type_name: courseData.course_type_name,
        grade_level_id: courseData.grade_level_id,
        grade_level_name: courseData.grade_level_name,
        difficulty_id: courseData.difficulty_id,
        expected_duration_min: courseData.expected_duration_min,
        description: courseData.description,
        additional_message: courseData.additional_message
      }
    }

    setGenerating(true)
    setProgress(0)

    // Progress bar animation
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return 90
        return prev + 2
      })
    }, 100)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token

      if (!accessToken) {
        toast.error("인증 토큰을 가져올 수 없습니다. 다시 로그인해주세요.")
        clearInterval(progressInterval)
        setGenerating(false)
        setProgress(0)
        return
      }

      const response = await generateMaterials({
        user_id: user.id,
        course_id: courseData.course_id,
        conversion_id: selectedPlanId,
        subject_data: subjectData,
        class_duration_minutes: classDuration,
        num_items: numItems,
        preserve_structure: true
      }, accessToken)

      clearInterval(progressInterval)
      setProgress(100)

      toast.success(
        `자료 생성이 완료되었습니다!\n${response.num_items_generated}개 아이템이 생성되었습니다`,
        {
          duration: 3000,
        }
      )

      setTimeout(() => {
        navigate('/generate-v2/materials')
      }, 1500)
    } catch (error) {
      console.error('Material generation failed:', error)
      clearInterval(progressInterval)
      toast.error(
        error instanceof Error ? error.message : '자료 생성에 실패했습니다. 다시 시도해주세요.',
        {
          duration: 4000,
        }
      )
      setGenerating(false)
      setProgress(0)
    }
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

  if (generating) {
    return (
      <Card className="animate-scale-in">
        <CardContent className="py-16">
          <div className="text-center space-y-6 max-w-2xl mx-auto">
            <div className="mx-auto w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
              <Sparkles className="w-10 h-10 text-primary animate-pulse" />
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-bold">AI가 교안 자료를 생성하고 있습니다</h3>
              <p className="text-lg text-muted-foreground">
                잠시만 기다려주세요. 선택하신 교안 양식에 맞춰 자료를 생성하고 있습니다.
              </p>
            </div>

            <div className="w-full max-w-md mx-auto space-y-3">
              <Progress value={progress} className="w-full h-3" />
              <p className="text-xl font-semibold text-primary">{Math.round(progress)}% 완료</p>
            </div>

            <div className="flex flex-col items-center gap-3 mt-8">
              <div className="flex items-center gap-2 text-base text-muted-foreground">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                <span>교과서 내용 분석 중...</span>
              </div>
              <div className="flex items-center gap-2 text-base text-muted-foreground">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                <span>교안 양식 적용 중...</span>
              </div>
              <div className="flex items-center gap-2 text-base text-muted-foreground">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                <span>최종 자료 생성 중...</span>
              </div>
            </div>

            <p className="text-base text-muted-foreground max-w-lg mx-auto mt-8">
              *AI 생성자료는 때때로 완벽하지 않아 결과가 기대와 다를 수 있습니다
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="animate-scale-in">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl">
          <FileText className="w-6 h-6 text-primary" />
          교안 선택
        </CardTitle>
        <CardDescription className="text-lg">
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

            <div className="p-4 border border-border rounded-lg bg-muted/20 max-h-[600px] overflow-y-auto">
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

        {/* 생성 버튼 */}
        <div className="mt-6 flex justify-end">
          <Button
            onClick={handleGenerate}
            disabled={!selectedPlanId || generating}
            size="lg"
            className="gap-2 h-14 text-lg font-semibold px-8"
          >
            {generating && <Loader2 className="w-5 h-5 animate-spin" />}
            {generating ? '생성 중...' : '자료 생성하기'}
            {!generating && <Sparkles className="w-5 h-5" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
