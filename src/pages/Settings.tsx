import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { ProfileImage } from '@/components/ProfileImage'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/integrations/supabase/client'
import { User, BookOpen, Shield, Key, Upload, X, FileText, Search, Home, Camera, MessageSquare } from 'lucide-react'

interface SchoolData {
  school_id: number
  school_name: string
  school_address: string
  school_number?: string
}

interface TeachingStyle {
  teaching_style_id: number
  teaching_style_name: string
  teaching_style_desc: string
}

interface CourseType {
  course_type_id: number
  course_type_name: string
  course_type_desc: string
}

interface CoursePublisher {
  course_material_publisher_id: number
  course_material_publisher_name: string
  course_material_publisher_desc: string
}

interface PublisherMapping {
  course_type_id: number
  course_material_publisher_id: number | null
  course_material_publisher_name?: string
}

export default function Settings() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState(() => {
    const tab = searchParams.get('tab')
    return tab === 'account' || tab === 'materials' || tab === 'verification' ? tab : 'materials'
  })
  
  // Common state
  const [teacherInfoId, setTeacherInfoId] = useState<number | null>(null)
  
  // Materials settings state
  const [selectedSchool, setSelectedSchool] = useState<SchoolData | null>(null)
  const [schoolSearchTerm, setSchoolSearchTerm] = useState('')
  const [schoolSearchResults, setSchoolSearchResults] = useState<SchoolData[]>([])
  const [showSchoolResults, setShowSchoolResults] = useState(false)
  const [classGrade, setClassGrade] = useState('')
  const [classSemester, setClassSemester] = useState('')
  const [maleStudentCount, setMaleStudentCount] = useState('')
  const [femaleStudentCount, setFemaleStudentCount] = useState('')
  const [teachingStyles, setTeachingStyles] = useState<TeachingStyle[]>([])
  const [selectedTeachingStyles, setSelectedTeachingStyles] = useState<number[]>([])
  const [courseTypes, setCourseTypes] = useState<CourseType[]>([])
  const [publisherMappings, setPublisherMappings] = useState<PublisherMapping[]>([])
  const [publisherSearchTerms, setPublisherSearchTerms] = useState<{ [key: number]: string }>({})
  const [publisherSearchResults, setPublisherSearchResults] = useState<{ [key: number]: CoursePublisher[] }>({})
  
  // Account info state
  const [nickname, setNickname] = useState('')
  const [homepageUrl, setHomepageUrl] = useState('')
  const [selfIntroduction, setSelfIntroduction] = useState('')
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null)
  const [currentPhotoPath, setCurrentPhotoPath] = useState('')
  
  // Password change state
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  
  // Teacher verification state
  const [verificationStatus, setVerificationStatus] = useState('unknown')
  const [selectedVerificationFile, setSelectedVerificationFile] = useState<File | null>(null)
  const [verificationSchool, setVerificationSchool] = useState('')
  const [verificationLoading, setVerificationLoading] = useState(false)

  // All hooks must be called before any conditional returns
  useEffect(() => {
    if (user) {
      loadInitialData()
    }
  }, [user])

  // 로그인하지 않은 경우 로그인 안내 표시
  if (!user) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-2xl mx-auto text-center">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">설정</CardTitle>
                <CardDescription>
                  계정 설정을 관리하려면 로그인이 필요합니다.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  className="mf-button-primary"
                  onClick={() => window.location.href = '/auth'}
                >
                  로그인하기
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </Layout>
    )
  }

  const loadInitialData = async () => {
    console.log('Settings: Loading initial data...')
    setLoading(true)
    
    try {
      // Load basic data independently (don't let one failure block others)
      await Promise.allSettled([
        loadTeachingStyles(),
        loadCourseTypes()
      ])
      
      // Load user profile separately
      await loadUserProfile()
    } catch (error) {
      console.error('Settings: Error in loadInitialData:', error)
    } finally {
      setLoading(false)
      console.log('Settings: Initial data loading completed')
    }
  }

  const loadTeachingStyles = async () => {
    try {
      console.log('Settings: Loading teaching styles...')
      const { data, error } = await supabase
        .from('teaching_styles')
        .select('teaching_style_id, teaching_style_name, teaching_style_desc')
        .eq('open_status', true)
        .order('teaching_style_id')
      
      if (error) throw error
      setTeachingStyles(data || [])
      console.log('Settings: Teaching styles loaded:', data?.length || 0)
    } catch (error) {
      console.error('Settings: Error loading teaching styles:', error)
      setTeachingStyles([])
    }
  }

  const loadCourseTypes = async () => {
    try {
      console.log('Settings: Loading course types...')
      const { data, error } = await supabase
        .from('course_types')
        .select('course_type_id, course_type_name, course_type_desc')
        .order('course_type_id')
      
      if (error) throw error
      setCourseTypes(data || [])
      console.log('Settings: Course types loaded:', data?.length || 0)
    } catch (error) {
      console.error('Settings: Error loading course types:', error)
      setCourseTypes([])
    }
  }

  const loadUserProfile = async () => {
    if (!user?.id) {
      console.log('Settings: No user ID, skipping profile load')
      return
    }
    
    try {
      console.log('Settings: Loading user profile for user:', user.id)
      const { data, error } = await supabase
        .from('teacher_info')
        .select(`
          *,
          schools!teacher_info_school_id_fkey(*)
        `)
        .eq('user_id', user.id)
        .maybeSingle()
      
      if (error && error.code !== 'PGRST116') throw error
      
      if (data) {
        // Set basic info
        setSelectedSchool(data.schools)
        setSchoolSearchTerm(data.schools.school_name)
        setTeacherInfoId(data.teacher_info_id)
        setNickname(data.nickname || '')
        setHomepageUrl(data.homepage_url || '')
        setSelfIntroduction(data.self_introduction || '')
        setCurrentPhotoPath(data.personal_photo_path || '')
        
        // Load class info
        if (data.class_info && typeof data.class_info === 'object') {
          const classInfo = data.class_info as any
          setClassGrade(classInfo.class_grade || '')
          setClassSemester(classInfo.class_semester || '')
          if (classInfo.class_mate_info) {
            setMaleStudentCount(classInfo.class_mate_info.male_student_count?.toString() || '')
            setFemaleStudentCount(classInfo.class_mate_info.female_student_count?.toString() || '')
          }
        }
        
        // Load teaching styles
        await loadTeachingStyleMappings(data.teacher_info_id)
        
        // Load publisher mappings
        await loadPublisherMappings(data.teacher_info_id)
        
        // Set verification status
        if (data.teacher_verified === true) {
          setVerificationStatus('approved')
        } else if (data.teacher_verified === false && data.teacher_verification_file_path) {
          setVerificationStatus('pending')
        } else {
          setVerificationStatus('unknown')
        }
      } else {
        setVerificationStatus('unknown')
        setTeacherInfoId(null)
        setSelectedTeachingStyles([])
        setPublisherMappings([])
      }
    } catch (error) {
      console.error('Error loading user profile:', error)
      setVerificationStatus('unknown')
    }
  }

  const loadTeachingStyleMappings = async (teacherInfoId: number) => {
    try {
      const { data, error } = await supabase
        .from('teacher_teaching_style_map')
        .select(`
          teaching_style_id,
          teaching_styles!teaching_style_id (
            teaching_style_name
          )
        `)
        .eq('teacher_info_id', teacherInfoId)
      
      if (error) throw error
      setSelectedTeachingStyles((data || []).map(r => r.teaching_style_id))
    } catch (error) {
      console.error('Error loading teaching style mappings:', error)
      setSelectedTeachingStyles([])
    }
  }

  const loadPublisherMappings = async (teacherInfoId: number) => {
    try {
      const { data, error } = await supabase
        .from('teacher_course_type_course_material_publisher_map')
        .select(`
          course_type_id, 
          course_material_publisher_id,
          course_material_publishers!course_material_publisher_id!inner(
            course_material_publisher_name
          )
        `)
        .eq('teacher_info_id', teacherInfoId)
      
      if (error) throw error
      
      // Transform the data to include publisher name
      const mappingsWithNames = (data || []).map(item => ({
        course_type_id: item.course_type_id,
        course_material_publisher_id: item.course_material_publisher_id,
        course_material_publisher_name: (item.course_material_publishers as any)?.course_material_publisher_name || ''
      }))
      
      setPublisherMappings(mappingsWithNames)
    } catch (error) {
      console.error('Error loading publisher mappings:', error)
      setPublisherMappings([])
    }
  }

  const searchSchools = async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setSchoolSearchResults([])
      return
    }
    
    try {
      const { data, error } = await supabase
        .from('schools')
        .select('school_id, school_name, school_address')
        .ilike('school_name', `%${searchTerm}%`)
        .limit(10)
      
      if (error) throw error
      setSchoolSearchResults(data || [])
      setShowSchoolResults(true)
    } catch (error) {
      console.error('Error searching schools:', error)
    }
  }

  const searchPublishers = async (courseTypeId: number, searchTerm: string) => {
    try {
      const { data, error } = await supabase
        .from('course_material_publishers')
        .select('course_material_publisher_id, course_material_publisher_name, course_material_publisher_desc')
        .ilike('course_material_publisher_name', `%${searchTerm}%`)
        .limit(10)
      
      if (error) throw error
      
      // Add "설정 정보 없음" option at the end
      const resultsWithNone = [
        ...(data || []),
        {
          course_material_publisher_id: -1,
          course_material_publisher_name: '설정 정보 없음',
          course_material_publisher_desc: ''
        }
      ]
      
      setPublisherSearchResults(prev => ({
        ...prev,
        [courseTypeId]: resultsWithNone
      }))
    } catch (error) {
      console.error('Error searching publishers:', error)
    }
  }

  const handleSchoolSearch = (value: string) => {
    setSchoolSearchTerm(value)
    searchSchools(value)
  }

  const selectSchool = (school: SchoolData) => {
    setSelectedSchool(school)
    setSchoolSearchTerm(school.school_name)
    setShowSchoolResults(false)
  }

  const handleTeachingStyleChange = (styleId: number, checked: boolean) => {
    if (checked) {
      setSelectedTeachingStyles([...selectedTeachingStyles, styleId])
    } else {
      setSelectedTeachingStyles(selectedTeachingStyles.filter(id => id !== styleId))
    }
  }

  const handlePublisherSearch = (courseTypeId: number, value: string) => {
    setPublisherSearchTerms(prev => ({
      ...prev,
      [courseTypeId]: value
    }))
    if (value.trim()) {
      searchPublishers(courseTypeId, value)
    }
  }

  const selectPublisher = (courseTypeId: number, publisherId: number | null, publisherName: string) => {
    setPublisherMappings(prev => {
      const filtered = prev.filter(m => m.course_type_id !== courseTypeId)
      if (publisherId !== null && publisherId !== -1) {
        filtered.push({ 
          course_type_id: courseTypeId, 
          course_material_publisher_id: publisherId,
          course_material_publisher_name: publisherName
        })
      }
      return filtered
    })
    
    setPublisherSearchTerms(prev => ({
      ...prev,
      [courseTypeId]: publisherName
    }))
    
    setPublisherSearchResults(prev => ({
      ...prev,
      [courseTypeId]: []
    }))
  }

  const getCurrentPublisherName = (courseTypeId: number) => {
    if (courseTypeId in publisherSearchTerms) return publisherSearchTerms[courseTypeId]
    
    const mapping = publisherMappings.find(m => m.course_type_id === courseTypeId)
    return mapping?.course_material_publisher_name || '설정 정보 없음'
  }

  const handlePublisherInputFocus = (courseTypeId: number) => {
    const currentValue = getCurrentPublisherName(courseTypeId)
    if (currentValue === '설정 정보 없음') {
      setPublisherSearchTerms(prev => ({
        ...prev,
        [courseTypeId]: ''
      }))
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordLoading(true)
    
    try {
      if (newPassword !== confirmPassword) {
        throw new Error('새 비밀번호가 일치하지 않습니다.')
      }
      
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: currentPassword
      })
      
      if (signInError) {
        throw new Error('현재 비밀번호가 올바르지 않습니다.')
      }
      
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })
      
      if (error) throw error
      
      toast.success('비밀번호가 성공적으로 변경되었습니다.')
      setPasswordDialogOpen(false)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error: any) {
      toast.error(`비밀번호 변경 실패: ${error.message}`)
    } finally {
      setPasswordLoading(false)
    }
  }

  const handleMaterialsUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      if (!user?.id) throw new Error('사용자 정보가 없습니다.')
      if (!selectedSchool) throw new Error('소속 학교를 선택해주세요.')
      
      // 저장 전 출판사 매핑 상태 확인 및 로깅
      console.log('Current publisher mappings before save:', publisherMappings)

      // 입력만 하고 선택하지 않은 출판사 자동 매핑 또는 검증
      let mappingsForSave = [...publisherMappings]
      const unresolvedCourseTypes: string[] = []

      for (const ct of courseTypes) {
        const hasMapping = mappingsForSave.some(m => m.course_type_id === ct.course_type_id)
        const typed = (publisherSearchTerms[ct.course_type_id] || '').trim()
        const typedIsNone = typed === '' || typed === '설정 정보 없음'

        if (!hasMapping && !typedIsNone) {
          const { data: exactMatch, error: exactErr } = await supabase
            .from('course_material_publishers')
            .select('course_material_publisher_id, course_material_publisher_name')
            .eq('course_material_publisher_name', typed)
            .maybeSingle()
          if (exactErr) throw exactErr

          if (exactMatch) {
            mappingsForSave.push({
              course_type_id: ct.course_type_id,
              course_material_publisher_id: exactMatch.course_material_publisher_id,
              course_material_publisher_name: exactMatch.course_material_publisher_name,
            })
          } else {
            unresolvedCourseTypes.push(ct.course_type_name)
          }
        }
      }

      if (unresolvedCourseTypes.length > 0) {
        throw new Error(`다음 과목의 출판사는 목록에서 선택해 주세요: ${unresolvedCourseTypes.join(', ')}`)
      }
      
      const classInfo = {
        class_grade: classGrade,
        class_semester: classSemester,
        class_mate_info: {
          male_student_count: parseInt(maleStudentCount) || 0,
          female_student_count: parseInt(femaleStudentCount) || 0
        }
      }
      
      let currentTeacherInfoId: number | null = teacherInfoId

      if (teacherInfoId) {
        // Update existing record
        const { error } = await supabase
          .from('teacher_info')
          .update({
            school_id: selectedSchool.school_id,
            class_info: classInfo,
            updated_at: new Date().toISOString()
          })
          .eq('teacher_info_id', teacherInfoId)
        
        if (error) throw error
      } else {
        // Insert new record
        const { data: inserted, error } = await supabase
          .from('teacher_info')
          .insert({
            user_id: user.id,
            school_id: selectedSchool.school_id,
            class_info: classInfo,
            teacher_verified: false
          })
          .select('teacher_info_id')
          .single()
        
        if (error) throw error
        currentTeacherInfoId = inserted.teacher_info_id
        setTeacherInfoId(currentTeacherInfoId)
      }
      
      if (currentTeacherInfoId) {
        // Sync teaching styles
        const { error: teachingStyleError } = await supabase.rpc('sync_teacher_teaching_styles', {
          p_teacher_info_id: currentTeacherInfoId,
          p_teaching_style_ids: selectedTeachingStyles,
        })
        
        if (teachingStyleError) throw teachingStyleError
        
        // Sync publisher mappings (검증/자동매핑 적용본으로 저장)
        await syncPublisherMappings(currentTeacherInfoId, mappingsForSave)
        
        // 저장 후 다시 로드해서 상태 동기화
        await loadPublisherMappings(currentTeacherInfoId)
      }
      
      toast.success(`수업자료 설정이 성공적으로 업데이트되었습니다. (출판사 ${mappingsForSave.filter(m => m.course_material_publisher_id !== null).length}개 저장됨)`)
    } catch (error: any) {
      console.error('Materials update error:', error)
      toast.error(`업데이트 실패: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const syncPublisherMappings = async (teacherInfoId: number, currentMappings: typeof publisherMappings) => {
    try {
      // Delete existing mappings
      const { error: deleteError } = await supabase
        .from('teacher_course_type_course_material_publisher_map')
        .delete()
        .eq('teacher_info_id', teacherInfoId)
      
      if (deleteError) throw deleteError
      
      // Insert new mappings
      const mappingsToInsert = currentMappings
        .filter(m => m.course_material_publisher_id !== null && m.course_material_publisher_id !== -1)
        .map(m => ({
          teacher_info_id: teacherInfoId,
          course_type_id: m.course_type_id,
          course_material_publisher_id: m.course_material_publisher_id
        }))
      
      if (mappingsToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('teacher_course_type_course_material_publisher_map')
          .insert(mappingsToInsert)
        
        if (insertError) throw insertError
      }
      
      console.log(`Successfully synced ${mappingsToInsert.length} publisher mappings`)
    } catch (error) {
      console.error('Error syncing publisher mappings:', error)
      throw error
    }
  }

  const handleAccountUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      if (!user?.id) throw new Error('사용자 정보가 없습니다.')
      
      let photoPath = currentPhotoPath
      
      // Upload photo if selected
      if (selectedPhotoFile) {
        const fileExtension = selectedPhotoFile.name.split('.').pop() || 'jpg'
        const fileName = `${selectedPhotoFile.name.split('.').slice(0, -1).join('.')}.${fileExtension}`
        
        const formData = new FormData()
        formData.append('file', selectedPhotoFile)
        formData.append('folder', `personal_photos/${user.id}`)
        formData.append('filename', fileName)
        
        const { data, error } = await supabase.functions.invoke('upload-to-s3', {
          body: formData,
        })
        
        if (error) throw error
        if (data.success) {
          photoPath = data.url
        } else {
          throw new Error(data.error || '파일 업로드에 실패했습니다.')
        }
      }
      
      let currentTeacherInfoId: number | null = teacherInfoId
      
      const updateData = {
        nickname: nickname || null,
        homepage_url: homepageUrl || null,
        self_introduction: selfIntroduction || null,
        personal_photo_path: photoPath || null,
        updated_at: new Date().toISOString()
      }
      
      if (teacherInfoId) {
        // Update existing record
        const { error } = await supabase
          .from('teacher_info')
          .update(updateData)
          .eq('teacher_info_id', teacherInfoId)
        
        if (error) throw error
      } else {
        // Insert new record - need minimal required fields
        const { data: inserted, error } = await supabase
          .from('teacher_info')
          .insert({
            user_id: user.id,
            school_id: 1, // Default school, should be updated in materials tab
            teacher_verified: false,
            ...updateData
          })
          .select('teacher_info_id')
          .single()
        
        if (error) throw error
        currentTeacherInfoId = inserted.teacher_info_id
        setTeacherInfoId(currentTeacherInfoId)
      }
      
      // Update local state with new photo path
      if (selectedPhotoFile && photoPath) {
        setCurrentPhotoPath(photoPath)
        console.log('Updated currentPhotoPath to:', photoPath)
      }
      setSelectedPhotoFile(null)
      
      // Refresh teacher info to ensure state is in sync
      await loadUserProfile()
      
      toast.success('계정 정보가 성공적으로 업데이트되었습니다.')
    } catch (error: any) {
      toast.error(`업데이트 실패: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-success text-white">인증 완료</Badge>
      case 'pending':
        return <Badge variant="secondary">인증 대기</Badge>
      case 'rejected':
        return <Badge variant="destructive">인증 거부</Badge>
      case 'unknown':
        return <Badge variant="outline">미인증</Badge>
      default:
        return <Badge variant="outline">미인증</Badge>
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedVerificationFile(file)
    }
  }

  const handlePhotoFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedPhotoFile(file)
    }
  }

  const handleVerificationSubmit = async () => {
    if (!selectedVerificationFile || !verificationSchool.trim()) return
    
    setVerificationLoading(true)
    
    try {
      const formData = new FormData()
      formData.append('file', selectedVerificationFile)
      formData.append('folder', 'teacher-verification')

      const { data, error } = await supabase.functions.invoke('upload-to-s3', {
        body: formData,
      })

      if (error) throw error

      if (data.success) {
        // Check if teacher_info exists
        const { data: existingInfo } = await supabase
          .from('teacher_info')
          .select('teacher_info_id')
          .eq('user_id', user?.id)
          .maybeSingle()

        if (existingInfo) {
          // Update existing record
          const { error: updateError } = await supabase
            .from('teacher_info')
            .update({
              teacher_verification_file_path: data.url
            })
            .eq('user_id', user?.id)

          if (updateError) throw updateError
        } else {
          // Create new teacher_info record if it doesn't exist
          const { error: insertError } = await supabase
            .from('teacher_info')
            .insert({
              user_id: user?.id,
              school_id: 1, // Default school ID
              teacher_verification_file_path: data.url,
              class_info: {
                class_grade: "1",
                class_semester: "1", 
                class_mate_info: {
                  male_student_count: 0,
                  female_student_count: 0
                }
              }
            })

          if (insertError) throw insertError
        }

        toast.success('교사 인증 신청이 완료되었습니다. 검토 후 승인됩니다.')
        setSelectedVerificationFile(null)
        setVerificationSchool('')
        
        // Reload user profile to update UI
        await loadUserProfile()
      } else {
        throw new Error(data.error || '업로드에 실패했습니다.')
      }
    } catch (error: any) {
      toast.error(`신청 실패: ${error.message}`)
    } finally {
      setVerificationLoading(false)
    }
  }

  return (
    <Layout>
      <div className="container mx-auto max-w-4xl p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">설정</h1>
          <p className="text-muted-foreground mt-1">수업자료 설정, 계정 정보 및 교사 인증을 관리하세요</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="materials">수업자료 설정</TabsTrigger>
            <TabsTrigger value="account">계정 정보</TabsTrigger>
            <TabsTrigger value="verification">교사 인증</TabsTrigger>
          </TabsList>

          <TabsContent value="materials">
            <Card className="mf-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  수업자료 설정
                  <span className="text-sm text-muted-foreground font-normal">(설정은 일 년에 3회까지 수정 가능합니다)</span>
                </CardTitle>
                <CardDescription>
                  설정에 따라 망고팩토리가 최적화된 맞춤형 수업자료를 자동으로 생성해 드립니다.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleMaterialsUpdate} className="space-y-6">
                  {/* 소속 학교 */}
                  <div className="space-y-2">
                    <Label htmlFor="school">소속 학교 (지역화 맞춤형 자료에 활용)</Label>
                    <div className="relative">
                      <Input
                        id="school"
                        value={schoolSearchTerm}
                        onChange={(e) => handleSchoolSearch(e.target.value)}
                        onFocus={() => setShowSchoolResults(true)}
                        onBlur={() => setTimeout(() => setShowSchoolResults(false), 200)}
                        placeholder="학교명을 입력하세요"
                        className="mf-input"
                      />
                      {showSchoolResults && schoolSearchResults.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
                          {schoolSearchResults.map((school) => (
                            <div
                              key={school.school_id}
                              className="p-2 hover:bg-accent cursor-pointer"
                              onClick={() => selectSchool(school)}
                            >
                              <div className="font-medium">{school.school_name}</div>
                              <div className="text-sm text-muted-foreground">{school.school_address}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {selectedSchool && (
                      <p className="text-sm text-muted-foreground">
                        선택된 학교: {selectedSchool.school_name}
                      </p>
                    )}
                  </div>

                  {/* 학급 정보 */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">학급 정보</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="classGrade">학년</Label>
                        <Input
                          id="classGrade"
                          value={classGrade}
                          onChange={(e) => setClassGrade(e.target.value)}
                          placeholder="예: 3"
                          className="mf-input"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="classSemester">학기</Label>
                        <Input
                          id="classSemester"
                          value={classSemester}
                          onChange={(e) => setClassSemester(e.target.value)}
                          placeholder="예: 1학기"
                          className="mf-input"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="maleStudents">남학생 수</Label>
                        <Input
                          id="maleStudents"
                          type="number"
                          value={maleStudentCount}
                          onChange={(e) => setMaleStudentCount(e.target.value)}
                          placeholder="0"
                          className="mf-input"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="femaleStudents">여학생 수</Label>
                        <Input
                          id="femaleStudents"
                          type="number"
                          value={femaleStudentCount}
                          onChange={(e) => setFemaleStudentCount(e.target.value)}
                          placeholder="0"
                          className="mf-input"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 선호 교수학습 스타일 */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">선호 교수학습 스타일</h3>
                    <p className="text-sm text-muted-foreground">여러 개를 선택할 수 있습니다.</p>
                    <div className="space-y-3">
                      {teachingStyles.map((style) => (
                        <div key={style.teaching_style_id} className="flex items-start space-x-3">
                          <Checkbox
                            id={`style-${style.teaching_style_id}`}
                            checked={selectedTeachingStyles.includes(style.teaching_style_id)}
                            onCheckedChange={(checked) => 
                              handleTeachingStyleChange(style.teaching_style_id, checked as boolean)
                            }
                          />
                          <div className="space-y-1">
                            <Label 
                              htmlFor={`style-${style.teaching_style_id}`}
                              className="font-medium cursor-pointer"
                            >
                              {style.teaching_style_name}
                            </Label>
                            {style.teaching_style_id === 6 && (
                              <p className="text-sm text-muted-foreground">
                                {style.teaching_style_desc}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 담당 교과목별 출판사 */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">담당 교과목별 출판사</h3>
                    <p className="text-sm text-muted-foreground">각 교과목별로 사용하는 출판사를 선택하세요.</p>
                    <div className="space-y-4">
                      {courseTypes.map((courseType) => (
                        <div key={courseType.course_type_id} className="space-y-2">
                          <Label>{courseType.course_type_name}</Label>
                          <div className="relative">
                            <Input
                              value={getCurrentPublisherName(courseType.course_type_id)}
                              onChange={(e) => handlePublisherSearch(courseType.course_type_id, e.target.value)}
                              onFocus={() => handlePublisherInputFocus(courseType.course_type_id)}
                              placeholder="출판사를 검색하세요"
                              className="mf-input"
                            />
                            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            {publisherSearchResults[courseType.course_type_id]?.length > 0 && (
                              <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
                                {publisherSearchResults[courseType.course_type_id].map((publisher) => (
                                  <div
                                    key={publisher.course_material_publisher_id}
                                    className="p-2 hover:bg-accent cursor-pointer"
                                    onClick={() => selectPublisher(
                                      courseType.course_type_id, 
                                      publisher.course_material_publisher_id === -1 ? null : publisher.course_material_publisher_id,
                                      publisher.course_material_publisher_name
                                    )}
                                  >
                                    <div className="font-medium">{publisher.course_material_publisher_name}</div>
                                    {publisher.course_material_publisher_desc && (
                                      <div className="text-sm text-muted-foreground">{publisher.course_material_publisher_desc}</div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full mf-button-primary"
                    disabled={loading}
                  >
                    {loading ? '저장 중...' : '저장하기'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="account">
            <Card className="mf-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  계정 정보
                </CardTitle>
                <CardDescription>
                  개인 계정 정보를 관리하세요
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAccountUpdate} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* 이름 (읽기 전용) */}
                    <div className="space-y-2">
                      <Label htmlFor="fullName">이름</Label>
                      <Input
                        id="fullName"
                        value={user?.user_metadata?.full_name || user?.email || ''}
                        disabled
                        className="mf-input opacity-60"
                      />
                    </div>
                    
                    {/* 이메일 (읽기 전용) */}
                    <div className="space-y-2">
                      <Label htmlFor="email">이메일</Label>
                      <Input
                        id="email"
                        value={user?.email || ''}
                        disabled
                        className="mf-input opacity-60"
                      />
                    </div>

                    {/* 닉네임 */}
                    <div className="space-y-2">
                      <Label htmlFor="nickname">닉네임</Label>
                      <Input
                        id="nickname"
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        placeholder="닉네임을 입력하세요"
                        className="mf-input"
                      />
                    </div>

                    {/* 개인 수업존 주소 */}
                    <div className="space-y-2">
                      <Label htmlFor="homepageUrl">개인 수업존 주소</Label>
                      <div className="relative">
                        <Home className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="homepageUrl"
                          value={homepageUrl}
                          onChange={(e) => setHomepageUrl(e.target.value)}
                          placeholder="edeal.co.kr/@me"
                          className="mf-input pl-10"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 사진 설정 */}
                  <div className="space-y-4">
                    <Label>사진 설정</Label>
                    
                    {/* 현재 사진 미리보기 */}
                    {currentPhotoPath && (
                      <div className="flex flex-col items-center space-y-3">
                        <div className="relative w-32 h-32 rounded-full overflow-hidden border-2 border-border">
                          <ProfileImage 
                            currentPhotoPath={currentPhotoPath}
                            altText="프로필 사진"
                          />
                        </div>
                        <p className="text-sm text-muted-foreground">현재 프로필 사진</p>
                      </div>
                    )}
                    
                    {/* 새 사진 선택 미리보기 */}
                    {selectedPhotoFile && (
                      <div className="flex flex-col items-center space-y-3">
                        <div className="relative w-32 h-32 rounded-full overflow-hidden border-2 border-primary">
                          <img
                            src={URL.createObjectURL(selectedPhotoFile)}
                            alt="새 프로필 사진"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <p className="text-sm text-primary font-medium">새로 선택한 사진</p>
                      </div>
                    )}
                    
                    {/* 업로드 영역 */}
                    {!selectedPhotoFile && !currentPhotoPath ? (
                      <div 
                        className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                        onClick={() => document.getElementById('photo-input')?.click()}
                      >
                        <Camera className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">
                          프로필 사진을 업로드하세요
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          JPG, PNG (최대 5MB)
                        </p>
                      </div>
                    ) : (
                      <div className="flex justify-center gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => document.getElementById('photo-input')?.click()}
                        >
                          <Camera className="h-4 w-4 mr-2" />
                          {currentPhotoPath ? '사진 변경' : '사진 선택'}
                        </Button>
                        {(selectedPhotoFile || currentPhotoPath) && (
                          <Button
                            type="button"
                            onClick={() => {
                              setSelectedPhotoFile(null)
                              setCurrentPhotoPath('')
                            }}
                            variant="ghost"
                            size="sm"
                          >
                            <X className="h-4 w-4 mr-2" />
                            제거
                          </Button>
                        )}
                      </div>
                    )}
                    
                    <input
                      id="photo-input"
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoFileSelect}
                      className="hidden"
                    />
                  </div>

                  {/* 수업존 소개 */}
                  <div className="space-y-2">
                    <Label htmlFor="selfIntroduction">수업존 소개</Label>
                    <Textarea
                      id="selfIntroduction"
                      value={selfIntroduction}
                      onChange={(e) => setSelfIntroduction(e.target.value)}
                      placeholder="수업존 소개를 입력하세요"
                      className="min-h-[120px] resize-none"
                    />
                  </div>

                  {/* 비밀번호 변경 및 저장 버튼 */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
                      <DialogTrigger asChild>
                        <Button type="button" variant="outline" className="flex items-center gap-2">
                          <Key className="h-4 w-4" />
                          비밀번호 변경
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>비밀번호 변경</DialogTitle>
                          <DialogDescription>
                            보안을 위해 현재 비밀번호를 입력해주세요.
                          </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handlePasswordChange} className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="currentPassword">현재 비밀번호</Label>
                            <Input
                              id="currentPassword"
                              type="password"
                              value={currentPassword}
                              onChange={(e) => setCurrentPassword(e.target.value)}
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="newPassword">새 비밀번호</Label>
                            <Input
                              id="newPassword"
                              type="password"
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="confirmPassword">비밀번호 확인</Label>
                            <Input
                              id="confirmPassword"
                              type="password"
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              required
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button 
                              type="button" 
                              variant="outline" 
                              onClick={() => setPasswordDialogOpen(false)}
                            >
                              취소
                            </Button>
                            <Button type="submit" disabled={passwordLoading}>
                              {passwordLoading ? '변경 중...' : '변경하기'}
                            </Button>
                          </div>
                        </form>
                      </DialogContent>
                    </Dialog>
                    
                    <Button 
                      type="submit" 
                      className="mf-button-primary flex-1"
                      disabled={loading}
                    >
                      {loading ? '저장 중...' : '저장하기'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="verification">
            <div className="space-y-6">
              <Card className="mf-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    교사 인증 현황
                  </CardTitle>
                  <CardDescription>
                    교사 인증을 통해 모든 기능을 이용하세요
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between p-4 bg-secondary rounded-lg">
                    <div className="flex items-center gap-3">
                      <Shield className="h-6 w-6 text-primary" />
                      <div>
                        <p className="font-medium">인증 상태</p>
                        <p className="text-sm text-muted-foreground">교사 자격 증명 상태</p>
                      </div>
                    </div>
                    {getStatusBadge(verificationStatus)}
                  </div>
                </CardContent>
              </Card>

              {verificationStatus !== 'approved' && (
                <Card className="mf-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Upload className="h-5 w-5" />
                      교사 인증 신청
                    </CardTitle>
                    <CardDescription>
                      재직증명서 또는 교사 자격증을 업로드해주세요
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="verification-file">인증 서류</Label>
                      {!selectedVerificationFile ? (
                        <div className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                             onClick={() => document.getElementById('verification-file-input')?.click()}>
                          <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">
                            파일을 여기에 드래그하거나 클릭해서 선택하세요
                          </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              PDF, JPG, PNG (최대 10MB)
                            </p>
                            <input
                              id="verification-file-input"
                              type="file"
                              accept="image/*,.pdf"
                              onChange={handleFileSelect}
                              className="hidden"
                            />
                        </div>
                      ) : (
                        <div className="flex items-center justify-between p-3 border rounded-lg bg-secondary/50">
                          <div className="flex items-center space-x-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm truncate max-w-[200px]">
                              {selectedVerificationFile.name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              ({(selectedVerificationFile.size / 1024 / 1024).toFixed(2)} MB)
                            </span>
                          </div>
                          <Button
                            onClick={() => setSelectedVerificationFile(null)}
                            variant="ghost"
                            size="sm"
                            type="button"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="verification-school">소속 학교</Label>
                      <Input
                        id="verification-school"
                        value={verificationSchool}
                        onChange={(e) => setVerificationSchool(e.target.value)}
                        placeholder="정확한 학교명을 입력하세요"
                        className="mf-input"
                      />
                    </div>
                    
                    <Button 
                      className="w-full mf-button-primary"
                      disabled={!selectedVerificationFile || !verificationSchool.trim() || verificationLoading}
                      onClick={handleVerificationSubmit}
                      type="button"
                    >
                      {verificationLoading ? '업로드 중...' : '인증 신청하기'}
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  )
}