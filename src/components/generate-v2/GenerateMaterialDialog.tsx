import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Plus, Trash2 } from "lucide-react"
import { generateMaterials, fetchAllConversions, type SubjectData, type ConversionSummary } from "@/services/conversions"
import { toast } from "sonner"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/hooks/use-auth"

interface GenerateMaterialDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

interface Example {
  question: string
  answer: string
}

export function GenerateMaterialDialog({
  open,
  onOpenChange,
  onSuccess
}: GenerateMaterialDialogProps) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [loadingConversions, setLoadingConversions] = useState(false)
  const [loadingCourses, setLoadingCourses] = useState(false)
  const [conversions, setConversions] = useState<ConversionSummary[]>([])
  const [courses, setCourses] = useState<any[]>([])

  // Selected conversion and course
  const [selectedConversionId, setSelectedConversionId] = useState<string>("")
  const [selectedCourseId, setSelectedCourseId] = useState<string>("")
  const [componentId, setComponentId] = useState<number | undefined>(undefined)

  // Form state
  const [subjectName, setSubjectName] = useState("")
  const [topic, setTopic] = useState("")
  const [difficulty, setDifficulty] = useState<string>("medium")
  const [learningGoals, setLearningGoals] = useState<string[]>([""])
  const [examples, setExamples] = useState<Example[]>([{ question: "", answer: "" }])
  const [classDuration, setClassDuration] = useState<number>(20)
  const [numItems, setNumItems] = useState<number>(5)
  const [preserveStructure, setPreserveStructure] = useState(true)

  // Load conversions and courses when dialog opens
  useEffect(() => {
    if (open) {
      loadConversionsList()
      loadCoursesList()
    }
  }, [open])

  const loadConversionsList = async () => {
    setLoadingConversions(true)
    try {
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token

      const response = await fetchAllConversions({
        page: 1,
        page_size: 100,
        success_only: true
      }, accessToken)
      setConversions(response.conversions)

      // Auto-select first conversion if available
      if (response.conversions.length > 0) {
        setSelectedConversionId(response.conversions[0].id.toString())
      }
    } catch (error) {
      console.error('Failed to fetch conversions:', error)
      toast.error('교안 목록을 불러오는데 실패했습니다')
    } finally {
      setLoadingConversions(false)
    }
  }

  const loadCoursesList = async () => {
    setLoadingCourses(true)
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('course_id, course_type_id, course_grade, course_semester_id, course_types!inner(course_type_name), raw_course_materials!inner(raw_course_material_id)')
        .order('course_grade', { ascending: true })
        .order('course_semester_id', { ascending: true })
        .limit(100)

      if (error) throw error

      const formattedCourses = (data || []).map(course => ({
        course_id: course.course_id,
        raw_course_material_id: course.raw_course_materials?.raw_course_material_id,
        display_name: `${course.course_types?.course_type_name} ${course.course_grade}학년 ${course.course_semester_id}학기`
      }))

      setCourses(formattedCourses)

      // Auto-select first course if available
      if (formattedCourses.length > 0) {
        setSelectedCourseId(formattedCourses[0].course_id.toString())
      }
    } catch (error) {
      console.error('Failed to fetch courses:', error)
      toast.error('교과 목록을 불러오는데 실패했습니다')
    } finally {
      setLoadingCourses(false)
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

  const handleSubmit = async () => {
    // Validation
    if (!selectedConversionId) {
      toast.error("교안을 선택해주세요")
      return
    }

    if (!selectedCourseId) {
      toast.error("교과를 선택해주세요")
      return
    }

    if (!subjectName.trim() || !topic.trim()) {
      toast.error("과목명과 주제는 필수 항목입니다")
      return
    }

    const validLearningGoals = learningGoals.filter(goal => goal.trim())
    const validExamples = examples.filter(ex => ex.question.trim() && ex.answer.trim())

    const subjectData: SubjectData = {
      subject_name: subjectName,
      topic: topic,
      difficulty: difficulty,
      learning_goals: validLearningGoals.length > 0 ? validLearningGoals : undefined,
      examples: validExamples.length > 0 ? validExamples : undefined
    }

    setLoading(true)
    try {
      // Get access token from Supabase session
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token

      if (!accessToken || !user?.id) {
        toast.error("인증 토큰을 가져올 수 없습니다. 다시 로그인해주세요.")
        setLoading(false)
        return
      }

      // Find selected course to get raw_course_material_id
      const selectedCourse = courses.find(c => c.course_id.toString() === selectedCourseId)
      if (!selectedCourse?.raw_course_material_id) {
        toast.error("교과 정보를 찾을 수 없습니다.")
        setLoading(false)
        return
      }

      const response = await generateMaterials({
        user_id: user.id,
        course_id: selectedCourse.raw_course_material_id,
        conversion_id: parseInt(selectedConversionId),
        component_id: componentId,
        subject_data: subjectData,
        class_duration_minutes: classDuration,
        num_items: numItems,
        preserve_structure: preserveStructure
      }, accessToken)

      // Check if generation was successful
      if (!response.success) {
        toast.error(
          response.message || '자료 생성에 실패했습니다',
          {
            duration: 4000,
            position: 'top-right'
          }
        )
        return
      }

      toast.success(
        '자료 생성이 완료되었습니다.',
        {
          duration: 4000,
          position: 'top-right'
        }
      )

      // Reset form
      setSelectedConversionId("")
      setSubjectName("")
      setTopic("")
      setDifficulty("medium")
      setLearningGoals([""])
      setExamples([{ question: "", answer: "" }])
      setClassDuration(20)
      setNumItems(5)

      onOpenChange(false)
      onSuccess?.()
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
      setLoading(false)
    }
  }

  const selectedConversion = conversions.find(c => c.id.toString() === selectedConversionId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>수업 자료 생성</DialogTitle>
          <DialogDescription>
            교과목 데이터를 입력하여 새로운 수업 자료를 생성합니다
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 교안 선택 */}
          <div className="space-y-2">
            <Label htmlFor="conversion">교안 선택 *</Label>
            {loadingConversions ? (
              <div className="flex items-center justify-center py-3 border rounded-md">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                <span className="text-sm text-muted-foreground">교안 목록 로딩 중...</span>
              </div>
            ) : conversions.length === 0 ? (
              <div className="py-3 px-4 border rounded-md bg-muted/50">
                <p className="text-sm text-muted-foreground">사용 가능한 교안이 없습니다</p>
              </div>
            ) : (
              <Select value={selectedConversionId} onValueChange={setSelectedConversionId}>
                <SelectTrigger>
                  <SelectValue placeholder="교안을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {conversions.map((conversion) => (
                    <SelectItem key={conversion.id} value={conversion.id.toString()}>
                      <div className="flex flex-col">
                        <span className="font-medium">{conversion.content_name}</span>
                        <span className="text-xs text-muted-foreground">
                          {conversion.original_filename} • {conversion.total_slides}개 슬라이드
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {selectedConversion && (
              <div className="text-xs text-muted-foreground space-y-1 pt-1">
                <p>• 프레임워크: {selectedConversion.framework}</p>
                <p>• 스타일링: {selectedConversion.styling}</p>
                <p>• 컴포넌트: {selectedConversion.total_components}개</p>
              </div>
            )}
          </div>

          {/* 교과 선택 */}
          <div className="space-y-2">
            <Label htmlFor="course">교과 선택 *</Label>
            {loadingCourses ? (
              <div className="flex items-center justify-center py-3 border rounded-md">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                <span className="text-sm text-muted-foreground">교과 목록 로딩 중...</span>
              </div>
            ) : courses.length === 0 ? (
              <div className="py-3 px-4 border rounded-md bg-muted/50">
                <p className="text-sm text-muted-foreground">사용 가능한 교과가 없습니다</p>
              </div>
            ) : (
              <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                <SelectTrigger>
                  <SelectValue placeholder="교과를 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((course) => (
                    <SelectItem key={course.course_id} value={course.course_id.toString()}>
                      {course.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* 기본 정보 */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subject">과목명 *</Label>
              <Input
                id="subject"
                placeholder="예: 초등 수학 3학년"
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="topic">주제 *</Label>
              <Input
                id="topic"
                placeholder="예: 곱셈과 나눗셈"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="difficulty">난이도</Label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">쉬움</SelectItem>
                  <SelectItem value="medium">보통</SelectItem>
                  <SelectItem value="hard">어려움</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 학습 목표 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>학습 목표</Label>
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

          {/* 예제 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>예제</Label>
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
                <div key={index} className="space-y-2 p-3 border rounded-lg">
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
            <div className="space-y-2">
              <Label htmlFor="duration">수업 시간 (분)</Label>
              <Input
                id="duration"
                type="number"
                min={1}
                max={180}
                value={classDuration}
                onChange={(e) => setClassDuration(parseInt(e.target.value) || 20)}
              />
              <p className="text-xs text-muted-foreground">
                약 {Math.round(classDuration * 0.8)}~{Math.round(classDuration * 1.25)}개 아이템 생성
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            취소
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            생성하기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
