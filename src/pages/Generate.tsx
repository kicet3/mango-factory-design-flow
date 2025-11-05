// Generate page for creating AI-powered course materials
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Slider } from "@/components/ui/slider"
import { ArrowRight, ArrowLeft, Sparkles, FileText, Presentation, Users, CheckCircle, Brain, Search } from "lucide-react"
import { Layout } from "@/components/layout/Layout"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "sonner"
import { MaterialDetailModal } from "@/components/gallery/MaterialDetailModal"

type GenerateStep = 'info' | 'format' | 'generating' | 'result'

interface TeacherInfo {
  class_grade: string
  class_semester: string
  class_mate_info: {
    male_student_count: number
    female_student_count: number
  }
}

interface CourseType {
  course_type_id: number
  course_type_name: string
}

interface TeachingStyle {
  teaching_style_id: number
  teaching_style_name: string
  teaching_style_desc: string
}

interface CoworkType {
  cowork_type_id: number
  cowork_type_name: string
}

interface Difficulty {
  difficulty_id: number
  difficulty_name: string
  difficulty_desc?: string
}

interface GenerationFormat {
  generation_format_name: string
  teaching_style_name: string
  generation_format_desc: string
  raw_generation_format_id: number
  is_recently_viewed?: boolean
}

interface FormData {
  course_type_id: number | null
  class_mate_info: { male_student_count: number; female_student_count: number } | null
  teaching_style_ids: number[]
  cowork_type_ids: number[]
  format_selection_additional_message: string
  format: string
  generation_additional_message: string
  selected_format_id: number | null
  selected_format_ids: number[]
  format_selection_attrs_id: number | null
  difficulty_id: number | null
  expected_duration_min: number | null
  course_material_scope: { course_sections_index: number; course_weeks_indices: number[] } | null
  use_v2: boolean
}

