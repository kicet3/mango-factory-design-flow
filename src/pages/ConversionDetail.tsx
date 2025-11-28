// ConversionDetail - 교안 상세 페이지
import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  ArrowLeft,
  Loader2,
  CheckCircle,
  Clock,
  Sparkles,
  UserPen,
  ShieldCheck,
  MessageSquare,
  Send,
  FileText,
  Layers,
  Calendar,
  PenSquare,
  ChevronLeft,
  ChevronRight,
  Eye
} from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { toast } from 'sonner'
import { fetchConversionDetail, type ConversionDetail as ConversionDetailType } from '@/services/conversions'

// 후기 타입 (임시)
interface Review {
  id: number
  author_name: string
  author_initial: string
  created_at: string
  content: string
  tags: string[]
}

// 개발 소통 댓글 타입
interface DevComment {
  id: number
  user_name: string
  content: string
  is_admin_reply: boolean
  created_at: string
}

// 후기 데이터 (실제 API 연동 시 사용)
const reviews: Review[] = []

export default function ConversionDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [conversion, setConversion] = useState<ConversionDetailType | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('description')
  const [reviewContent, setReviewContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [devComments, setDevComments] = useState<DevComment[]>([])
  const [devCommentContent, setDevCommentContent] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  const [selectedSlideIndex, setSelectedSlideIndex] = useState(0)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const fetchedRef = useRef(false)
  const commentTextareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (id && !fetchedRef.current) {
      fetchedRef.current = true
      loadConversionDetail()
    }
  }, [id])

  const loadConversionDetail = async () => {
    try {
      setLoading(true)

      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token

      const data = await fetchConversionDetail(id!, accessToken)
      setConversion(data)
    } catch (error) {
      console.error('Error loading conversion detail:', error)
      toast.error('교안 정보를 불러오는데 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'completed':
        return (
          <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
            <CheckCircle className="w-3 h-3 mr-1" />
            발행 완료
          </Badge>
        )
      case 'processing':
        return (
          <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
            <Sparkles className="w-3 h-3 mr-1 animate-pulse" />
            AI 생성중
          </Badge>
        )
      case 'user_edit':
        return (
          <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100">
            <UserPen className="w-3 h-3 mr-1" />
            유저 수정
          </Badge>
        )
      case 'admin_edit':
        return (
          <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">
            <ShieldCheck className="w-3 h-3 mr-1" />
            관리자 검토
          </Badge>
        )
      default:
        return (
          <Badge variant="secondary" className="bg-gray-100 text-gray-700 hover:bg-gray-100">
            <Clock className="w-3 h-3 mr-1" />
            대기중
          </Badge>
        )
    }
  }

  const handleSubmitReview = async () => {
    if (!reviewContent.trim()) {
      toast.error('후기 내용을 입력해주세요')
      return
    }

    setSubmitting(true)
    try {
      // TODO: 실제 API 연동
      await new Promise(resolve => setTimeout(resolve, 1000))
      toast.success('후기가 등록되었습니다')
      setReviewContent('')
    } catch (error) {
      toast.error('후기 등록에 실패했습니다')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmitDevComment = async () => {
    if (!devCommentContent.trim()) {
      toast.error('댓글 내용을 입력해주세요')
      return
    }

    setSubmittingComment(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token

      const apiUrl = import.meta.env.VITE_BACKEND_API_URL || 'http://127.0.0.1:8000'
      const response = await fetch(`${apiUrl}/conversions/${id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          conversion_id: Number(id),
          user_id: user?.id || '',
          user_name: user?.user_metadata?.full_name || user?.email || '사용자',
          content: devCommentContent,
          parent_id: null,
          comment_type: 'develop'
        }),
      })

      if (!response.ok) {
        throw new Error('댓글 등록에 실패했습니다')
      }

      setDevCommentContent('')
      // 텍스트박스 높이 초기화
      if (commentTextareaRef.current) {
        commentTextareaRef.current.style.height = 'auto'
      }
      toast.success('댓글이 등록되었습니다')

      // 댓글 목록 새로 불러오기
      await loadDevComments()
    } catch (error) {
      console.error('Submit comment error:', error)
      toast.error('댓글 등록에 실패했습니다')
    } finally {
      setSubmittingComment(false)
    }
  }

  const loadDevComments = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token

      const apiUrl = import.meta.env.VITE_BACKEND_API_URL || 'http://127.0.0.1:8000'
      const response = await fetch(`${apiUrl}/conversions/${id}/comments/develop`, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      })

      if (response.ok) {
        const data = await response.json()
        // 응답이 배열인지 객체인지 확인
        const comments = Array.isArray(data) ? data : (data.comments || [])
        setDevComments(comments)
      }
    } catch (error) {
      console.error('Load comments error:', error)
      setDevComments([])
    }
  }

  // admin_edit 상태일 때 댓글 로드
  useEffect(() => {
    if (conversion && (conversion as any).status === 'admin_edit') {
      loadDevComments()
    }
  }, [conversion])

  const handleRequestAdminReview = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token

      const apiUrl = import.meta.env.VITE_BACKEND_API_URL || 'http://127.0.0.1:8000'
      const response = await fetch(`${apiUrl}/conversions/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ status: 'admin_edit' }),
      })

      if (!response.ok) {
        throw new Error('검토 요청에 실패했습니다')
      }

      toast.success('관리자 검토 요청이 완료되었습니다')
      // 상태 새로고침
      loadConversionDetail()
    } catch (error) {
      console.error('Request admin review error:', error)
      toast.error('검토 요청 중 오류가 발생했습니다')
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return `${date.getFullYear()}. ${date.getMonth() + 1}. ${date.getDate()}.`
  }

  // 현재 선택된 슬라이드의 코드와 데이터 가져오기
  const getCurrentSlideData = () => {
    if (!conversion || !conversion.slides || conversion.slides.length === 0) {
      return { code: '', data: {}, elementStyles: {} }
    }

    const slide = conversion.slides[selectedSlideIndex]
    if (!slide) return { code: '', data: {}, elementStyles: {} }

    // layout_component에 해당하는 컴포넌트 찾기
    const component = conversion.components?.find(
      (c) => c.component_name === slide.layout_component
    )

    if (!component) return { code: '', data: slide.data || {}, elementStyles: {} }

    return {
      code: component.code || '',
      data: slide.data || {},
      elementStyles: component.styles || {}
    }
  }

  // iframe 렌더링
  useEffect(() => {
    if (!iframeRef.current || !conversion) return

    const { code, data, elementStyles } = getCurrentSlideData()
    if (!code) return

    const iframeDoc = iframeRef.current.contentDocument
    if (!iframeDoc) return

    // elementStyles 파싱
    let parsedElementStyles: Record<string, any> = {}
    if (elementStyles) {
      try {
        parsedElementStyles = typeof elementStyles === 'string'
          ? JSON.parse(elementStyles)
          : elementStyles
      } catch (e) {
        console.error('스타일 파싱 오류:', e)
      }
    }

    // React 코드 정리 및 컴포넌트 이름 추출
    let processedCode = code

    // import 문 제거
    processedCode = processedCode.replace(/import\s+.*?from\s+['"].*?['"];?\s*/g, '')

    // export 문 제거 및 컴포넌트 이름 추출
    let componentName = 'GeneratedComponent'

    // export default function ComponentName 형태
    const exportDefaultFunctionMatch = processedCode.match(/export\s+default\s+function\s+(\w+)/)
    if (exportDefaultFunctionMatch) {
      componentName = exportDefaultFunctionMatch[1]
      processedCode = processedCode.replace(/export\s+default\s+/, '')
    }

    // export default ComponentName 형태
    const exportDefaultMatch = processedCode.match(/export\s+default\s+(\w+);?/)
    if (exportDefaultMatch) {
      componentName = exportDefaultMatch[1]
      processedCode = processedCode.replace(/export\s+default\s+\w+;?\s*$/, '')
    }

    // function ComponentName 형태 (export가 없는 경우)
    const functionMatch = processedCode.match(/function\s+(\w+)/)
    if (functionMatch && !exportDefaultFunctionMatch) {
      componentName = functionMatch[1]
    }

    // const ComponentName = 형태
    const constMatch = processedCode.match(/const\s+(\w+)\s*=/)
    if (constMatch && !functionMatch) {
      componentName = constMatch[1]
    }

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <script src="https://cdn.tailwindcss.com"></script>
          <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
          <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
          <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            html, body {
              width: 100%;
              height: 100%;
              overflow: hidden;
            }
            body {
              font-family: system-ui, -apple-system, sans-serif;
              background: white;
            }
            #scale-container {
              width: 1280px;
              height: 720px;
              transform-origin: top left;
              position: absolute;
              top: 0;
              left: 0;
            }
            #root {
              width: 1280px;
              height: 720px;
              overflow: hidden;
            }
            #error-display {
              padding: 20px;
              background: #fee;
              color: #c00;
              font-family: monospace;
              white-space: pre-wrap;
              border: 2px solid #c00;
              margin: 20px;
            }
          </style>
        </head>
        <body>
          <div id="scale-container">
            <div id="root"></div>
          </div>
          <div id="error-display" style="display: none;"></div>

          <script>
            // 컨테이너 크기에 맞게 스케일 조정
            function updateScale() {
              const container = document.getElementById('scale-container');
              const scaleX = window.innerWidth / 1280;
              const scaleY = window.innerHeight / 720;
              const scale = Math.min(scaleX, scaleY);
              container.style.transform = 'scale(' + scale + ')';

              // 중앙 정렬
              const scaledWidth = 1280 * scale;
              const scaledHeight = 720 * scale;
              container.style.left = ((window.innerWidth - scaledWidth) / 2) + 'px';
              container.style.top = ((window.innerHeight - scaledHeight) / 2) + 'px';
            }

            window.addEventListener('resize', updateScale);
            updateScale();
          </script>

          <script type="text/babel">
            const { useState, useEffect, useMemo } = React;

            (function() {
              try {
                console.log('Starting render...');
                const propsData = ${JSON.stringify(data)};
                const elementStylesObject = ${JSON.stringify(parsedElementStyles)};

                console.log('Props data loaded:', propsData);
                console.log('ElementStyles loaded:', elementStylesObject);

                ${processedCode}

                console.log('Component loaded:', typeof ${componentName});

                // 렌더링
                const rootElement = document.getElementById('root');
                const root = ReactDOM.createRoot(rootElement);
                root.render(React.createElement(${componentName}, {
                  data: propsData,
                  elementStyles: elementStylesObject
                }));

                console.log('Render initiated with props:', { data: propsData, elementStyles: elementStylesObject });

              } catch (error) {
                console.error('Rendering error:', error);
                const errorDiv = document.getElementById('error-display');
                errorDiv.style.display = 'block';
                errorDiv.textContent = 'Rendering Error:\\n\\n' + error.message + '\\n\\nStack:\\n' + error.stack;
              }
            })();
          </script>
        </body>
      </html>
    `

    iframeDoc.open()
    iframeDoc.write(html)
    iframeDoc.close()
  }, [conversion, selectedSlideIndex])

  // 이전/다음 슬라이드 이동
  const handlePrevSlide = () => {
    if (selectedSlideIndex > 0) {
      setSelectedSlideIndex(selectedSlideIndex - 1)
    }
  }

  const handleNextSlide = () => {
    if (conversion?.slides && selectedSlideIndex < conversion.slides.length - 1) {
      setSelectedSlideIndex(selectedSlideIndex + 1)
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
          <div className="text-center space-y-4">
            <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">교안 정보를 불러오는 중...</p>
          </div>
        </div>
      </Layout>
    )
  }

  if (!conversion) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
          <div className="text-center space-y-4">
            <FileText className="w-16 h-16 text-muted-foreground mx-auto opacity-50" />
            <h2 className="text-xl font-semibold">교안을 찾을 수 없습니다</h2>
            <Button onClick={() => navigate('/history')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              목록으로 돌아가기
            </Button>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
        <div className="container mx-auto max-w-4xl space-y-6">
          {/* 뒤로가기 버튼 */}
          <Button
            variant="ghost"
            onClick={() => navigate('/history')}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            목록으로
          </Button>

          {/* 헤더 카드 */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Layers className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold">
                      {conversion.content_name || conversion.original_filename}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                      {conversion.description}
                    </p>
                  </div>
                </div>
                {getStatusBadge((conversion as any).status)}
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                {conversion.framework && (
                  <Badge variant="outline">{conversion.framework}</Badge>
                )}
                {conversion.styling && (
                  <Badge variant="outline">{conversion.styling}</Badge>
                )}
                <Badge variant="secondary">
                  {conversion.total_slides}개 슬라이드
                </Badge>
                <Badge variant="secondary">
                  {conversion.total_components}개 컴포넌트
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  {formatDate(conversion.created_at)}
                </div>

                {/* user_edit 상태일 때 버튼들 표시 */}
                {(conversion as any).status === 'user_edit' && (
                  <div className="flex gap-2">
                    <Button
                      onClick={() => navigate(`/layout-editor/${id}`)}
                      className="bg-purple-500 hover:bg-purple-600 text-white gap-2"
                    >
                      <PenSquare className="w-4 h-4" />
                      레이아웃 수정하기
                    </Button>
                    <Button
                      onClick={handleRequestAdminReview}
                      className="bg-orange-500 hover:bg-orange-600 text-white gap-2"
                    >
                      <Send className="w-4 h-4" />
                      관리자 검토 요청
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 미리보기 섹션 */}
          {conversion.slides && conversion.slides.length > 0 && (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Eye className="w-5 h-5" />
                    교안 미리보기
                  </h3>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handlePrevSlide}
                      disabled={selectedSlideIndex === 0}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-sm font-medium px-3">
                      {selectedSlideIndex + 1} / {conversion.slides.length}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleNextSlide}
                      disabled={selectedSlideIndex === conversion.slides.length - 1}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* 슬라이드 선택 버튼 */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {conversion.slides.map((slide, index) => {
                    const component = conversion.components?.find(
                      (c) => c.component_name === slide.layout_component
                    )
                    return (
                      <Button
                        key={slide.id}
                        variant={selectedSlideIndex === index ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedSlideIndex(index)}
                        className="min-w-[60px]"
                      >
                        {component?.file_type || slide.slide_number}
                      </Button>
                    )
                  })}
                </div>

                {/* iframe 미리보기 (16:9 비율) */}
                <div className="relative bg-gray-100 rounded-lg overflow-hidden border aspect-video">
                  <iframe
                    ref={iframeRef}
                    title="교안 미리보기"
                    className="absolute inset-0 w-full h-full bg-white"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* 탭 영역 */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent">
              <TabsTrigger
                value="description"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3"
              >
                포맷 설명
              </TabsTrigger>
              <TabsTrigger
                value="reviews"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3"
              >
                후기 및 활용팁 ({reviews.length}개)
              </TabsTrigger>
              {(conversion as any).status === 'admin_edit' && (
                <TabsTrigger
                  value="dev-chat"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  개발 소통 ({devComments.length}개)
                </TabsTrigger>
              )}
            </TabsList>

            {/* 포맷 설명 탭 */}
            <TabsContent value="description" className="mt-6">
              <Card>
                <CardContent className="p-6 space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-3">교안 정보</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">파일 타입:</span>
                        <span className="ml-2 font-medium">{conversion.file_type?.toUpperCase()}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">파일 크기:</span>
                        <span className="ml-2 font-medium">
                          {conversion.file_size ? `${(conversion.file_size / 1024).toFixed(1)} KB` : '-'}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">변환 타입:</span>
                        <span className="ml-2 font-medium">{conversion.conversion_type}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">생성 시간:</span>
                        <span className="ml-2 font-medium">
                          {conversion.generation_time ? `${conversion.generation_time.toFixed(1)}초` : '-'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {conversion.slides && conversion.slides.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-3">수업 교안 상세 목록</h3>
                      <div className="space-y-2">
                        {conversion.slides.map((slide) => {
                          const component = conversion.components?.find(
                            (c) => c.component_name === slide.layout_component
                          )
                          return (
                            <div
                              key={slide.id}
                              className="p-3 bg-muted/50 rounded-lg flex items-center"
                            >
                              <div className="flex items-center gap-3">
                                <span className="w-8 h-8 bg-primary/10 rounded flex items-center justify-center text-sm font-medium">
                                  {slide.slide_number}
                                </span>
                                <span>{component?.file_type || slide.slide_title || `슬라이드 ${slide.slide_number}`}</span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                </CardContent>
              </Card>
            </TabsContent>

            {/* 후기 및 활용팁 탭 */}
            <TabsContent value="reviews" className="mt-6 space-y-4">
              {/* 후기 목록 */}
              {reviews.map((review) => (
                <Card key={review.id}>
                  <CardContent className="p-5">
                    <div className="flex gap-4">
                      <Avatar className="w-12 h-12 bg-slate-200">
                        <AvatarFallback className="text-lg font-semibold text-slate-600">
                          {review.author_initial}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold">{review.author_name}</span>
                          <span className="text-sm text-muted-foreground">{review.created_at}</span>
                        </div>
                        <p className="text-gray-700 mb-3">{review.content}</p>
                        <div className="flex flex-wrap gap-2">
                          {review.tags.map((tag, index) => (
                            <Badge key={index} variant="secondary" className="rounded-full">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* 후기 작성 영역 */}
              <Card>
                <CardContent className="p-5 space-y-4">
                  <Textarea
                    placeholder="이 자료 포맷을 사용한 경험과 활용 팁을 공유해주세요..."
                    value={reviewContent}
                    onChange={(e) => setReviewContent(e.target.value)}
                    className="min-h-[120px] resize-none"
                  />

                  <Button
                    onClick={handleSubmitReview}
                    disabled={submitting || !reviewContent.trim()}
                    className="w-full bg-green-100 text-green-700 hover:bg-green-200"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        등록 중...
                      </>
                    ) : (
                      '후기 등록하기'
                    )}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 개발 소통 탭 (admin_edit 상태에서만 표시) */}
            {(conversion as any).status === 'admin_edit' && (
              <TabsContent value="dev-chat" className="mt-6 space-y-4">
                {/* 댓글 목록 */}
                <Card>
                  <CardContent className="p-5">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <MessageSquare className="w-5 h-5" />
                      개발팀과의 소통
                    </h3>

                    {devComments.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>아직 대화가 없습니다.</p>
                        <p className="text-sm">수정 요청 사항이나 질문을 남겨주세요.</p>
                      </div>
                    ) : (
                      <div className="space-y-4 max-h-[400px] overflow-y-auto">
                        {devComments.map((comment) => {
                          const displayName = comment.is_admin_reply ? '관리자' : comment.user_name
                          const initial = displayName.charAt(0)
                          return (
                            <div
                              key={comment.id}
                              className={`flex gap-3 ${
                                comment.is_admin_reply ? 'flex-row-reverse' : ''
                              }`}
                            >
                              <Avatar className={`w-10 h-10 ${
                                comment.is_admin_reply
                                  ? 'bg-orange-100'
                                  : 'bg-slate-200'
                              }`}>
                                <AvatarFallback className={`text-sm font-semibold ${
                                  comment.is_admin_reply
                                    ? 'text-orange-600'
                                    : 'text-slate-600'
                                }`}>
                                  {initial}
                                </AvatarFallback>
                              </Avatar>
                              <div className={`max-w-[80%] ${
                                comment.is_admin_reply ? 'text-right' : ''
                              }`}>
                                <div className={`flex items-center gap-2 mb-1 ${
                                  comment.is_admin_reply ? 'justify-end' : ''
                                }`}>
                                  {comment.is_admin_reply ? (
                                    <Badge variant="outline" className="text-xs bg-orange-50 text-orange-600 border-orange-200">
                                      관리자
                                    </Badge>
                                  ) : (
                                    <span className="font-medium text-sm">{displayName}</span>
                                  )}
                                  <span className="text-xs text-muted-foreground">
                                    {formatDate(comment.created_at)}
                                  </span>
                                </div>
                                <div className={`inline-block p-3 rounded-lg ${
                                  comment.is_admin_reply
                                    ? 'bg-orange-50 text-orange-900'
                                    : 'bg-slate-100 text-slate-900'
                                }`}>
                                  <p className="text-sm whitespace-pre-wrap break-words">{comment.content}</p>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* 댓글 입력 */}
                <Card>
                  <CardContent className="p-5 space-y-4">
                    <Textarea
                      ref={commentTextareaRef}
                      placeholder="수정 요청 사항이나 질문을 입력해주세요..."
                      value={devCommentContent}
                      onChange={(e) => {
                        setDevCommentContent(e.target.value)
                        // 동적 높이 조절
                        if (commentTextareaRef.current) {
                          commentTextareaRef.current.style.height = 'auto'
                          commentTextareaRef.current.style.height = `${Math.max(60, commentTextareaRef.current.scrollHeight)}px`
                        }
                      }}
                      className="min-h-[60px] max-h-[300px] resize-none overflow-y-auto"
                      rows={1}
                    />
                    <div className="flex justify-end">
                      <Button
                        onClick={handleSubmitDevComment}
                        disabled={submittingComment || !devCommentContent.trim()}
                        className="bg-orange-500 hover:bg-orange-600 text-white gap-2"
                      >
                        {submittingComment ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            전송 중...
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            댓글 작성
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>
    </Layout>
  )
}
