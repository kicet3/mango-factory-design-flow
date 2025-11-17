// GenerateV2Upload - 자료 생성 선택 페이지
import { useState } from "react"
import { Layout } from "@/components/layout/Layout"
import { TemplateUpload } from "@/components/generate-v2/TemplateUpload"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, BookOpen, FolderOpen, ChevronDown, ChevronUp, Users, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { supabase } from "@/integrations/supabase/client"

type CardType = 'lesson-card' | 'lesson-intro' | 'lesson-materials' | null
type MaterialFileType = '교사용 프레젠테이션' | '학생용 활동지' | '학생용 에듀테크' | '교사용 정답지' | '예시 작품' | '만들기 도안'

interface UploadedFile {
  id: string
  type: MaterialFileType
  file: File | null
  name: string
}

export default function GenerateV2Upload() {
  const navigate = useNavigate()
  const [selectedCard, setSelectedCard] = useState<CardType>(null)
  const [lessonIntroText, setLessonIntroText] = useState<string>('')

  // 수업 카드 상태
  const [lessonTitle, setLessonTitle] = useState<string>('')
  const [recommendedSubjects, setRecommendedSubjects] = useState<string[]>([])
  const [activityType, setActivityType] = useState<string[]>([])
  const [lessonStyle, setLessonStyle] = useState<string[]>([])
  const [competency, setCompetency] = useState<string[]>([])
  const [otherTags, setOtherTags] = useState<string>('')

  // 수업 자료 상태 - 첫 번째 파일을 바로 표시
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([
    {
      id: Date.now().toString(),
      type: '교사용 프레젠테이션',
      file: null,
      name: ''
    }
  ])
  const [isGenerating, setIsGenerating] = useState(false)

  const handleUploadSuccess = (data: any) => {
    console.log("Upload success:", data)

    toast.success("업로드가 완료되었습니다!", {
      duration: 2000,
    })

    // 수업 자료 관리 페이지로 이동
    setTimeout(() => {
      navigate('/generate-v2/materials')
    }, 1500)
  }

  const handleCardClick = (cardType: CardType) => {
    setSelectedCard(selectedCard === cardType ? null : cardType)
  }

  const toggleSelection = (
    currentSelection: string[],
    value: string,
    setter: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    if (currentSelection.includes(value)) {
      setter(currentSelection.filter((item) => item !== value))
    } else {
      setter([...currentSelection, value])
    }
  }

  const handleAddFile = () => {
    const newFile: UploadedFile = {
      id: Date.now().toString(),
      type: '교사용 프레젠테이션',
      file: null,
      name: ''
    }
    setUploadedFiles([...uploadedFiles, newFile])
  }

  const handleRemoveFile = (id: string) => {
    setUploadedFiles(uploadedFiles.filter(f => f.id !== id))
  }

  const handleFileSelect = (id: string, file: File) => {
    setUploadedFiles(uploadedFiles.map(f =>
      f.id === id ? { ...f, file, name: file.name } : f
    ))
  }

  const handleFileTypeChange = (id: string, type: MaterialFileType) => {
    setUploadedFiles(uploadedFiles.map(f =>
      f.id === id ? { ...f, type } : f
    ))
  }

  const materialFileTypes: MaterialFileType[] = [
    '교사용 프레젠테이션',
    '학생용 활동지',
    '학생용 에듀테크',
    '교사용 정답지',
    '예시 작품',
    '만들기 도안'
  ]

  const handleGenerate = async () => {
    try {
      setIsGenerating(true)

      // Get auth token
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token

      // FormData 생성
      const formData = new FormData()

      // 수업 카드 데이터
      if (lessonTitle) formData.append('lesson_title', lessonTitle)
      if (recommendedSubjects.length > 0) formData.append('recommended_subjects', JSON.stringify(recommendedSubjects))
      if (activityType.length > 0) formData.append('activity_type', JSON.stringify(activityType))
      if (lessonStyle.length > 0) formData.append('lesson_style', JSON.stringify(lessonStyle))
      if (competency.length > 0) formData.append('competency', JSON.stringify(competency))
      if (otherTags) formData.append('other_tags', otherTags)

      // 수업 소개 데이터
      if (lessonIntroText) formData.append('lesson_intro', lessonIntroText)

      // 수업 자료 파일들
      uploadedFiles.forEach((uploadedFile) => {
        if (uploadedFile.file) {
          formData.append(`files`, uploadedFile.file)
          formData.append(`file_types`, uploadedFile.type)
        }
      })

      // 기본 설정
      formData.append('component_name', 'GeneratedComponent')
      formData.append('framework', 'react')
      formData.append('styling', 'tailwind')
      formData.append('typescript', 'true')

      const apiUrl = import.meta.env.VITE_BACKEND_API_URL || 'http://127.0.0.1:8000'

      // Prepare headers with JWT token
      const headers: Record<string, string> = {}
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`
      }

      const response = await fetch(`${apiUrl}/document-convert-react/convert`, {
        method: 'POST',
        headers,
        body: formData,
      })

      if (!response.ok) {
        throw new Error('자료 생성에 실패했습니다')
      }

      const data = await response.json()
      console.log('=== API Response Data ===', data)

      toast.success('자료 생성이 완료되었습니다!', {
        duration: 2000,
      })

      // 자료 관리 페이지로 이동
      setTimeout(() => {
        navigate('/generate-v2/materials')
      }, 1500)

    } catch (error) {
      console.error('Generate error:', error)
      toast.error('자료 생성 중 오류가 발생했습니다', {
        duration: 2000,
      })
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-primary-light/10 via-background to-secondary/20">
        <div className="container mx-auto max-w-7xl px-6 py-8 scale-90 origin-top">
          {/* 헤더 */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold mb-2">교안 생성 v2</h1>
                <p className="text-lg text-muted-foreground">
                  원하는 자료 유형을 선택해주세요
                </p>
              </div>
              {uploadedFiles.length > 0 && (
                <Button
                  size="lg"
                  className="h-14 text-lg font-semibold px-12"
                  onClick={handleGenerate}
                  disabled={isGenerating}
                >
                  {isGenerating ? '생성 중...' : '자료 생성'}
                </Button>
              )}
            </div>
          </div>

          <div className="max-w-5xl mx-auto space-y-4">
            {/* 수업 카드 */}
            <Card
              className={`transition-all hover:shadow-lg ${selectedCard === 'lesson-card' ? 'ring-2 ring-primary' : ''}`}
            >
              <CardHeader
                className="pb-4 cursor-pointer"
                onClick={() => handleCardClick('lesson-card')}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                      <FileText className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl">수업 카드</CardTitle>
                      <CardDescription className="text-base mt-1">
                        수업 자료에 대한 설명을 선택합니다
                      </CardDescription>
                    </div>
                  </div>
                  {selectedCard === 'lesson-card' ? (
                    <ChevronUp className="w-6 h-6 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-6 h-6 text-muted-foreground" />
                  )}
                </div>
              </CardHeader>
              {selectedCard === 'lesson-card' && (
                <CardContent className="pt-0 animate-in slide-in-from-top-2 duration-300">
                  <div className="border-t pt-6">
                    <div className="space-y-6">
                      {/* 제목 */}
                      <div className="space-y-2">
                        <Label className="text-base font-semibold">제목</Label>
                        <Input
                          placeholder="도전 골든벨"
                          value={lessonTitle}
                          onChange={(e) => setLessonTitle(e.target.value)}
                          className="h-12 text-base"
                        />
                      </div>

                      {/* 추천과목 */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">📚</span>
                          <Label className="text-base font-semibold">추천과목</Label>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          {['국어', '수학', '사회', '과학', '통합교과', '영어'].map((subject) => (
                            <Button
                              key={subject}
                              variant={recommendedSubjects.includes(subject) ? 'default' : 'outline'}
                              size="lg"
                              className="h-12 text-base"
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleSelection(recommendedSubjects, subject, setRecommendedSubjects)
                              }}
                            >
                              {subject}
                            </Button>
                          ))}
                        </div>
                      </div>

                      {/* 활동 형태 */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Users className="w-5 h-5 text-primary" />
                          <Label className="text-base font-semibold">활동 형태</Label>
                        </div>
                        <div className="flex gap-3">
                          {['개별 활동', '짝 활동', '모둠 활동'].map((type) => (
                            <Button
                              key={type}
                              variant={activityType.includes(type) ? 'default' : 'outline'}
                              size="lg"
                              className="h-12 text-base"
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleSelection(activityType, type, setActivityType)
                              }}
                            >
                              {type}
                            </Button>
                          ))}
                        </div>
                      </div>

                      {/* 수업 스타일 */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">✅</span>
                          <Label className="text-base font-semibold">수업 스타일</Label>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          {['교과서 중심 수업', '의사소통 및 협력', '프로젝트 기반', '만들기 및 제작', '게임 기반'].map((style) => (
                            <Button
                              key={style}
                              variant={lessonStyle.includes(style) ? 'default' : 'outline'}
                              size="lg"
                              className="h-12 text-base"
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleSelection(lessonStyle, style, setLessonStyle)
                              }}
                            >
                              {style}
                            </Button>
                          ))}
                        </div>
                      </div>

                      {/* 기를 수 있는 역량 */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">💡</span>
                          <Label className="text-base font-semibold">기를 수 있는 역량</Label>
                        </div>
                        <div className="flex gap-3">
                          {['협동성', '창의적 사고', '규칙 준수'].map((comp) => (
                            <Button
                              key={comp}
                              variant={competency.includes(comp) ? 'default' : 'outline'}
                              size="lg"
                              className="h-12 text-base"
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleSelection(competency, comp, setCompetency)
                              }}
                            >
                              {comp}
                            </Button>
                          ))}
                        </div>

                        {/* 기타 (역량 추가) */}
                        <div className="space-y-2">
                          <Label className="text-base font-semibold">기타 (0/10)</Label>
                          <div className="relative">
                            <Input
                              placeholder="태그를 입력하세요..."
                              value={otherTags}
                              onChange={(e) => setOtherTags(e.target.value)}
                              className="h-12 text-base pr-20"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-primary font-semibold"
                              onClick={(e) => {
                                e.stopPropagation()
                                // 태그 추가 로직
                              }}
                            >
                              추가
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* 수업 소개 */}
            <Card
              className={`transition-all hover:shadow-lg ${selectedCard === 'lesson-intro' ? 'ring-2 ring-primary' : ''}`}
            >
              <CardHeader
                className="pb-4 cursor-pointer"
                onClick={() => handleCardClick('lesson-intro')}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                      <BookOpen className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl">수업 소개</CardTitle>
                      <CardDescription className="text-base mt-1">
                        수업 개요를 작성합니다.
                      </CardDescription>
                    </div>
                  </div>
                  {selectedCard === 'lesson-intro' ? (
                    <ChevronUp className="w-6 h-6 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-6 h-6 text-muted-foreground" />
                  )}
                </div>
              </CardHeader>
              {selectedCard === 'lesson-intro' && (
                <CardContent className="pt-0 animate-in slide-in-from-top-2 duration-300">
                  <div className="border-t pt-6">
                    <div className="space-y-4">
                      <p className="text-base text-muted-foreground">
                        수업의 목표, 활동 내용, 준비물 등을 자유롭게 작성해주세요.
                      </p>

                      {/* 간단한 텍스트 에디터 UI */}
                      <div className="border rounded-lg overflow-hidden">
                        {/* 툴바 */}
                        <div className="bg-muted/30 border-b px-4 py-2 flex items-center gap-2 flex-wrap">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <span className="font-bold text-base">B</span>
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <span className="italic text-base">I</span>
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <span className="underline text-base">U</span>
                          </Button>
                          <div className="w-px h-6 bg-border mx-1" />
                          <Button variant="ghost" size="sm" className="h-8 px-3 text-sm">
                            H1
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 px-3 text-sm">
                            H2
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 px-3 text-sm">
                            H3
                          </Button>
                        </div>

                        {/* 에디터 영역 */}
                        <Textarea
                          value={lessonIntroText}
                          onChange={(e) => setLessonIntroText(e.target.value)}
                          placeholder="수업의 목표, 활동 내용, 준비물 등을 자유롭게 작성해주세요."
                          className="min-h-[400px] border-0 resize-none focus-visible:ring-0 text-base p-6"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* 수업 자료 */}
            <Card
              className={`transition-all hover:shadow-lg ${selectedCard === 'lesson-materials' ? 'ring-2 ring-primary' : ''}`}
            >
              <CardHeader
                className="pb-4 cursor-pointer"
                onClick={() => handleCardClick('lesson-materials')}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                      <FolderOpen className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl">수업 자료</CardTitle>
                      <CardDescription className="text-base mt-1">
                        수업에 필요한 학습 자료를 업로드합니다.
                      </CardDescription>
                    </div>
                  </div>
                  {selectedCard === 'lesson-materials' ? (
                    <ChevronUp className="w-6 h-6 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-6 h-6 text-muted-foreground" />
                  )}
                </div>
              </CardHeader>
              {selectedCard === 'lesson-materials' && (
                <CardContent className="pt-0 animate-in slide-in-from-top-2 duration-300">
                  <div className="border-t pt-6">
                    <div className="space-y-6">
                      {/* 업로드된 파일 목록 */}
                      {uploadedFiles.map((uploadedFile, index) => (
                        <div key={uploadedFile.id} className="space-y-4 p-6 border rounded-lg bg-muted/30">
                          <div className="flex items-start justify-between gap-4">
                            {/* 왼쪽: 수업 종류 선택 */}
                            <div className="flex-shrink-0 w-64">
                              <Label className="text-base font-semibold mb-3 block">수업 종류</Label>
                              <Select
                                value={uploadedFile.type}
                                onValueChange={(value) => handleFileTypeChange(uploadedFile.id, value as MaterialFileType)}
                              >
                                <SelectTrigger className="h-12 text-base">
                                  <SelectValue placeholder="선택하세요" />
                                </SelectTrigger>
                                <SelectContent>
                                  {materialFileTypes.map((type) => (
                                    <SelectItem key={type} value={type} className="text-base">
                                      {type}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {/* 오른쪽: 파일 업로드 */}
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-3">
                                <Label className="text-base font-semibold">파일 업로드</Label>
                                {uploadedFiles.length > 1 && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleRemoveFile(uploadedFile.id)
                                    }}
                                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                  >
                                    삭제
                                  </Button>
                                )}
                              </div>

                              <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors bg-white">
                                <input
                                  type="file"
                                  id={`file-input-${uploadedFile.id}`}
                                  className="hidden"
                                  accept=".html,.htm,.ppt,.pptx,.doc,.docx,.hwp"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0]
                                    if (file) {
                                      handleFileSelect(uploadedFile.id, file)
                                    }
                                  }}
                                />
                                {uploadedFile.file ? (
                                  <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                      <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <FileText className="w-6 h-6 text-green-600" />
                                      </div>
                                      <div className="text-left">
                                        <p className="text-base font-semibold text-foreground">
                                          {uploadedFile.name}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                          파일이 선택되었습니다
                                        </p>
                                      </div>
                                    </div>
                                    <Button
                                      variant="outline"
                                      size="default"
                                      className="flex-shrink-0"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        document.getElementById(`file-input-${uploadedFile.id}`)?.click()
                                      }}
                                    >
                                      파일 변경
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-center gap-3">
                                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                                      <Upload className="w-6 h-6 text-primary" />
                                    </div>
                                    <div>
                                      <p className="text-base font-semibold text-primary mb-1">
                                        파일을 선택하거나 드래그하세요
                                      </p>
                                      <p className="text-sm text-muted-foreground">
                                        HTML, PPT, Doc, Hwp (최대 30MB)
                                      </p>
                                    </div>
                                    <Button
                                      variant="outline"
                                      size="default"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        document.getElementById(`file-input-${uploadedFile.id}`)?.click()
                                      }}
                                    >
                                      파일 선택
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* 파일 추가 버튼 */}
                      <Button
                        variant="outline"
                        size="lg"
                        className="w-full h-14 text-primary text-lg font-semibold border-2 border-dashed hover:bg-primary/5"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleAddFile()
                        }}
                      >
                        + 파일 추가하기
                      </Button>

                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                        <div className="flex items-start gap-2">
                          <span className="text-lg">💡</span>
                          <p className="text-sm text-amber-900">
                            망고 팩토리에서 사용 가능한 형태로 변환됩니다.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  )
}
