// History - 수확 기록 페이지 (Conversions 기반)
import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  FileText,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  CheckCircle,
  Clock,
  Calendar,
  Layers,
  Eye,
  Sparkles,
  UserPen,
  ShieldCheck
} from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { toast } from 'sonner'
import { fetchAllConversions, type ConversionSummary } from '@/services/conversions'

const ITEMS_PER_PAGE = 12

// Conversion 카드 컴포넌트
interface ConversionCardProps {
  conversion: ConversionSummary
  onView: () => void
}

function ConversionCard({ conversion, onView }: ConversionCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return `${date.getFullYear()}. ${date.getMonth() + 1}. ${date.getDate()}.`
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

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
      <CardContent className="p-6 space-y-4">
        {/* 상단: 상태 & 날짜 */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            {getStatusBadge(conversion.status)}
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {formatDate(conversion.created_at)}
          </div>
        </div>

        {/* 제목 */}
        <div className="space-y-1">
          <h3 className="text-lg font-bold line-clamp-2">
            {conversion.content_name || conversion.original_filename}
          </h3>
          {conversion.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {conversion.description}
            </p>
          )}
        </div>

        {/* 미리보기 영역 */}
        <div className="relative bg-gray-100 rounded-lg aspect-video flex items-center justify-center overflow-hidden">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 mx-auto text-gray-400">
              <Layers className="w-full h-full" />
            </div>
            <p className="text-sm text-gray-500">
              {conversion.total_slides}개 슬라이드
            </p>
          </div>
        </div>

        {/* 태그 */}
        <div className="flex flex-wrap gap-2">
          {conversion.framework && (
            <Badge variant="outline" className="rounded-md">
              {conversion.framework}
            </Badge>
          )}
          {conversion.styling && (
            <Badge variant="outline" className="rounded-md">
              {conversion.styling}
            </Badge>
          )}
          {conversion.file_type && (
            <Badge variant="secondary" className="rounded-md">
              {conversion.file_type.toUpperCase()}
            </Badge>
          )}
          {conversion.total_components > 0 && (
            <Badge variant="outline" className="rounded-md">
              {conversion.total_components}개 컴포넌트
            </Badge>
          )}
        </div>

        {/* 버튼 */}
        <div className="flex gap-2 pt-2">
          <Button
            onClick={onView}
            className="flex-1 bg-gradient-to-r from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600 text-white gap-2"
          >
            <Eye className="w-4 h-4" />
            상세 보기
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default function History() {
  const [searchParams] = useSearchParams()
  const initialTab = searchParams.get('tab') === 'pending' ? 'pending' : 'completed'

  const [searchTerm, setSearchTerm] = useState('')
  const [conversions, setConversions] = useState<ConversionSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [activeTab, setActiveTab] = useState<'completed' | 'pending'>(initialTab)
  const { user } = useAuth()
  const navigate = useNavigate()
  const fetchedRef = useRef(false)

  useEffect(() => {
    if (user && !fetchedRef.current) {
      fetchedRef.current = true
      fetchConversionsData()
    }
  }, [user])

  // 탭이나 검색어 변경시 페이지 초기화
  useEffect(() => {
    setCurrentPage(1)
  }, [activeTab, searchTerm])

  const fetchConversionsData = async (forceRefresh = false) => {
    if (forceRefresh) {
      fetchedRef.current = true
    }

    try {
      setLoading(true)

      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token

      const response = await fetchAllConversions({
        page: 1,
        page_size: 100,
      }, accessToken)

      setConversions(response.conversions)
    } catch (error) {
      console.error('Error fetching conversions:', error)
      toast.error('교안 목록을 불러오는 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 탭과 검색어로 필터링
  const filteredConversions = conversions.filter(conversion => {
    const matchesSearch =
      conversion.content_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conversion.original_filename?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conversion.description?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesTab = activeTab === 'completed'
      ? conversion.status === 'completed'
      : conversion.status !== 'completed'

    return matchesSearch && matchesTab
  })

  // 페이지네이션
  const totalPages = Math.ceil(filteredConversions.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const paginatedConversions = filteredConversions.slice(startIndex, startIndex + ITEMS_PER_PAGE)

  // 각 탭별 개수
  const completedCount = conversions.filter(c => c.status === 'completed').length
  const pendingCount = conversions.filter(c => c.status !== 'completed').length

  const handleView = (conversionId: number) => {
    navigate(`/conversions/detail/${conversionId}`)
  }

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(1, prev - 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
          <div className="text-center space-y-4">
            <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">교안 목록을 불러오는 중...</p>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4">
        <div className="container mx-auto max-w-7xl space-y-8">
          {/* 헤더 */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold tracking-tight">수확 기록</h1>
            <p className="text-muted-foreground">
              생성된 교안을 확인하고 관리할 수 있습니다
            </p>
          </div>

          {/* 검색 */}
          <div className="max-w-md mx-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="교안 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* 탭 */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'completed' | 'pending')}>
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
              <TabsTrigger value="completed" className="gap-2">
                <CheckCircle className="w-4 h-4" />
                발행 완료 ({completedCount})
              </TabsTrigger>
              <TabsTrigger value="pending" className="gap-2">
                <Clock className="w-4 h-4" />
                발행 검토중 ({pendingCount})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="completed" className="mt-8">
              {paginatedConversions.length === 0 ? (
                <div className="text-center py-16">
                  <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">발행 완료된 교안이 없습니다</h3>
                  <p className="text-muted-foreground">
                    {searchTerm ? '검색 결과가 없습니다.' : '교안을 생성해보세요!'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {paginatedConversions.map((conversion) => (
                    <ConversionCard
                      key={conversion.id}
                      conversion={conversion}
                      onView={() => handleView(conversion.id)}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="pending" className="mt-8">
              {paginatedConversions.length === 0 ? (
                <div className="text-center py-16">
                  <Clock className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">검토중인 교안이 없습니다</h3>
                  <p className="text-muted-foreground">
                    {searchTerm ? '검색 결과가 없습니다.' : '모든 교안이 발행 완료 상태입니다.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {paginatedConversions.map((conversion) => (
                    <ConversionCard
                      key={conversion.id}
                      conversion={conversion}
                      onView={() => handleView(conversion.id)}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* 페이지네이션 */}
          {filteredConversions.length > 0 && totalPages > 1 && (
            <>
              <div className="flex items-center justify-center gap-4 pt-8">
                <Button
                  variant="outline"
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1}
                  className="gap-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  이전
                </Button>

                <div className="flex items-center gap-2">
                  {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => {
                    let page: number
                    if (totalPages <= 10) {
                      page = i + 1
                    } else if (currentPage <= 5) {
                      page = i + 1
                    } else if (currentPage >= totalPages - 4) {
                      page = totalPages - 9 + i
                    } else {
                      page = currentPage - 4 + i
                    }
                    return (
                      <button
                        key={page}
                        onClick={() => {
                          setCurrentPage(page)
                          window.scrollTo({ top: 0, behavior: 'smooth' })
                        }}
                        className={`w-10 h-10 rounded-lg transition-all ${
                          page === currentPage
                            ? "bg-primary text-primary-foreground font-semibold"
                            : "bg-white hover:bg-gray-100 text-gray-700"
                        }`}
                      >
                        {page}
                      </button>
                    )
                  })}
                </div>

                <Button
                  variant="outline"
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  className="gap-2"
                >
                  다음
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              {/* 카운터 */}
              <div className="text-center text-sm text-muted-foreground">
                총 {filteredConversions.length}개 | {currentPage} / {totalPages} 페이지
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  )
}
