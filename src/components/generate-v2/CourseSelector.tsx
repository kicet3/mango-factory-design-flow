// CourseSelector - 과목, 협동 방식, 교재 범위 선택
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Textarea } from "@/components/ui/textarea"
import { ArrowRight, ChevronDown, Sparkles, Settings } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "sonner"
import type { CourseData } from "@/pages/GenerateV2Main"

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

interface CourseMaterial {
  course_material_id: number
  course_structure: any[]
}

interface TeacherInfo {
  class_grade: number
  class_semester: number
}

export function CourseSelector({ onSubmit }: CourseSelectorProps) {
  const { user } = useAuth()

  // State
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
  const [selectedDifficulty, setSelectedDifficulty] = useState<number>(2) // 보통

  const [selectedDuration, setSelectedDuration] = useState<number>(45)

  const [description, setDescription] = useState<string>("")

  // Course material scope
  const [courseStructure, setCourseStructure] = useState<any[]>([])
  const [selectedUnitIndex, setSelectedUnitIndex] = useState<number | null>(null)
  const [selectedLessonIndices, setSelectedLessonIndices] = useState<number[]>([])
  const [showLessons, setShowLessons] = useState(false)

  const [loading, setLoading] = useState(true)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)

  // Load initial data
  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user])

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
      // 1. teacher_course_type_course_material_publisher_map에서 course_material_publisher_id 가져오기
      const { data: publisherMapData, error: publisherMapError } = await supabase
        .from('teacher_course_type_course_material_publisher_map')
        .select('course_material_publisher_id')
        .eq('teacher_info_id', teacherInfoId)
        .eq('course_type_id', selectedCourseType)
        .maybeSingle()

      if (publisherMapError) throw publisherMapError

      // 출판사 설정이 없는 경우
      if (!publisherMapData) {
        console.log('출판사 설정이 없습니다')
        setCourseStructure([])
        toast.error(`수업자료 설정에서 ${selectedCourseTypeName} 과목 출판사를 지정해주세요`)
        return
      }

      const courseMaterialPublisherId = publisherMapData.course_material_publisher_id

      // 2. courses 테이블에서 course_id 찾기
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
        console.log('Course not found')
        setCourseStructure([])
        return
      }

      // 3. raw_course_materials에서 raw_course_material_id 구하기
      const { data: rawCourseMaterialsData, error: rawCourseMaterialsError } = await supabase
        .from('raw_course_materials')
        .select('raw_course_material_id')
        .eq('course_id', coursesData.course_id)
        .maybeSingle()

      if (rawCourseMaterialsError) throw rawCourseMaterialsError

      if (!rawCourseMaterialsData) {
        console.log('Raw course materials not found')
        setCourseStructure([])
        return
      }

      // 4. course_material_structure_only에서 course_structure 가져오기
      const { data: courseStructureData, error: courseStructureError } = await supabase
        .from('course_material_structure_only')
        .select('course_structure')
        .eq('raw_course_material_id', rawCourseMaterialsData.raw_course_material_id)
        .maybeSingle()

      if (courseStructureError) throw courseStructureError

      if (courseStructureData?.course_structure) {
        console.log('Loaded course structure:', courseStructureData.course_structure)
        // Parse JSON strings to objects
        const parsedStructure = courseStructureData.course_structure.map((item: string) =>
          typeof item === 'string' ? JSON.parse(item) : item
        )
        console.log('Parsed course structure:', parsedStructure)
        setCourseStructure(parsedStructure)
      } else {
        console.log('No course structure found')
        setCourseStructure([])
      }

    } catch (error) {
      console.error('Error loading course material scope:', error)
      setCourseStructure([])
      toast.error('교재 범위를 불러오는데 실패했습니다.')
    }
  }

  const handleUnitSelect = (index: number) => {
    if (selectedUnitIndex === index) {
      // 같은 단원 클릭하면 토글
      setShowLessons(!showLessons)
    } else {
      // 다른 단원 클릭하면 선택하고 차시 보이기
      setSelectedUnitIndex(index)
      setSelectedLessonIndices([])
      setShowLessons(true)
    }
  }

  const handleLessonToggle = (weekIndex: number) => {
    if (selectedLessonIndices.includes(weekIndex)) {
      setSelectedLessonIndices(selectedLessonIndices.filter(i => i !== weekIndex))
    } else {
      setSelectedLessonIndices([...selectedLessonIndices, weekIndex])
    }
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
      description: description.trim() || null
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
    <div className="space-y-6">
      {/* 기본 학습 정보 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">기본 학습 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 학년/학기 선택 */}
          {teacherInfo && (
            <div className="grid grid-cols-2 gap-4">
              <Select value={teacherInfo.class_grade?.toString()} disabled>
                <SelectTrigger className="h-14 text-base bg-muted/30">
                  <SelectValue>{teacherInfo.class_grade}학년</SelectValue>
                </SelectTrigger>
              </Select>
              <Select value={teacherInfo.class_semester?.toString()} disabled>
                <SelectTrigger className="h-14 text-base bg-muted/30">
                  <SelectValue>{teacherInfo.class_semester}학기</SelectValue>
                </SelectTrigger>
              </Select>
            </div>
          )}

          {/* 과목 선택 - 버튼 형태 */}
          <div className="flex flex-wrap gap-3">
            {courseTypes.map((type) => (
              <Button
                key={type.course_type_id}
                variant={selectedCourseType === type.course_type_id ? "default" : "outline"}
                size="lg"
                onClick={() => {
                  setSelectedCourseType(type.course_type_id)
                  setSelectedCourseTypeName(type.course_type_name)
                }}
                className={`h-16 px-8 text-base rounded-2xl ${
                  selectedCourseType === type.course_type_id
                    ? 'bg-teal-400 hover:bg-teal-500 text-white'
                    : 'bg-muted/50 hover:bg-muted'
                }`}
              >
                {type.course_type_name}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 교재 범위 선택 */}
      {selectedCourseType && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">교재 범위 선택</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {courseStructure.length > 0 ? (
              <>
                {/* 단원 선택 드롭다운 */}
                <Select
                  value={selectedUnitIndex?.toString()}
                  onValueChange={(value) => {
                    const index = Number(value)
                    setSelectedUnitIndex(index)
                    setSelectedLessonIndices([])
                    setShowLessons(true)
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

                {/* 차시 선택 */}
                {selectedUnitIndex !== null && showLessons && courseStructure[selectedUnitIndex]?.section_weeks && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-base text-muted-foreground">차시 선택 (복수 선택 가능)</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const allWeekIndices = courseStructure[selectedUnitIndex].section_weeks.map((_: any, idx: number) => idx)
                          setSelectedLessonIndices(allWeekIndices)
                        }}
                        className="text-primary hover:text-primary"
                      >
                        전체 선택
                      </Button>
                    </div>
                    <div className="relative pl-6">
                      {/* 세로선 */}
                      <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-teal-400" />

                      <div className="space-y-3">
                        {courseStructure[selectedUnitIndex].section_weeks.map((week: any, weekIndex: number) => (
                          <div
                            key={weekIndex}
                            className="relative bg-white rounded-xl border-2 hover:border-teal-200 transition-all"
                          >
                            <label
                              htmlFor={`lesson-${weekIndex}`}
                              className="flex items-center gap-4 p-4 cursor-pointer"
                            >
                              {/* 커스텀 체크박스 */}
                              <div className="relative flex-shrink-0">
                                <Checkbox
                                  id={`lesson-${weekIndex}`}
                                  checked={selectedLessonIndices.includes(weekIndex)}
                                  onCheckedChange={() => handleLessonToggle(weekIndex)}
                                  className={`w-6 h-6 ${
                                    selectedLessonIndices.includes(weekIndex)
                                      ? 'bg-teal-400 border-teal-400'
                                      : 'border-gray-300'
                                  }`}
                                />
                              </div>

                              <div className="flex-1">
                                {week.section_content_name ? (
                                  <>
                                    <span className="font-semibold text-base">
                                      [{week.section_content_order}차시]
                                    </span>
                                    <span className="ml-2 text-base">
                                      {week.section_content_name}
                                    </span>
                                    {week.section_content_pages && week.section_content_pages.length > 0 && (
                                      <span className="ml-2 text-sm text-muted-foreground">
                                        ({Math.min(...week.section_content_pages)}-{Math.max(...week.section_content_pages)}쪽)
                                      </span>
                                    )}
                                  </>
                                ) : (
                                  <span className="font-semibold text-base">
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
              </>
            ) : (
              <div className="text-sm text-muted-foreground py-2">
                {selectedCourseType ? '해당 과목의 교재 범위가 없습니다.' : '과목을 먼저 선택해주세요.'}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 세부 옵션 설정 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">세부 옵션 설정</CardTitle>
          <CardDescription className="text-base mt-2">
            AI 추천을 받거나 세부 설정을 조정하세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {/* AI 추천 설정 버튼 */}
            <Button
              size="lg"
              className="h-16 text-base rounded-xl bg-gradient-to-r from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600 text-white shadow-lg"
              onClick={() => {
                // AI 추천 로직
                toast.success("AI가 최적의 설정을 추천합니다")
                setIsDetailsOpen(false)
              }}
            >
              <Sparkles className="w-5 h-5 mr-2" />
              AI 추천 설정
            </Button>

            {/* 직접 설정 버튼 */}
            <Button
              size="lg"
              variant="outline"
              className="h-16 text-base rounded-xl bg-muted/50 hover:bg-muted"
              onClick={() => setIsDetailsOpen(!isDetailsOpen)}
            >
              <Settings className="w-5 h-5 mr-2" />
              직접 설정
            </Button>
          </div>

          {/* 직접 설정 펼침 영역 */}
          <Collapsible open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
            <CollapsibleContent>
              <div className="mt-6 pt-6 border-t space-y-6">
                {/* 교안 설명 */}
                <div className="space-y-3">
                  <Label className="text-base font-medium">교안 설명</Label>
                  <Textarea
                    placeholder="교안에 대한 설명을 입력하세요... (선택사항)"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="min-h-[100px] resize-none"
                  />
                </div>

                {/* 난이도 선택 */}
                <div className="space-y-3">
                  <Label className="text-base font-medium">난이도</Label>
                  <div className="flex gap-2">
                    {difficulties.map((difficulty) => (
                      <Button
                        key={difficulty.difficulty_id}
                        variant={selectedDifficulty === difficulty.difficulty_id ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedDifficulty(difficulty.difficulty_id)}
                        className="flex-1"
                      >
                        {difficulty.difficulty_name}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* 소요시간 슬라이더 */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-medium">예상 소요시간</Label>
                    <span className="text-base text-muted-foreground">{selectedDuration}분</span>
                  </div>
                  <Slider
                    value={[selectedDuration]}
                    onValueChange={(value) => setSelectedDuration(value[0])}
                    min={15}
                    max={60}
                    step={5}
                    className="w-full"
                  />
                </div>

                {/* 교수법 선택 */}
                <div className="space-y-3">
                  <Label className="text-base font-medium">교수법</Label>
                  <div className="space-y-2">
                    {teachingStyles.map((style) => (
                      <div key={style.teaching_style_id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`style-${style.teaching_style_id}`}
                          checked={selectedTeachingStyles.includes(style.teaching_style_id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedTeachingStyles([...selectedTeachingStyles, style.teaching_style_id])
                            } else {
                              setSelectedTeachingStyles(selectedTeachingStyles.filter(id => id !== style.teaching_style_id))
                            }
                          }}
                        />
                        <Label htmlFor={`style-${style.teaching_style_id}`} className="text-sm cursor-pointer">
                          {style.teaching_style_name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 협동 방식 선택 */}
                <div className="space-y-3">
                  <Label className="text-base font-medium">협동 방식</Label>
                  <div className="space-y-2">
                    {coworkTypes.map((type) => (
                      <div key={type.cowork_type_id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`cowork-${type.cowork_type_id}`}
                          checked={selectedCoworkTypes.includes(type.cowork_type_id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedCoworkTypes([...selectedCoworkTypes, type.cowork_type_id])
                            } else {
                              setSelectedCoworkTypes(selectedCoworkTypes.filter(id => id !== type.cowork_type_id))
                            }
                          }}
                        />
                        <Label htmlFor={`cowork-${type.cowork_type_id}`} className="text-sm cursor-pointer">
                          {type.cowork_type_name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSubmit}
          size="lg"
          className="px-8 gap-2"
          disabled={!selectedCourseType}
        >
          다음 단계로
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
