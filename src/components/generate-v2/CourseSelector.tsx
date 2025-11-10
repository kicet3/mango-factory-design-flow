// CourseSelector - 단계별 순차 선택 UI
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Textarea } from "@/components/ui/textarea"
import { ArrowRight, Check, ChevronRight, Sparkles, X } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "sonner"
import type { CourseData } from "@/pages/GenerateV2Main"
import { Badge } from "@/components/ui/badge"

interface CourseSelectorProps {
  onSubmit: (data: CourseData) => void
}

interface CourseType {
  course_type_id: number
  course_type_name: string
}

interface TeachingStyle {
  teaching_style_id: number
  teaching_style_name: string
}

interface CoworkType {
  cowork_type_id: number
  cowork_type_name: string
}

interface Difficulty {
  difficulty_id: number
  difficulty_name: string
}

interface TeacherInfo {
  class_grade: number
  class_semester: number
}

export function CourseSelector({ onSubmit }: CourseSelectorProps) {
  const { user } = useAuth()

  // State
  const [currentStep, setCurrentStep] = useState<number>(1) // 1:학년, 2:학기, 3:과목, 4:단원, 5:차시, 6:세부설정
  const [teacherInfo, setTeacherInfo] = useState<TeacherInfo | null>(null)
  const [teacherInfoId, setTeacherInfoId] = useState<number | null>(null)
  const [courseTypes, setCourseTypes] = useState<CourseType[]>([])
  const [selectedCourseType, setSelectedCourseType] = useState<number | null>(null)
  const [selectedCourseTypeName, setSelectedCourseTypeName] = useState<string>("")

  const [teachingStyles, setTeachingStyles] = useState<TeachingStyle[]>([])
  const [selectedTeachingStyles, setSelectedTeachingStyles] = useState<number[]>([])

  const [coworkTypes, setCoworkTypes] = useState<CoworkType[]>([])
  const [selectedCoworkTypes, setSelectedCoworkTypes] = useState<number[]>([])

  const [difficulties, setDifficulties] = useState<Difficulty[]>([])
  const [selectedDifficulty, setSelectedDifficulty] = useState<number>(2)

  const [selectedDuration, setSelectedDuration] = useState<number>(45)
  const [description, setDescription] = useState<string>("")

  // Course material scope
  const [courseStructure, setCourseStructure] = useState<any[]>([])
  const [selectedUnitIndex, setSelectedUnitIndex] = useState<number | null>(null)
  const [selectedLessonIndices, setSelectedLessonIndices] = useState<number[]>([])

  const [loading, setLoading] = useState(true)

  // AI Recommendation Panel
  const [showAIPanel, setShowAIPanel] = useState(false)
  const [aiFormationType, setAiFormationType] = useState<string[]>([]) // 구성 형태
  const [aiLearningActivities, setAiLearningActivities] = useState<string[]>([]) // 학습 활동
  const [aiRecommendedDifficulty, setAiRecommendedDifficulty] = useState<number | null>(null) // 난이도
  const [aiNumStudents, setAiNumStudents] = useState<number>(20) // 참여 학생수
  const [aiClassDuration, setAiClassDuration] = useState<number>(45) // 소요시간
  const [aiTeachingStyle, setAiTeachingStyle] = useState<string[]>([]) // 수업 스타일

  // Load initial data
  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user])

  // Auto-advance to step 2 when teacher info is loaded
  useEffect(() => {
    if (teacherInfo && currentStep === 1) {
      setCurrentStep(2)
    }
  }, [teacherInfo])

  // Load course materials when course type selected
  useEffect(() => {
    if (selectedCourseType) {
      loadCourseMaterials()
    }
  }, [selectedCourseType])

  const loadData = async () => {
    try {
      setLoading(true)
      await Promise.all([
        loadTeacherInfo(),
        loadCourseTypes(),
        loadTeachingStyles(),
        loadCoworkTypes(),
        loadDifficulties()
      ])
    } catch (error) {
      console.error('데이터 로딩 실패:', error)
      toast.error("데이터를 불러오는데 실패했습니다")
    } finally {
      setLoading(false)
    }
  }

  const loadTeacherInfo = async () => {
    if (!user) return

    const { data, error } = await supabase
      .from('teacher_info')
      .select('teacher_info_id, class_info')
      .eq('user_id', user.id)
      .maybeSingle()

    if (error) {
      console.error('교사 정보 로딩 실패:', error)
      return
    }

    if (data?.class_info) {
      const classInfo = data.class_info as any
      setTeacherInfo({
        class_grade: classInfo.class_grade,
        class_semester: classInfo.class_semester
      })
      setTeacherInfoId(data.teacher_info_id)
    }
  }

  const loadCourseTypes = async () => {
    const { data, error } = await supabase
      .from('course_types')
      .select('*')
      .order('course_type_id')

    if (error) throw error
    setCourseTypes(data || [])
  }

  const loadTeachingStyles = async () => {
    const { data, error } = await supabase
      .from('teaching_styles')
      .select('*')
      .order('teaching_style_id')

    if (error) throw error
    setTeachingStyles(data || [])
  }

  const loadCoworkTypes = async () => {
    const { data, error } = await supabase
      .from('cowork_types')
      .select('*')
      .order('cowork_type_id')

    if (error) throw error
    setCoworkTypes(data || [])
  }

  const loadDifficulties = async () => {
    const { data, error } = await supabase
      .from('difficulties')
      .select('*')
      .order('difficulty_id')

    if (error) throw error
    setDifficulties(data || [])
  }

  const loadCourseMaterials = async () => {
    if (!selectedCourseType || !user || !teacherInfo || !teacherInfoId) return

    try {
      const { data: publisherMapData, error: publisherMapError } = await supabase
        .from('teacher_course_type_course_material_publisher_map')
        .select('course_material_publisher_id')
        .eq('teacher_info_id', teacherInfoId)
        .eq('course_type_id', selectedCourseType)
        .maybeSingle()

      if (publisherMapError) throw publisherMapError

      if (!publisherMapData) {
        console.log('출판사 설정이 없습니다')
        setCourseStructure([])
        return
      }

      const courseMaterialPublisherId = publisherMapData.course_material_publisher_id

      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select('course_id')
        .eq('course_type_id', selectedCourseType)
        .eq('course_grade', teacherInfo.class_grade)
        .eq('course_semester_id', teacherInfo.class_semester)
        .eq('course_material_publisher_id', courseMaterialPublisherId)
        .limit(1)
        .maybeSingle()

      if (coursesError) throw coursesError

      if (!coursesData) {
        setCourseStructure([])
        return
      }

      const { data: rawCourseMaterialsData, error: rawCourseMaterialsError } = await supabase
        .from('raw_course_materials')
        .select('raw_course_material_id')
        .eq('course_id', coursesData.course_id)
        .maybeSingle()

      if (rawCourseMaterialsError) throw rawCourseMaterialsError

      if (!rawCourseMaterialsData) {
        setCourseStructure([])
        return
      }

      const { data: courseStructureData, error: courseStructureError } = await supabase
        .from('course_material_structure_only')
        .select('course_structure')
        .eq('raw_course_material_id', rawCourseMaterialsData.raw_course_material_id)
        .maybeSingle()

      if (courseStructureError) throw courseStructureError

      if (courseStructureData?.course_structure) {
        const parsedStructure = courseStructureData.course_structure.map((item: string) =>
          typeof item === 'string' ? JSON.parse(item) : item
        )
        setCourseStructure(parsedStructure)
      } else {
        setCourseStructure([])
      }

    } catch (error) {
      console.error('Error loading course material scope:', error)
      setCourseStructure([])
    }
  }

  const handleLessonToggle = (weekIndex: number) => {
    if (selectedLessonIndices.includes(weekIndex)) {
      setSelectedLessonIndices(selectedLessonIndices.filter(i => i !== weekIndex))
    } else {
      setSelectedLessonIndices([...selectedLessonIndices, weekIndex])
    }
  }

  const toggleAIOption = (currentValues: string[], value: string) => {
    if (currentValues.includes(value)) {
      return currentValues.filter(v => v !== value)
    } else {
      return [...currentValues, value]
    }
  }

  const applyAIRecommendations = () => {
    // Apply AI recommendations to form
    if (aiRecommendedDifficulty !== null) {
      setSelectedDifficulty(aiRecommendedDifficulty)
    }
    setSelectedDuration(aiClassDuration)

    // Convert AI teaching styles to IDs (assuming mapping exists)
    // This is a placeholder - you may need to map string names to IDs from teachingStyles

    toast.success("AI 추천 설정이 적용되었습니다")

    // Submit the form and go to next step
    handleSubmit()
  }

  const handleSubmit = () => {
    if (!selectedCourseType) {
      toast.error("과목을 선택해주세요")
      return
    }

    const courseData: CourseData = {
      course_type_id: selectedCourseType,
      course_type_name: selectedCourseTypeName,
      teaching_style_ids: selectedTeachingStyles,
      cowork_type_ids: selectedCoworkTypes,
      course_material_scope: selectedUnitIndex !== null ? {
        course_sections_index: selectedUnitIndex,
        course_weeks_indices: selectedLessonIndices
      } : null,
      difficulty_id: selectedDifficulty,
      expected_duration_min: selectedDuration,
      additional_message: "",
      description: description.trim() || null,
      course_id: 0,
      grade_level_id: teacherInfo?.class_grade || 0,
      grade_level_name: `${teacherInfo?.class_grade}학년` || ""
    }

    onSubmit(courseData)
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">데이터를 불러오는 중...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-6">
      {/* Left: Course Selection Card */}
      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="text-2xl">교과 정보 입력</CardTitle>
          <CardDescription className="text-base">
            단계별로 선택해주세요
          </CardDescription>
        </CardHeader>
      <CardContent className="space-y-8">
        {/* Step 1 & 2: 학년 + 학기 (한 줄) */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-semibold">
              {currentStep > 2 ? <Check className="w-5 h-5" /> : "1"}
            </div>
            <Label className="text-lg font-semibold">학년과 학기를 확인해주세요</Label>
          </div>
          <div className="ml-11 grid grid-cols-2 gap-4">
            {teacherInfo && (
              <>
                <Button
                  size="lg"
                  variant="outline"
                  disabled
                  className="h-14 text-lg bg-muted/50"
                >
                  {teacherInfo.class_grade}학년
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  disabled
                  className="h-14 text-lg bg-muted/50"
                >
                  {teacherInfo.class_semester}학기
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Step 2: 과목 */}
        {currentStep >= 2 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-semibold">
                {currentStep > 2 ? <Check className="w-5 h-5" /> : "2"}
              </div>
              <Label className="text-lg font-semibold">과목을 선택해주세요</Label>
            </div>
            <div className="ml-11 relative">
              <div className="overflow-x-auto pb-2 scrollbar-hide">
                <div className="flex gap-3 min-w-max">
                  {courseTypes.map((type) => (
                    <Button
                      key={type.course_type_id}
                      variant={selectedCourseType === type.course_type_id ? "default" : "outline"}
                      size="lg"
                      onClick={() => {
                        setSelectedCourseType(type.course_type_id)
                        setSelectedCourseTypeName(type.course_type_name)
                        if (currentStep === 2) setCurrentStep(3)
                      }}
                      className="h-14 text-base px-8 whitespace-nowrap"
                    >
                      {type.course_type_name}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: 단원 선택 */}
        {currentStep >= 3 && selectedCourseType && courseStructure.length > 0 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-semibold">
                {currentStep > 3 ? <Check className="w-5 h-5" /> : "3"}
              </div>
              <Label className="text-lg font-semibold">단원을 선택해주세요</Label>
            </div>
            <div className="ml-11">
              <Select
                value={selectedUnitIndex?.toString()}
                onValueChange={(value) => {
                  const index = Number(value)
                  setSelectedUnitIndex(index)
                  setSelectedLessonIndices([])
                  if (currentStep === 3) setCurrentStep(4)
                }}
              >
                <SelectTrigger className="h-14 text-base">
                  <SelectValue placeholder="단원을 선택하세요">
                    {selectedUnitIndex !== null && courseStructure[selectedUnitIndex] && (
                      `${selectedUnitIndex + 1}단원: ${courseStructure[selectedUnitIndex].section_name || `${selectedUnitIndex + 1}단원`}`
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {courseStructure.map((scope, index) => (
                    <SelectItem key={index} value={index.toString()}>
                      {index + 1}단원: {scope.section_name || `${index + 1}단원`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Step 4: 차시 선택 */}
        {currentStep >= 4 && selectedUnitIndex !== null && courseStructure[selectedUnitIndex]?.section_weeks && (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-semibold">
                {currentStep > 4 ? <Check className="w-5 h-5" /> : "4"}
              </div>
              <Label className="text-lg font-semibold">차시를 선택해주세요 (복수 선택 가능)</Label>
            </div>
            <div className="ml-11 space-y-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const allWeekIndices = courseStructure[selectedUnitIndex].section_weeks.map((_: any, idx: number) => idx)
                  setSelectedLessonIndices(allWeekIndices)
                  if (currentStep === 4) setCurrentStep(5)
                }}
                className="text-primary hover:text-primary"
              >
                전체 선택
              </Button>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {courseStructure[selectedUnitIndex].section_weeks.map((week: any, weekIndex: number) => (
                  <div
                    key={weekIndex}
                    className="border rounded-lg hover:border-primary/50 transition-colors"
                  >
                    <label
                      htmlFor={`lesson-${weekIndex}`}
                      className="flex items-center gap-3 p-3 cursor-pointer"
                    >
                      <Checkbox
                        id={`lesson-${weekIndex}`}
                        checked={selectedLessonIndices.includes(weekIndex)}
                        onCheckedChange={() => {
                          handleLessonToggle(weekIndex)
                          if (currentStep === 4 && !selectedLessonIndices.includes(weekIndex)) {
                            setCurrentStep(5)
                          }
                        }}
                        className="w-5 h-5"
                      />
                      <div className="flex-1">
                        {week.section_content_name ? (
                          <>
                            <span className="font-semibold">
                              [{week.section_content_order}차시]
                            </span>
                            <span className="ml-2">
                              {week.section_content_name}
                            </span>
                            {week.section_content_pages && week.section_content_pages.length > 0 && (
                              <span className="ml-2 text-sm text-muted-foreground">
                                ({Math.min(...week.section_content_pages)}-{Math.max(...week.section_content_pages)}쪽)
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="font-semibold">
                            [{weekIndex + 1}차시]
                          </span>
                        )}
                      </div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 5: 세부 설정 */}
        {currentStep >= 5 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-semibold">
                5
              </div>
              <Label className="text-lg font-semibold">세부 옵션 설정</Label>
            </div>
            <div className="ml-11 space-y-6">
              <p className="text-sm text-muted-foreground">
                AI 추천을 받거나 세부 옵션을 조정하세요
              </p>

              {/* AI 추천 받기 버튼 */}
              <div className="flex gap-3">
                <Button
                  variant="default"
                  className="flex-1 h-12"
                  onClick={() => setShowAIPanel(true)}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  AI 추천 받기
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 h-12"
                >
                  직접 설정
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        {currentStep > 2 && currentStep < 5 && (
          <div className="flex justify-between pt-6 border-t">
            <Button
              variant="outline"
              onClick={() => setCurrentStep(currentStep - 1)}
            >
              이전
            </Button>
          </div>
        )}
      </CardContent>
    </Card>

      {/* Right: AI Recommendation Panel */}
      {currentStep >= 5 ? (
        showAIPanel ? (
        <Card className="w-[420px] h-fit">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2 text-primary">
              <Sparkles className="w-5 h-5" />
              <CardTitle className="text-lg">구성 형태</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">추천된 형식으로 빠른 형태를 클릭해 해당 형식으로 생성할 수 있습니다</p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 구성 형태 */}
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: '개별 활동', icon: '👤' },
                  { label: '학 활동', icon: '👥' },
                  { label: '모둠 활동', icon: '👨‍👩‍👧‍👦' }
                ].map((type) => (
                  <Button
                    key={type.label}
                    variant={aiFormationType.includes(type.label) ? "default" : "outline"}
                    className="h-20 flex flex-col items-center justify-center gap-2"
                    onClick={() => setAiFormationType(toggleAIOption(aiFormationType, type.label))}
                  >
                    <span className="text-2xl">{type.icon}</span>
                    <span className="text-xs">{type.label}</span>
                  </Button>
                ))}
              </div>
            </div>

            {/* 학습 활동 난이도 */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-primary">
                <span>📊</span>
                <Label className="text-sm font-semibold">학습 활동 난이도</Label>
              </div>
              <p className="text-sm text-muted-foreground">생성될 수업자료의 학습 난이도를 조절합니다</p>
              <div className="grid grid-cols-3 gap-2">
                {['쉬움', '보통', '어려움'].map((level, idx) => (
                  <Button
                    key={level}
                    variant={aiRecommendedDifficulty === idx + 1 ? "default" : "outline"}
                    onClick={() => setAiRecommendedDifficulty(idx + 1)}
                  >
                    {level}
                  </Button>
                ))}
              </div>
            </div>

            {/* 참여 학생 수 */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-primary">
                <span>👨‍🎓</span>
                <Label className="text-sm font-semibold">참여 학생 수</Label>
              </div>
              <p className="text-sm text-muted-foreground">클래스에 있는 정보 참여 학생 수를 조절합니다</p>
              <div className="space-y-2">
                <Slider
                  value={[aiNumStudents]}
                  onValueChange={(value) => setAiNumStudents(value[0])}
                  min={1}
                  max={50}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>1명</span>
                  <span className="font-semibold text-primary">{aiNumStudents}명</span>
                  <span>50명</span>
                </div>
              </div>
            </div>

            {/* 소요 시간 */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-primary">
                <span>⏰</span>
                <Label className="text-sm font-semibold">소요 시간</Label>
              </div>
              <p className="text-sm text-muted-foreground">소요시간을 설정해 생성될 수업자료의 분량을 조절합니다</p>
              <div className="space-y-2">
                <Slider
                  value={[aiClassDuration]}
                  onValueChange={(value) => setAiClassDuration(value[0])}
                  min={0}
                  max={40}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0분</span>
                  <span className="font-semibold text-primary">{aiClassDuration}분</span>
                  <span>40분</span>
                </div>
              </div>
            </div>

            {/* 교수법 */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">교수법</Label>
              <div className="space-y-2">
                {[
                  '교과서 중심수업',
                  '토론 및 탐색',
                  '프로젝트 기반',
                  '인터랙 및 게임 활동',
                  '개인 기반 활동',
                  '실험 소모의 협력'
                ].map((method) => (
                  <label
                    key={method}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="teaching-method"
                      checked={aiTeachingStyle.includes(method)}
                      onChange={() => setAiTeachingStyle([method])}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">{method}</span>
                  </label>
                ))}
              </div>
            </div>
          </CardContent>
          <div className="border-t p-4 flex justify-end">
            <Button
              onClick={applyAIRecommendations}
              disabled={!selectedCourseType}
              className="gap-2"
            >
              다음
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </Card>
        ) : (
          <Card className="h-fit flex items-center justify-center min-h-[400px]">
            <CardContent className="text-center py-12">
              <div className="space-y-4">
                <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">AI 추천을 받아보세요</h3>
                  <p className="text-sm text-muted-foreground">
                    왼쪽에서 세부 옵션 설정 단계의<br />
                    "AI 추천 받기" 버튼을 클릭하세요
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      ) : (
        <Card className="h-fit flex items-center justify-center min-h-[400px]">
          <CardContent className="text-center py-12">
            <div className="space-y-4">
              <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
                <ArrowRight className="w-8 h-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">단계별로 진행하세요</h3>
                <p className="text-sm text-muted-foreground">
                  왼쪽에서 교과 정보를 선택하면<br />
                  AI 추천 설정을 진행할 수 있습니다
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
