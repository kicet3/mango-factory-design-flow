import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { BookOpen, Search, Upload, FileText } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { toast } from "sonner"
import { useAuth } from "@/hooks/use-auth"

interface TextbookContent {
  content_id: number
  content_title: string
  content_description: string
  content_data: any
  subject: string
  grade: string
  chapter: string
}

interface TextbookContentSelectorProps {
  onSelect: (content: any) => void
  selectedContent: any
}

export function TextbookContentSelector({ onSelect, selectedContent }: TextbookContentSelectorProps) {
  const { user } = useAuth()
  const [contents, setContents] = useState<TextbookContent[]>([])
  const [filteredContents, setFilteredContents] = useState<TextbookContent[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [showManualInput, setShowManualInput] = useState(false)
  const [manualContent, setManualContent] = useState({
    title: "",
    description: "",
    content: ""
  })

  useEffect(() => {
    loadTextbookContents()
  }, [])

  useEffect(() => {
    if (searchQuery) {
      const filtered = contents.filter(content =>
        content.content_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        content.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        content.chapter.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredContents(filtered)
    } else {
      setFilteredContents(contents)
    }
  }, [searchQuery, contents])

  const loadTextbookContents = async () => {
    try {
      setLoading(true)

      // TODO: 실제 교과서 내용 테이블에서 조회
      // 임시 데이터로 시뮬레이션
      const mockContents: TextbookContent[] = [
        {
          content_id: 1,
          content_title: "일차방정식의 해법",
          content_description: "일차방정식의 개념과 다양한 해법을 다룹니다",
          content_data: {
            text: "일차방정식은 미지수의 차수가 1인 방정식입니다...",
            concepts: ["등식의 성질", "이항", "계수", "해"],
            examples: ["2x + 3 = 7", "5x - 2 = 3x + 4"]
          },
          subject: "수학",
          grade: "중학교 1학년",
          chapter: "1단원 방정식"
        },
        {
          content_id: 2,
          content_title: "광합성의 원리",
          content_description: "식물의 광합성 과정과 에너지 전환을 설명합니다",
          content_data: {
            text: "광합성은 빛 에너지를 이용하여 이산화탄소와 물로부터 포도당을 만드는 과정입니다...",
            concepts: ["엽록체", "빛 에너지", "포도당", "산소"],
            formula: "6CO2 + 6H2O + 빛 → C6H12O6 + 6O2"
          },
          subject: "과학",
          grade: "중학교 2학년",
          chapter: "3단원 식물의 구조와 기능"
        },
        {
          content_id: 3,
          content_title: "조선시대 신분제도",
          content_description: "조선시대의 신분 구조와 특징을 학습합니다",
          content_data: {
            text: "조선시대는 양반, 중인, 상민, 천민의 4계층 신분제도를 유지했습니다...",
            concepts: ["양반", "중인", "상민", "천민", "신분제"],
            keypoints: ["세습적 신분", "법적 제약", "사회적 이동의 제한"]
          },
          subject: "사회",
          grade: "중학교 3학년",
          chapter: "2단원 조선시대의 사회"
        },
        {
          content_id: 4,
          content_title: "세포의 구조",
          content_description: "동물세포와 식물세포의 구조와 차이점",
          content_data: {
            text: "세포는 생명체의 기본 단위로 핵, 세포질, 세포막 등으로 구성됩니다...",
            concepts: ["핵", "세포질", "세포막", "미토콘드리아", "엽록체"],
            comparison: "동물세포와 식물세포의 차이점"
          },
          subject: "과학",
          grade: "중학교 1학년",
          chapter: "1단원 생물의 구조"
        },
        {
          content_id: 5,
          content_title: "삼국시대 문화재",
          content_description: "삼국시대의 주요 문화유산과 특징",
          content_data: {
            text: "고구려, 백제, 신라는 각각 독특한 문화를 발전시켰습니다...",
            concepts: ["고구려 고분벽화", "백제 금동대향로", "신라 금관"],
            artifacts: ["고분벽화", "금동대향로", "금관", "석탑"]
          },
          subject: "사회",
          grade: "중학교 2학년",
          chapter: "1단원 한국사의 이해"
        }
      ]

      setContents(mockContents)
      setFilteredContents(mockContents)

    } catch (error) {
      console.error('교과서 내용 로딩 실패:', error)
      toast.error("교과서 내용을 불러오는데 실패했습니다")
    } finally {
      setLoading(false)
    }
  }

  const handleSelect = (content: TextbookContent) => {
    onSelect({
      content_id: content.content_id,
      content_title: content.content_title,
      content_data: content.content_data
    })
  }

  const handleManualSubmit = () => {
    if (!manualContent.title || !manualContent.content) {
      toast.error("제목과 내용을 입력해주세요")
      return
    }

    onSelect({
      content_id: 0,
      content_title: manualContent.title,
      content_data: {
        text: manualContent.content,
        description: manualContent.description,
        manual: true
      }
    })

    setShowManualInput(false)
    toast.success("교과서 내용이 입력되었습니다")
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">교과서 내용을 불러오는 중...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>교과서 내용 선택</CardTitle>
              <CardDescription>
                수업에 사용할 교과서 내용을 선택하거나 직접 입력해주세요
              </CardDescription>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowManualInput(!showManualInput)}
            >
              <Upload className="mr-2 h-4 w-4" />
              직접 입력
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showManualInput ? (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">제목</label>
                <Input
                  placeholder="예: 피타고라스 정리"
                  value={manualContent.title}
                  onChange={(e) => setManualContent({ ...manualContent, title: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">설명 (선택)</label>
                <Input
                  placeholder="예: 직각삼각형의 세 변의 관계"
                  value={manualContent.description}
                  onChange={(e) => setManualContent({ ...manualContent, description: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">교과서 내용</label>
                <Textarea
                  placeholder="교과서 내용을 입력하세요..."
                  value={manualContent.content}
                  onChange={(e) => setManualContent({ ...manualContent, content: e.target.value })}
                  rows={10}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleManualSubmit}>
                  <FileText className="mr-2 h-4 w-4" />
                  입력 완료
                </Button>
                <Button variant="outline" onClick={() => setShowManualInput(false)}>
                  취소
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="교과서 내용 검색 (과목, 단원, 제목)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {filteredContents.map((content) => (
                  <Card
                    key={content.content_id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedContent?.content_id === content.content_id
                        ? "border-primary ring-2 ring-primary/20"
                        : "border-border"
                    }`}
                    onClick={() => handleSelect(content)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <BookOpen className="h-5 w-5 text-primary" />
                        {selectedContent?.content_id === content.content_id && (
                          <Badge variant="default">선택됨</Badge>
                        )}
                      </div>
                      <CardTitle className="text-lg">{content.content_title}</CardTitle>
                      <CardDescription>{content.content_description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">{content.subject}</Badge>
                        <Badge variant="outline">{content.grade}</Badge>
                        <Badge variant="secondary" className="text-xs">{content.chapter}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {filteredContents.length === 0 && (
                <div className="text-center py-12">
                  <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">검색 결과가 없습니다</p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