export default function Generate() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState<GenerateStep>('info')
  const [progress, setProgress] = useState(0)
  
  // Form state
  const [formData, setFormData] = useState<FormData>({
    course_type_id: null,
    class_mate_info: null,
    teaching_style_ids: [],
    cowork_type_ids: [],
    format_selection_additional_message: '',
    format: '',
    generation_additional_message: '',
    selected_format_id: null,
    selected_format_ids: [],
    format_selection_attrs_id: null,
    difficulty_id: 2, // Default to "보통" (normal)
    expected_duration_min: 45,
    course_material_scope: null,
    use_v2: false
  })
  
  // Data state
  const [teacherInfo, setTeacherInfo] = useState<TeacherInfo | null>(null)
  const [courseTypes, setCourseTypes] = useState<CourseType[]>([])
  const [selectedCourseType, setSelectedCourseType] = useState<number | null>(null)
  const [teachingStyles, setTeachingStyles] = useState<TeachingStyle[]>([])
  const [selectedTeachingStyles, setSelectedTeachingStyles] = useState<number[]>([])
  const [coworkTypes, setCoworkTypes] = useState<CoworkType[]>([])
  const [selectedCoworkTypes, setSelectedCoworkTypes] = useState<number[]>([])
  const [difficulties, setDifficulties] = useState<Difficulty[]>([])
  const [selectedDifficulty, setSelectedDifficulty] = useState<number | null>(2) // Default to "보통"
  const [selectedDuration, setSelectedDuration] = useState<number>(45)
  const [teacherInfoId, setTeacherInfoId] = useState<number | null>(null)
  const [maleStudents, setMaleStudents] = useState<number>(0)
  const [femaleStudents, setFemaleStudents] = useState<number>(0)
  const [loading, setLoading] = useState(false)
  const [generationFormats, setGenerationFormats] = useState<GenerationFormat[]>([])
  const [loadingFormats, setLoadingFormats] = useState(false)
  const [recentlyViewedFormatIds, setRecentlyViewedFormatIds] = useState<number[]>([])
  const [generationResponseId, setGenerationResponseId] = useState<number | null>(null)
  const [generationLoading, setGenerationLoading] = useState(false)
  const [completedGeneration, setCompletedGeneration] = useState(false)
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false)
  const [isAiRecommendationActive, setIsAiRecommendationActive] = useState(false)
  const [showTimeoutDialog, setShowTimeoutDialog] = useState(false)
  const [timeoutRef, setTimeoutRef] = useState<NodeJS.Timeout | null>(null)
  
  // Course material scope states
  const [courseMaterialScopes, setCourseMaterialScopes] = useState<any[]>([])
  const [loadingCourseMaterialScope, setLoadingCourseMaterialScope] = useState(false)
  const [selectedUnitIndex, setSelectedUnitIndex] = useState<number | null>(null)
  const [selectedLessonIndices, setSelectedLessonIndices] = useState<number[]>([])
  const [showLessons, setShowLessons] = useState(false)
  
  // Material detail modal states
  const [showMaterialDetailModal, setShowMaterialDetailModal] = useState(false)
  const [selectedMaterialId, setSelectedMaterialId] = useState<number | null>(null)

  // Load initial data
  useEffect(() => {
    if (user) {
      loadTeacherInfo()
      loadCourseTypes()
      loadTeachingStyles()
      loadCoworkTypes()
      loadDifficulties()
    }
  }, [user])

  // 4-minute timeout for generation
  useEffect(() => {
    if (step === 'generating') {
      const timeout = setTimeout(() => {
        setShowTimeoutDialog(true)
      }, 4 * 60 * 1000) // 4분 = 240초 = 240,000ms
      
      setTimeoutRef(timeout)
      
      return () => {
        clearTimeout(timeout)
      }
    } else {
      // Clear timeout if step changes
      if (timeoutRef) {
        clearTimeout(timeoutRef)
        setTimeoutRef(null)
      }
    }
  }, [step, timeoutRef])

  const loadTeacherInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('teacher_info')
        .select('teacher_info_id, class_info')
        .eq('user_id', user?.id as any)
        .single()

      if (error) throw error
      
      if (data?.class_info) {
        const classInfo = data.class_info as unknown as TeacherInfo
        setTeacherInfo(classInfo)
        setTeacherInfoId(data.teacher_info_id)
        setMaleStudents(classInfo.class_mate_info?.male_student_count || 0)
        setFemaleStudents(classInfo.class_mate_info?.female_student_count || 0)
        
        // Load user's preferred teaching styles
        if (data.teacher_info_id) {
          loadUserTeachingStyles(data.teacher_info_id)
        }
      }
    } catch (error) {
      console.error('Error loading teacher info:', error)
      toast.error('교사 정보를 불러오는데 실패했습니다.')
    }
  }

  const loadCourseTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('course_types')
        .select('course_type_id, course_type_name, course_type_desc')
        .order('course_type_id')

      if (error) throw error
      setCourseTypes(data || [])
    } catch (error) {
      console.error('Error loading course types:', error)
    }
  }

  const loadTeachingStyles = async () => {
    try {
      const { data, error } = await supabase
        .from('teaching_styles')
        .select('teaching_style_id, teaching_style_name, teaching_style_desc')
        .eq('open_status', true)
        .order('teaching_style_id')

      if (error) throw error
      setTeachingStyles(data || [])
    } catch (error) {
      console.error('Error loading teaching styles:', error)
    }
  }

  const loadCoworkTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('cowork_types')
        .select('cowork_type_id, cowork_type_name')
        .order('cowork_type_id')

      if (error) throw error
      setCoworkTypes(data || [])
    } catch (error) {
      console.error('Error loading cowork types:', error)
    }
  }

  const loadDifficulties = async () => {
    try {
      const { data, error } = await supabase
        .from('difficulties')
        .select('difficulty_id, difficulty_name, difficulty_desc')
        .order('difficulty_id')

      if (error) throw error
      setDifficulties(data || [])
    } catch (error) {
      console.error('Error loading difficulties:', error)
    }
  }

  // Load recently viewed formats (within 24 hours)
  const loadRecentlyViewedFormats = async () => {
    if (!user) return []
    
    try {
      const oneDayAgo = new Date()
      oneDayAgo.setDate(oneDayAgo.getDate() - 1)
      
      const { data, error } = await supabase
        .from('user_material_interactions')
        .select('raw_generation_format_id')
        .eq('user_id', user.id)
        .eq('interaction_type_id', 1) // 1 = 'view'
        .gte('created_at', oneDayAgo.toISOString())
        .order('created_at', { ascending: false })
      
      if (error) throw error
      
      const formatIds = data?.map(item => item.raw_generation_format_id) || []
      const uniqueFormatIds = [...new Set(formatIds)] // Remove duplicates
      
      setRecentlyViewedFormatIds(uniqueFormatIds)
      return uniqueFormatIds
    } catch (error) {
      console.error('Error loading recently viewed formats:', error)
      return []
    }
  }

  // Record user interaction with material
  const recordMaterialInteraction = async (formatId: number, interactionType: 'view' | 'generate' = 'view') => {
    if (!user) return
    
    try {
      // Get interaction type id
      const typeMap = { 'view': 1, 'generate': 2, 'download': 3 }
      const interactionTypeId = typeMap[interactionType]
      
      const { error } = await supabase
        .from('user_material_interactions')
        .insert({
          user_id: user.id,
          raw_generation_format_id: formatId,
          interaction_type_id: interactionTypeId
        })
      
      if (error) throw error
      
      // Update recently viewed formats if it's a view interaction
      if (interactionType === 'view') {
        setRecentlyViewedFormatIds(prev => {
          const updated = [formatId, ...prev.filter(id => id !== formatId)]
          return updated.slice(0, 10) // Keep only last 10
        })
      }
    } catch (error) {
      console.error('Error recording material interaction:', error)
    }
  }

  // Handle AI recommendation activation
  const handleAiRecommendation = () => {
    setIsAiRecommendationActive(true)
    setShowAdvancedSettings(false)
  }

  // Handle manual settings changes (deactivates AI recommendation)
  const handleManualChange = () => {
    if (isAiRecommendationActive) {
      setIsAiRecommendationActive(false)
    }
  }

  // Check if all items are selected
  const areAllTeachingStylesSelected = () => {
    return teachingStyles.length > 0 && selectedTeachingStyles.length === teachingStyles.length
  }

  const areAllCoworkTypesSelected = () => {
    return coworkTypes.length > 0 && selectedCoworkTypes.length === coworkTypes.length
  }

  // Toggle select all functions
  const handleToggleAllTeachingStyles = () => {
    if (areAllTeachingStylesSelected()) {
      // Deselect all
      setSelectedTeachingStyles([])
      setFormData(prev => ({ ...prev, teaching_style_ids: [] }))
    } else {
      // Select all
      const allIds = teachingStyles.map(style => style.teaching_style_id)
      setSelectedTeachingStyles(allIds)
      setFormData(prev => ({ ...prev, teaching_style_ids: allIds }))
    }
  }

  const handleToggleAllCoworkTypes = () => {
    if (areAllCoworkTypesSelected()) {
      // Deselect all
      setSelectedCoworkTypes([])
      setFormData(prev => ({ ...prev, cowork_type_ids: [] }))
    } else {
      // Select all
      const allIds = coworkTypes.map(type => type.cowork_type_id)
      setSelectedCoworkTypes(allIds)
      setFormData(prev => ({ ...prev, cowork_type_ids: allIds }))
    }
  }

  const loadUserTeachingStyles = async (teacherInfoId: number) => {
    try {
      const { data, error } = await supabase
        .from('teacher_teaching_style_map')
        .select('teaching_style_id')
        .eq('teacher_info_id', teacherInfoId)

      if (error) throw error
      
      const styleIds = data?.map(item => item.teaching_style_id) || []
      setSelectedTeachingStyles(styleIds)
      setFormData(prev => ({ ...prev, teaching_style_ids: styleIds }))
    } catch (error) {
      console.error('Error loading user teaching styles:', error)
    }
  }

  const loadCourseMaterialScope = async (courseTypeId: number) => {
    if (!user || !teacherInfo || !teacherInfoId) return

    try {
      setLoadingCourseMaterialScope(true)
      
      // 1. courses 테이블에서 course_id 구하기
      const classInfo = teacherInfo as any
      const classGrade = classInfo.class_grade
      const classSemester = classInfo.class_semester
      
      // teacher_course_type_course_material_publisher_map에서 course_material_publisher_id 가져오기
      const { data: publisherMapData, error: publisherMapError } = await supabase
        .from('teacher_course_type_course_material_publisher_map')
        .select('course_material_publisher_id')
        .eq('teacher_info_id', teacherInfoId)
        .eq('course_type_id', courseTypeId)
        .maybeSingle()
      
      if (publisherMapError) throw publisherMapError
      
      // 출판사 설정이 없는 경우 에러 메시지 표시
      if (!publisherMapData) {
        const courseTypeName = courseTypes.find(ct => ct.course_type_id === courseTypeId)?.course_type_name || '해당 과목'
        setCourseMaterialScopes([])
        toast.error(`수업자료 설정에서 ${courseTypeName}과목 출판사를 지정해주세요`)
        return
      }
      
      const courseMaterialPublisherId = publisherMapData.course_material_publisher_id
      
      // courses 테이블에서 course_id 찾기
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select('course_id')
        .eq('course_type_id', courseTypeId)
        .eq('course_grade', classGrade)
        .eq('course_semester_id', classSemester)
        .eq('course_material_publisher_id', courseMaterialPublisherId || 1)
        .limit(1)
        .maybeSingle()
      
      if (coursesError) throw coursesError
      
      if (!coursesData) {
        console.log('Course not found')
        setCourseMaterialScopes([])
        return
      }
      
      // 2. raw_course_materials에서 raw_course_materials_id 구하기
      const { data: rawCourseMaterialsData, error: rawCourseMaterialsError } = await supabase
        .from('raw_course_materials')
        .select('raw_course_material_id')
        .eq('course_id', coursesData.course_id)
        .maybeSingle()
      
      if (rawCourseMaterialsError) throw rawCourseMaterialsError
      
      if (!rawCourseMaterialsData) {
        console.log('Raw course materials not found')
        setCourseMaterialScopes([])
        return
      }
      
      // 3. course_materials에서 course_material_id 구하기
      const { data: courseMaterialsData, error: courseMaterialsError } = await supabase
        .from('course_materials')
        .select('course_material_id')
        .eq('raw_course_material_id', rawCourseMaterialsData.raw_course_material_id)
        .maybeSingle()
      
      if (courseMaterialsError) throw courseMaterialsError
      
      if (!courseMaterialsData) {
        console.log('Course materials not found')
        setCourseMaterialScopes([])
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
        setCourseMaterialScopes(parsedStructure)
      } else {
        console.log('No course structure found')
        setCourseMaterialScopes([])
      }
      
    } catch (error) {
      console.error('Error loading course material scope:', error)
      setCourseMaterialScopes([])
      toast.error('교재 범위를 불러오는데 실패했습니다.')
    } finally {
      setLoadingCourseMaterialScope(false)
    }
  }

  const handleUnitSelect = (unitIndex: number) => {
    console.log('Unit selected:', unitIndex)
    console.log('Course material scopes:', courseMaterialScopes)
    console.log('Selected unit data:', courseMaterialScopes[unitIndex])
    console.log('Section weeks:', courseMaterialScopes[unitIndex]?.section_weeks)
    
    setSelectedUnitIndex(unitIndex)
    setSelectedLessonIndices([])
    setShowLessons(true)
  }

  const handleLessonToggle = (lessonIndex: number) => {
    setSelectedLessonIndices(prev => {
      if (prev.includes(lessonIndex)) {
        return prev.filter(index => index !== lessonIndex)
      } else {
        return [...prev, lessonIndex]
      }
    })
  }

  const handleSelectAllLessons = () => {
    if (selectedUnitIndex !== null && courseMaterialScopes[selectedUnitIndex]?.section_weeks) {
      const allLessonIndices = courseMaterialScopes[selectedUnitIndex].section_weeks.map((_: any, index: number) => index)
      setSelectedLessonIndices(allLessonIndices)
    }
  }

  const handleDeselectAllLessons = () => {
    setSelectedLessonIndices([])
  }

  const isAllLessonsSelected = () => {
    if (selectedUnitIndex === null || !courseMaterialScopes[selectedUnitIndex]?.section_weeks) return false
    const totalLessons = courseMaterialScopes[selectedUnitIndex].section_weeks.length
    return selectedLessonIndices.length === totalLessons && totalLessons > 0
  }

  const handleNext = async () => {
    if (step === 'info') {
      // Validate required fields
      if (!formData.course_type_id || formData.teaching_style_ids.length === 0 || formData.cowork_type_ids.length === 0) {
        toast.error('모든 필수 항목을 입력해주세요.')
        return
      }

      // Validate course material scope selection
      if (selectedUnitIndex === null || selectedLessonIndices.length === 0) {
        toast.error('단원과 차시를 선택해주세요.')
        return
      }

      // Update formData with selected course material scope
      const courseMaterialScope = {
        course_sections_index: selectedUnitIndex,
        course_weeks_indices: selectedLessonIndices
      }
      
      setFormData(prev => ({
        ...prev,
        course_material_scope: courseMaterialScope
      }))

      try {
        setLoading(true)

        // Prepare data for format_selection_attrs with course_type_id
        const formatSelectionData = {
          course_type_id: formData.course_type_id,
          class_mate_info: { male_student_count: maleStudents, female_student_count: femaleStudents },
          format_selection_additional_message: formData.format_selection_additional_message || '',
          course_material_scope: courseMaterialScope,
          difficulty_id: formData.difficulty_id,
          expected_duration_min: formData.expected_duration_min,
          user_id: user?.id
        }

        // Insert into format_selection_attrs
        const { data: formatSelectionAttrsData, error: formatSelectionAttrsError } = await supabase
          .from('format_selection_attrs')
          .insert([formatSelectionData])
          .select()
          .single()

        if (formatSelectionAttrsError) throw formatSelectionAttrsError

        // Insert teaching styles into association table
        if (formData.teaching_style_ids.length > 0) {
          const teachingStyleMappings = formData.teaching_style_ids.map(styleId => ({
            format_selection_attrs_id: formatSelectionAttrsData.format_selection_attrs_id,
            teaching_style_id: styleId
          }))

          const { error: teachingStyleError } = await supabase
            .from('format_selection_attrs_teaching_style_map')
            .insert(teachingStyleMappings)

          if (teachingStyleError) throw teachingStyleError
        }

        // Insert cowork types into association table
        if (formData.cowork_type_ids.length > 0) {
          const coworkTypeMappings = formData.cowork_type_ids.map(coworkTypeId => ({
            format_selection_attrs_id: formatSelectionAttrsData.format_selection_attrs_id,
            cowork_type_id: coworkTypeId
          }))

          const { error: coworkTypeError } = await supabase
            .from('format_selection_attrs_cowork_type_map')
            .insert(coworkTypeMappings)

          if (coworkTypeError) throw coworkTypeError
        }

        // format_selection_attrs_id를 formData에 저장
        setFormData(prev => ({ 
          ...prev, 
          format_selection_attrs_id: formatSelectionAttrsData.format_selection_attrs_id 
        }))

        // Call edge function to request format recommendation
        try {
          setLoadingFormats(true)
          const { data: functionData, error: functionError } = await supabase.functions.invoke('request-format-recommendation', {
            body: {
              format_selection_attrs_id: formatSelectionAttrsData.format_selection_attrs_id,
              user_id: user?.id
            }
          })

          if (functionError) {
            console.error('Error calling request-format-recommendation:', functionError)
            toast.error('포맷 추천 요청에 실패했습니다.')
          } else if (functionData?.success && functionData?.data) {
            // Flatten the nested array structure from the API response
            const flattenedData = Array.isArray(functionData.data) 
              ? functionData.data.flat() 
              : functionData.data
            
            // Load recently viewed formats and sort
            const recentIds = await loadRecentlyViewedFormats()
            
            // Add recently viewed flag and sort
            const formatsWithRecentFlag = flattenedData.map((format: GenerationFormat) => ({
              ...format,
              is_recently_viewed: recentIds.includes(format.raw_generation_format_id)
            }))
            
            // Sort: recently viewed formats first, then others
            const sortedFormats = formatsWithRecentFlag.sort((a: GenerationFormat, b: GenerationFormat) => {
              if (a.is_recently_viewed && !b.is_recently_viewed) return -1
              if (!a.is_recently_viewed && b.is_recently_viewed) return 1
              return 0
            })
            
            setGenerationFormats(sortedFormats)
          } else {
            console.error('Invalid response from format recommendation:', functionData)
            toast.error('포맷 추천 응답이 올바르지 않습니다.')
          }
        } catch (error) {
          console.error('Error in format recommendation request:', error)
          toast.error('포맷 추천 요청 중 오류가 발생했습니다.')
        } finally {
          setLoadingFormats(false)
        }

        toast.success('정보가 저장되었습니다.')
        setStep('format')
      } catch (error) {
        console.error('Error saving data:', error)
        toast.error('정보 저장에 실패했습니다.')
      } finally {
        setLoading(false)
      }
    } else if (step === 'format') {
      // Validate format selection
      if (formData.selected_format_ids.length === 0) {
        toast.error('포맷을 선택해주세요.')
        return
      }

      // Record generate interactions for selected formats
      for (const formatId of formData.selected_format_ids) {
        await recordMaterialInteraction(formatId, 'generate')
      }

      await handleGenerationRequest()
    }
  }

  const handleBack = () => {
    if (step === 'format') {
      setStep('info')
    } else if (step === 'generating') {
      setStep('format')
    }
  }

  const handleGenerationRequest = async () => {
    try {
      setGenerationLoading(true)
      setStep('generating')
      setProgress(0)
      
      // 랜덤 진행바 시뮬레이션 시작
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          const randomIncrement = Math.random() * 15 + 15 // 15-30% 증가
          const newProgress = prev + randomIncrement
          
          // 95%까지만 진행
          if (newProgress >= 95) {
            clearInterval(progressInterval)
            return 95
          }
          
          return newProgress
        })
      }, Math.random() * 5000 + 10000) // 10-15초 간격
      
      // format_selection_attrs에서 데이터 조회 (연관 테이블 사용)
      const { data: formatSelectionData, error: selectionError } = await supabase
        .from('format_selection_attrs')
        .select('class_mate_info, course_type_id, format_selection_additional_message')
        .eq('format_selection_attrs_id', formData.format_selection_attrs_id)
        .single()

      if (selectionError) throw selectionError

      // 선택된 협업 유형 가져오기 (단일 선택 기준, 없으면 null)
      const { data: coworkMapRows, error: coworkMapError } = await supabase
        .from('format_selection_attrs_cowork_type_map')
        .select('cowork_type_id')
        .eq('format_selection_attrs_id', formData.format_selection_attrs_id)
      if (coworkMapError) throw coworkMapError
      const selectedCoworkTypeIds = (coworkMapRows || []).map((row: any) => row.cowork_type_id)

      // 선택된 교수학습 스타일 가져오기 (다중 선택)
      const { data: tsMapRows, error: tsMapError } = await supabase
        .from('format_selection_attrs_teaching_style_map')
        .select('teaching_style_id')
        .eq('format_selection_attrs_id', formData.format_selection_attrs_id)
      if (tsMapError) throw tsMapError
      const selectedTeachingStyleIds = (tsMapRows || []).map((row: any) => row.teaching_style_id)
      
      // 다중 포맷 선택을 위한 Edge Function 호출
      const { data: functionData, error: functionError } = await supabase.functions.invoke('request-multiple-generation', {
        body: {
          format_selection_attrs_id: formData.format_selection_attrs_id,
          selected_format_ids: formData.selected_format_ids,
          class_mate_info: formatSelectionData.class_mate_info,
          course_type_id: formatSelectionData.course_type_id,
          course_material_scope: formData.course_material_scope,
          difficulty_id: formData.difficulty_id,
          expected_duration_min: formData.expected_duration_min,
          generation_additional_message: formData.generation_additional_message || null,
        selected_teaching_style_ids: selectedTeachingStyleIds,
        selected_cowork_type_ids: selectedCoworkTypeIds,
        user_id: user?.id,
        use_v2: formData.use_v2
      }
      })

      if (functionError) {
        console.error('Error calling multiple generation function:', functionError)
        toast.error('생성 요청에 실패했습니다.')
        clearInterval(progressInterval)
        return
      }

      if (functionData?.success && functionData?.generation_attrs_ids?.length > 0) {
        const attrsIds = functionData.generation_attrs_ids
        toast.success('생성 요청이 완료되었습니다. 잠시만 기다려주세요...')
        
        // 폴링 시작: generation_attrs_id로 최신 generation_response 확인
        const pollInterval = setInterval(async () => {
          try {
            // 각 generation_attrs_id의 최신 generation_response 조회
            const { data: responses, error: pollError } = await supabase
              .from('generation_responses')
              .select('generation_response_id, generation_attrs_id, generation_status_type_id, created_at')
              .in('generation_attrs_id', attrsIds)
              .order('created_at', { ascending: false })

            if (pollError) {
              console.error('Polling error:', pollError)
              return
            }

            if (!responses || responses.length === 0) {
              return // 아직 생성되지 않음
            }

            // 각 attrs_id별 최신 response 찾기
            const latestResponses = attrsIds.map(attrsId => {
              const attrsResponses = responses.filter(r => r.generation_attrs_id === attrsId)
              return attrsResponses[0] // 이미 created_at desc로 정렬되어 있으므로 첫 번째가 최신
            }).filter(Boolean)

            // 모든 attrs_id에 대해 response가 있는지 확인
            if (latestResponses.length !== attrsIds.length) {
              return // 아직 모든 response가 생성되지 않음
            }

            // 모든 생성이 완료(4) 또는 실패(3)인지 확인
            const allCompleted = latestResponses.every(r => 
              r.generation_status_type_id === 4 || r.generation_status_type_id === 3
            )

            if (allCompleted) {
              clearInterval(pollInterval)
              clearInterval(progressInterval)
              
              const successResponses = latestResponses.filter(r => r.generation_status_type_id === 4)
              const failedCount = latestResponses.length - successResponses.length

              if (successResponses.length > 0) {
                setProgress(100)
                setCompletedGeneration(true)
                
                const firstSuccessId = successResponses[0].generation_response_id
                setGenerationResponseId(firstSuccessId)
                
                if (failedCount > 0) {
                  toast.success(`${successResponses.length}개 생성 완료, ${failedCount}개 실패`)
                } else {
                  toast.success(`${successResponses.length}개의 자료 생성이 완료되었습니다!`)
                }
                
                setTimeout(() => {
                  navigate(`/generation/${firstSuccessId}`)
                }, 1000)
              } else {
                toast.error('모든 생성이 실패했습니다.')
                setGenerationLoading(false)
              }
            }
          } catch (error) {
            console.error('Polling error:', error)
          }
        }, 3000) // 3초마다 체크
      } else {
        clearInterval(progressInterval)
        console.log('Invalid response structure:', functionData)
        toast.error('생성 요청 응답이 올바르지 않습니다.')
      }

    } catch (error) {
      console.error('Error in generation request:', error)
      const msg = String((error as any)?.message || '')
      const timeoutLike = /timeout|timed out|time out|aborted|network|fetch failed/i.test(msg)
      if (timeoutLike) {
        toast.info('요청이 많아 생성 시간이 조금 더 걸리네요 ㅠㅠ 생성 자료는 잠시 후 생성 이력에서 확인할 수 있습니다!')
      } else {
        toast.error('생성 요청 중 오류가 발생했습니다.')
      }
    } finally {
      setGenerationLoading(false)
    }
  }

  const handleTimeoutDialogClose = () => {
    setShowTimeoutDialog(false)
    navigate('/history')
  }

  const getStepNumber = () => {
    switch (step) {
      case 'info': return 1
      case 'format': return 2
      case 'generating': return 3
      case 'result': return 3
      default: return 1
    }
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-primary-light/10 via-background to-secondary/20">
        <div className="container mx-auto max-w-4xl px-6 py-8">
          {/* Progress Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-3xl font-bold">수업자료 생성</h1>
              <Badge variant="outline">
                단계 {getStepNumber()}/3
              </Badge>
            </div>
            <div className="flex items-center gap-4">
              {['정보 입력', '수업활동 선택', 'AI 생성'].map((stepName, index) => (
                <div key={stepName} className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-base font-medium transition-colors ${
                    index < getStepNumber() ? 'bg-primary text-primary-foreground' : 
                    index === getStepNumber() - 1 ? 'bg-primary text-primary-foreground' : 
                    'bg-muted text-muted-foreground'
                  }`}>
                    {index + 1}
                  </div>
                  <span className={`text-base ${index < getStepNumber() ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                    {stepName}
                  </span>
                  {index < 2 && (
                    <ArrowRight className="w-4 h-4 text-muted-foreground mx-2" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Step Content */}
          {step === 'info' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Left Column */}
              <div className="mf-compact-spacing">
                {/* 과목 선택 */}
                <Card className="mf-card mf-compact-card animate-scale-in">
                  <CardHeader className="mf-compact-header">
                    <CardTitle className="mf-compact-title">과목 선택</CardTitle>
                    <CardDescription className="mf-compact-description">수업자료를 생성할 과목을 선택해주세요</CardDescription>
                  </CardHeader>
                  <CardContent className="mf-compact-spacing">
                    {/* 학년/학기 표시 */}
                    {teacherInfo && (
                      <div className="grid grid-cols-2 gap-2">
                        <div className="mf-tight-spacing">
                          <Label className="text-sm">학년</Label>
                          <div className="p-1.5 bg-muted rounded-md text-sm font-medium">
                            {teacherInfo.class_grade}학년
                          </div>
                        </div>
                        <div className="mf-tight-spacing">
                          <Label className="text-sm">학기</Label>
                          <div className="p-1.5 bg-muted rounded-md text-sm font-medium">
                            {teacherInfo.class_semester}학기
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 과목 선택 */}
                    <div className="mf-tight-spacing">
                      <Label className="text-sm">과목</Label>
                      <Select 
                        value={selectedCourseType?.toString() || ''} 
                        onValueChange={(value) => {
                          const courseTypeId = parseInt(value)
                          setSelectedCourseType(courseTypeId)
                          setFormData(prev => ({ ...prev, course_type_id: courseTypeId }))
                          handleManualChange()
                          // Reset unit/lesson selection when course type changes
                          setSelectedUnitIndex(null)
                          setSelectedLessonIndices([])
                          setShowLessons(false)
                          // Load course material scope when course type changes
                          loadCourseMaterialScope(courseTypeId)
                        }}
                      >
                        <SelectTrigger className="text-sm">
                          <SelectValue placeholder="과목을 선택하세요" />
                        </SelectTrigger>
                        <SelectContent>
                          {courseTypes.map(courseType => (
                            <SelectItem key={courseType.course_type_id} value={courseType.course_type_id.toString()}>
                              {courseType.course_type_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                {/* 교재 범위 선택 */}
                {selectedCourseType && (
                  <Card className="mf-card mf-compact-card animate-scale-in">
                    <CardHeader className="mf-compact-header">
                      <CardTitle className="mf-compact-title flex items-center justify-between">
                        교재 범위 선택
                        {selectedUnitIndex !== null && courseMaterialScopes[selectedUnitIndex]?.section_weeks && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={isAllLessonsSelected() ? handleDeselectAllLessons : handleSelectAllLessons}
                          >
                            {isAllLessonsSelected() ? '전체 해제' : '전체 선택'}
                          </Button>
                        )}
                      </CardTitle>
                      {selectedUnitIndex !== null && (
                        <CardDescription className="mf-compact-description">차시 선택 (복수 선택 가능)</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="mf-compact-spacing">
                      {loadingCourseMaterialScope ? (
                        <div className="flex items-center justify-center py-4">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-primary animate-spin" />
                            <span className="text-sm text-muted-foreground">교재 범위를 불러오는 중...</span>
                          </div>
                        </div>
                       ) : courseMaterialScopes.length > 0 ? (
                          <div className="space-y-4">
                            <div className="space-y-3 max-h-80 overflow-y-auto">
                             {courseMaterialScopes.map((scope, index) => (
                               <div key={index} className="space-y-2">
                                 {/* 단원 선택 */}
                                 <div 
                                   className={`p-3 border rounded-lg cursor-pointer transition-all duration-200 ${
                                     selectedUnitIndex === index
                                       ? 'bg-primary/10 border-primary/20 shadow-sm'
                                       : 'bg-card hover:bg-muted/50 border-border'
                                   }`}
                                   onClick={() => handleUnitSelect(index)}
                                 >
                                    <div className="flex items-center justify-between">
                                      <span className="text-base font-medium">
                                        {index + 1}단원: {scope.section_name || `${index + 1}단원`}
                                      </span>
                                    </div>
                                 </div>

                                   {/* 차시 선택 - 선택된 단원 바로 아래에 표시 */}
                                   {selectedUnitIndex === index && showLessons && scope.section_weeks && (
                                     <div className="ml-4 pl-4 border-l-2 border-primary/20 space-y-2 animate-in slide-in-from-top-2 duration-200">
                                     <div className="space-y-2 max-h-48 overflow-y-auto">
                                       {scope.section_weeks.map((week: any, weekIndex: number) => (
                                         <div key={weekIndex} className="flex items-start space-x-3 p-2 rounded hover:bg-muted/30 transition-colors">
                                           <Checkbox
                                             id={`lesson-${weekIndex}`}
                                             checked={selectedLessonIndices.includes(weekIndex)}
                                             onCheckedChange={() => handleLessonToggle(weekIndex)}
                                             className="mt-0.5"
                                           />
                                            <Label 
                                              htmlFor={`lesson-${weekIndex}`} 
                                              className="text-base flex-1 cursor-pointer leading-relaxed"
                                            >
                                               {week.section_content_name ? (
                                                 <>
                                                   <span className="font-medium text-primary">
                                                     [{week.section_content_order}차시]
                                                   </span>{' '}
                                                   {week.section_content_name}
                                                   {week.section_content_pages && week.section_content_pages.length > 0 && (
                                                     <span className="text-muted-foreground">
                                                       {' '}({Math.min(...week.section_content_pages)}-{Math.max(...week.section_content_pages)}쪽)
                                                     </span>
                                                   )}
                                                 </>
                                               ) : (
                                                 <span className="font-medium text-primary">
                                                   [{weekIndex + 1}차시]
                                                 </span>
                                               )}
                                             </Label>
                                         </div>
                                       ))}
                                     </div>
                                   </div>
                                 )}
                               </div>
                             ))}
                           </div>
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground py-2">
                          {selectedCourseType ? '해당 과목의 교재 범위가 없습니다.' : '과목을 먼저 선택해주세요.'}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                {/* 협동 방식 */}
                <Card className="mf-card">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      협동 방식
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleToggleAllCoworkTypes}
                      >
                        {areAllCoworkTypesSelected() ? '전체 해제' : '전체 선택'}
                      </Button>
                    </CardTitle>
                    <CardDescription>수업에서 사용할 협동 방식을 선택해주세요.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {coworkTypes.map((type) => (
                        <div key={type.cowork_type_id} className="flex items-start space-x-3">
                          <Checkbox
                            id={`cowork-${type.cowork_type_id}`}
                            checked={selectedCoworkTypes.includes(type.cowork_type_id)}
                            onCheckedChange={(checked) => {
                              handleManualChange()
                              if (checked) {
                                const newTypes = [...selectedCoworkTypes, type.cowork_type_id]
                                setSelectedCoworkTypes(newTypes)
                                setFormData(prev => ({ ...prev, cowork_type_ids: newTypes }))
                              } else {
                                const newTypes = selectedCoworkTypes.filter(id => id !== type.cowork_type_id)
                                setSelectedCoworkTypes(newTypes)
                                setFormData(prev => ({ ...prev, cowork_type_ids: newTypes }))
                              }
                            }}
                          />
                          <div className="space-y-1">
                            <Label htmlFor={`cowork-${type.cowork_type_id}`} className="font-medium">
                              {type.cowork_type_name}
                            </Label>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* 자료 생성 메세지 */}
                <Card className="mf-card">
                  <CardHeader>
                    <CardTitle>자료 생성 메세지 (런칭 예정)</CardTitle>
                    <CardDescription>추가 요구사항이나 특별한 지시사항이 있다면 입력해주세요.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      placeholder="예: 어려운 개념은 쉽게 설명해주세요, 그림 자료를 많이 포함해주세요 등"
                      value={formData.format_selection_additional_message}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, format_selection_additional_message: e.target.value }))
                        handleManualChange()
                      }}
                      rows={3}
                    />
                  </CardContent>
                </Card>

                {/* AI 추천 설정 / 세부 설정 */}
                <Card className="mf-card">
                  <CardHeader>
                    <CardTitle>세부 옵션 설정</CardTitle>
                    <CardDescription>AI 추천을 받거나 세부 설정을 조정하세요.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-4">
                      <div className="flex gap-3">
                        <Button 
                          className={`flex-1 transition-all duration-300 ${
                            isAiRecommendationActive 
                              ? 'mf-mango-button group shadow-lg border-2 border-orange-400' 
                              : 'mf-mango-button group'
                          }`}
                          onClick={handleAiRecommendation}
                        >
                          <Brain className="w-4 h-4 mr-2 sparkle" />
                          AI 추천 설정
                          <Sparkles className="w-4 h-4 ml-2 sparkle" />
                        </Button>
                         <Button 
                           variant="outline" 
                           className="flex-1"
                           onClick={() => {
                             setShowAdvancedSettings(!showAdvancedSettings)
                             handleManualChange()
                           }}
                         >
                           직접 설정
                         </Button>
                      </div>
                      
                      {/* AI 추천 설정 활성화 상태 표시 */}
                      {isAiRecommendationActive && (
                        <div className="flex items-center gap-2 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                          <CheckCircle className="w-4 h-4 text-orange-600" />
                          <span className="text-base font-medium text-orange-700 dark:text-orange-300">
                            AI 추천 설정 활용 중
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

                {/* Advanced Settings (shown when toggled) */}
              {showAdvancedSettings && (
                <div className="lg:col-span-2 space-y-6">
                  {/* 난이도 및 소요시간 */}
                  <Card className="mf-card">
                    <CardHeader>
                      <CardTitle>세부 옵션</CardTitle>
                      <CardDescription>수업자료의 난이도와 예상 소요시간을 설정해주세요.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* 난이도 선택 */}
                      <div className="space-y-3">
                        <Label className="text-base font-medium">난이도</Label>
                        <div className="flex gap-2">
                          {difficulties.map((difficulty) => (
                            <Button
                              key={difficulty.difficulty_id}
                              variant={selectedDifficulty === difficulty.difficulty_id ? "default" : "outline"}
                              size="sm"
                              onClick={() => {
                                setSelectedDifficulty(difficulty.difficulty_id)
                                setFormData(prev => ({ ...prev, difficulty_id: difficulty.difficulty_id }))
                                handleManualChange()
                              }}
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
                          onValueChange={(value) => {
                            setSelectedDuration(value[0])
                            setFormData(prev => ({ ...prev, expected_duration_min: value[0] }))
                            handleManualChange()
                          }}
                          min={15}
                          max={120}
                          step={5}
                          className="w-full"
                        />
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>15분</span>
                          <span>60분</span>
                          <span>120분</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* 학급 정보 */}
                  <Card className="mf-card">
                    <CardHeader>
                      <CardTitle>학급 정보</CardTitle>
                      <CardDescription>생성할 수업자료의 학급 정보입니다.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>남학생 수</Label>
                          <Input
                            type="number"
                            value={maleStudents}
                            onChange={(e) => {
                              setMaleStudents(parseInt(e.target.value) || 0)
                              handleManualChange()
                            }}
                            min="0"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>여학생 수</Label>
                          <Input
                            type="number"
                            value={femaleStudents}
                            onChange={(e) => {
                              setFemaleStudents(parseInt(e.target.value) || 0)
                              handleManualChange()
                            }}
                            min="0"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* 선호 수업 스타일 */}
                  <Card className="mf-card">
                    <CardHeader>
                       <CardTitle className="flex items-center justify-between">
                         선호 수업 스타일
                         <Button
                           variant="outline"
                           size="sm"
                           onClick={handleToggleAllTeachingStyles}
                         >
                           {areAllTeachingStylesSelected() ? '전체 해제' : '전체 선택'}
                         </Button>
                       </CardTitle>
                      <CardDescription>선호하시는 수업 스타일을 선택해주세요.</CardDescription>
                    </CardHeader>
                    <CardContent>
                       <div className="space-y-3">
                         {teachingStyles.map((style) => (
                           <div key={style.teaching_style_id} className="flex items-start space-x-3">
                             <Checkbox
                               id={`style-${style.teaching_style_id}`}
                               checked={selectedTeachingStyles.includes(style.teaching_style_id)}
                                onCheckedChange={(checked) => {
                                  handleManualChange()
                                  if (checked) {
                                    const newStyles = [...selectedTeachingStyles, style.teaching_style_id]
                                    setSelectedTeachingStyles(newStyles)
                                    setFormData(prev => ({ ...prev, teaching_style_ids: newStyles }))
                                  } else {
                                    const newStyles = selectedTeachingStyles.filter(id => id !== style.teaching_style_id)
                                   setSelectedTeachingStyles(newStyles)
                                   setFormData(prev => ({ ...prev, teaching_style_ids: newStyles }))
                                 }
                               }}
                             />
                             <div className="space-y-1">
                               <Label htmlFor={`style-${style.teaching_style_id}`} className="font-medium">
                                 {style.teaching_style_name}
                               </Label>
                               {style.teaching_style_name === "선호 스타일 없음" && style.teaching_style_desc && (
                                 <p className="text-base text-muted-foreground">
                                   {style.teaching_style_desc}
                                 </p>
                               )}
                             </div>
                           </div>
                         ))}
                       </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          )}

          {step === 'format' && (
            <Card className="mf-card animate-scale-in">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  자료 포맷 선택
                </CardTitle>
                <CardDescription>
                  생성할 교육 자료의 형태를 선택해주세요.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingFormats ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-primary animate-spin" />
                      <span className="text-muted-foreground">포맷 추천을 가져오는 중...</span>
                    </div>
                  </div>
                 ) : generationFormats.length > 0 ? (
                   <div className="space-y-4">
                     <div className="flex items-center justify-between">
                       <p className="text-base text-muted-foreground">
                         {formData.selected_format_ids.length > 0 ? `${formData.selected_format_ids.length}개 포맷 선택됨` : '포맷을 선택해주세요 (복수 선택 가능)'}
                       </p>
                     </div>
                      <div className="p-4 border border-border rounded-lg bg-muted/20">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                           {generationFormats.map((format, index) => {
                             const isSelected = formData.selected_format_ids.includes(format.raw_generation_format_id)
                             const isRecentlyViewed = format.is_recently_viewed
                             return (
                                <div key={index} className="relative">
                                 {isRecentlyViewed && (
                                   <div className="absolute -top-2 -right-2 z-10 bg-amber-500 text-white text-sm px-2 py-1 rounded-full font-medium shadow-sm">
                                     최근 본 자료
                                   </div>
                                 )}
                                <Card
                                   className={`h-44 cursor-pointer transition-all hover:scale-[1.02] flex flex-col ${
                                     isSelected && isRecentlyViewed
                                       ? 'ring-2 ring-amber-500 border-2 border-amber-500 bg-amber-50/50 shadow-lg shadow-amber-500/20'
                                       : isSelected
                                       ? 'ring-2 ring-primary bg-primary/10'
                                       : isRecentlyViewed
                                       ? 'border-2 border-amber-500 shadow-lg shadow-amber-500/20 bg-amber-50/50'
                                       : 'hover:shadow-md'
                                   }`}
                                   onClick={async () => {
                                     // Record interaction
                                     await recordMaterialInteraction(format.raw_generation_format_id, 'view')
                                     
                                     setFormData(prev => {
                                       const isCurrentlySelected = prev.selected_format_ids.includes(format.raw_generation_format_id)
                                       if (isCurrentlySelected) {
                                         return {
                                           ...prev,
                                           selected_format_ids: prev.selected_format_ids.filter(id => id !== format.raw_generation_format_id)
                                         }
                                       } else {
                                         return {
                                           ...prev,
                                           selected_format_ids: [...prev.selected_format_ids, format.raw_generation_format_id]
                                         }
                                       }
                                     })
                                   }}
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
                                         <CardTitle className="text-base leading-tight line-clamp-2" title={format.generation_format_name}>
                                           {format.generation_format_name}
                                         </CardTitle>
                                       </div>
                                       <Button
                                         variant="ghost"
                                         size="icon"
                                         className="h-8 w-8 flex-shrink-0"
                                         onClick={(e) => {
                                           e.stopPropagation()
                                           setSelectedMaterialId(format.raw_generation_format_id)
                                           setShowMaterialDetailModal(true)
                                         }}
                                       >
                                         <Search className="w-4 h-4" />
                                       </Button>
                                     </div>
                                   </CardHeader>
                                   <CardContent className="pt-0">
                                     <Badge variant="secondary" className="text-sm line-clamp-1">
                                       {format.teaching_style_name}
                                     </Badge>
                                   </CardContent>
                                 </Card>
                               </div>
                             )
                           })}
                        </div>
                      </div>
                   </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">사용 가능한 포맷이 없습니다.</p>
                  </div>
                )}
                
                {/* 생성 요청 사항 입력 필드 */}
                {generationFormats.length > 0 && (
                  <div className="mt-8 space-y-6">
                    {/* 프리미엄 생성 옵션 */}
                    <Card className="mf-card">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Sparkles className="w-5 h-5 text-primary" />
                          생성 옵션
                        </CardTitle>
                        <CardDescription>
                          생성 품질을 선택해주세요
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label className="text-base font-medium flex items-center gap-2">
                              프리미엄 생성 (v2)
                              <Badge variant="secondary">PREMIUM</Badge>
                            </Label>
                            <p className="text-sm text-muted-foreground">
                              향상된 AI 모델로 더 정교한 자료를 생성합니다
                            </p>
                          </div>
                          <Switch
                            checked={formData.use_v2}
                            onCheckedChange={(checked) => 
                              setFormData(prev => ({ ...prev, use_v2: checked }))
                            }
                          />
                        </div>
                      </CardContent>
                    </Card>

                    {/* 생성 요청 사항 */}
                    <Card className="mf-card">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Sparkles className="w-5 h-5 text-primary" />
                          생성 요청 사항
                        </CardTitle>
                        <CardDescription>
                          추가로 원하는 생성 방향이 있으시면 입력해주세요. (선택사항)
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Textarea
                          placeholder="예: 학생들이 이해하기 쉽게 설명해주세요, 실생활 예시를 많이 넣어주세요 등"
                          value={formData.generation_additional_message}
                          onChange={(e) => setFormData(prev => ({ ...prev, generation_additional_message: e.target.value }))}
                          rows={3}
                        />
                      </CardContent>
                    </Card>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {step === 'generating' && (
            <Card className="mf-card animate-scale-in">
              <CardContent className="pt-8">
                <div className="text-center space-y-6">
                  <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                    <Sparkles className="w-8 h-8 text-primary animate-spin" />
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold">AI가 수업자료를 생성하고 있습니다</h3>
                    <p className="text-muted-foreground">
                      잠시만 기다려주세요. 고품질의 수업자료를 준비 중입니다.
                    </p>
                  </div>

                  <div className="w-full max-w-md mx-auto space-y-2">
                    <Progress value={progress} className="w-full" />
                    <p className="text-base text-muted-foreground">{Math.round(progress)}% 완료</p>
                  </div>

                  {completedGeneration && (
                    <div className="flex items-center justify-center gap-2 text-green-600">
                      <CheckCircle className="w-5 h-5" />
                      <span className="font-medium">생성이 완료되었습니다!</span>
                    </div>
                  )}
                  
                  <p className="text-base text-muted-foreground max-w-lg mx-auto">
                    *AI 생성자료는 때때로 완벽하지 않아 결과가 기대와 다를 수 있습니다
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between mt-8">
            <Button variant="outline" onClick={handleBack} disabled={step === 'info' || loading}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              이전
            </Button>
            <Button 
              onClick={handleNext} 
              disabled={step === 'info' ? (!formData.course_type_id || formData.teaching_style_ids.length === 0 || formData.cowork_type_ids.length === 0) : (formData.selected_format_ids.length === 0)}
              className={loading || generationLoading ? 'cursor-not-allowed' : ''}
            >
              {loading || generationLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  처리 중...
                </>
              ) : (
                <>
                  {step === 'format' ? '생성 시작' : '다음'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Timeout Dialog */}
      <Dialog open={showTimeoutDialog} onOpenChange={setShowTimeoutDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>생성 시간 초과</DialogTitle>
            <DialogDescription>
              생성 요청이 4분을 초과했습니다. 생성이 계속 진행 중일 수 있으니 잠시 후 생성 이력에서 확인해주세요.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={handleTimeoutDialogClose}>
              생성 이력으로 이동
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Material Detail Modal */}
      <MaterialDetailModal
        isOpen={showMaterialDetailModal}
        onClose={() => {
          setShowMaterialDetailModal(false)
          setSelectedMaterialId(null)
        }}
        materialId={selectedMaterialId}
      />
    </Layout>
  )
}