import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination'
import { FileText, Download, Search, Filter, Calendar, RefreshCw } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { toast } from 'sonner'
import { formatKoreanTime } from '@/lib/utils'

interface HistoryItem {
  generation_response_id: number
  generation_attrs_id: number
  output_path: string | null
  generation_status_type_id: number
  created_at: string
  teaching_style_names: string[]
  cowork_type_names: string[]
  generation_additional_message: string | null
  course_material_name: string
  course_type_name: string
  generation_result_messages: string | null
  generation_name: string | null
  root_response_id: number
  version_no: number
  is_final: boolean
  has_version_4: boolean
}

interface CourseType {
  course_type_id: number
  course_type_name: string
}

export default function History() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('all')
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([])
  const [courseTypes, setCourseTypes] = useState<CourseType[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const { user } = useAuth()
  const navigate = useNavigate()

  const ITEMS_PER_PAGE = 12

  useEffect(() => {
    fetchCourseTypes()
    if (user) {
      fetchHistoryData()
    }
  }, [user])

  const fetchCourseTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('course_types')
        .select('course_type_id, course_type_name')
        .order('course_type_name')

      if (error) throw error
      setCourseTypes(data || [])
    } catch (error) {
      console.error('Error fetching course types:', error)
    }
  }

  const fetchHistoryData = async () => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('generation_responses')
        .select(`
          generation_response_id,
          output_path,
          generation_status_type_id,
          generation_result_messages,
          generation_name,
          created_at,
          generation_attrs_id,
          root_response_id,
          version_no,
          is_final,
          generation_attrs!generation_responses_generation_attrs_id_fkey (
            generation_additional_message,
            course_material_id,
            course_type_id,
            generation_attrs_teaching_style_map!gatsm_genattrs_fkey (
              teaching_styles (
                teaching_style_name
              )
            ),
            generation_attrs_cowork_type_map!generation_attrs_cowork_type_map_generation_attrs_id_fkey (
              cowork_types!generation_attrs_cowork_type_map_cowork_type_id_fkey (
                cowork_type_name
              )
            ),
            course_materials!generation_attrs_course_material_id_fkey (
              raw_course_material_id,
              raw_course_materials!course_materials_raw_course_material_id_fkey (
                course_material_name
              )
            )
          )
        `)
        .eq('user_id', user.id)
        .eq('version_no', 1)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Get course type names
      const courseTypeIds = [...new Set((data || [])
        .map(item => item.generation_attrs?.course_type_id)
        .filter(Boolean))]
      
      const { data: courseTypesData } = await supabase
        .from('course_types')
        .select('course_type_id, course_type_name')
        .in('course_type_id', courseTypeIds)
      
      const courseTypeMap = new Map(
        (courseTypesData || []).map(ct => [ct.course_type_id, ct.course_type_name])
      )

      // Check for version 4 for each item
      const rootIds = (data || []).map(item => item.root_response_id)
      const { data: version4Data, error: version4Error } = await supabase
        .from('generation_responses')
        .select('root_response_id')
        .eq('user_id', user.id)
        .eq('version_no', 4)
        .in('root_response_id', rootIds)

      if (version4Error) {
        console.error('Error checking version 4:', version4Error)
      }

      const version4RootIds = new Set(version4Data?.map(item => item.root_response_id) || [])

      const formattedData: HistoryItem[] = (data || []).map(item => ({
        generation_response_id: item.generation_response_id,
        generation_attrs_id: item.generation_attrs_id,
        output_path: item.output_path,
        generation_status_type_id: item.generation_status_type_id,
        created_at: item.created_at || new Date().toISOString(),
        generation_result_messages: item.generation_result_messages,
        generation_name: item.generation_name,
        root_response_id: item.root_response_id,
        version_no: item.version_no,
        is_final: item.is_final,
        has_version_4: version4RootIds.has(item.root_response_id),
        teaching_style_names: Array.isArray(item.generation_attrs?.generation_attrs_teaching_style_map) 
          ? item.generation_attrs.generation_attrs_teaching_style_map.map(
              (map: any) => map.teaching_styles?.teaching_style_name
            ).filter(Boolean) 
          : [],
        cowork_type_names: Array.isArray(item.generation_attrs?.generation_attrs_cowork_type_map)
          ? item.generation_attrs.generation_attrs_cowork_type_map.map(
              (map: any) => map.cowork_types?.cowork_type_name
            ).filter(Boolean)
          : [],
        generation_additional_message: item.generation_attrs?.generation_additional_message || null,
        course_material_name: item.generation_attrs?.course_materials?.raw_course_materials?.course_material_name || '',
        course_type_name: courseTypeMap.get(item.generation_attrs?.course_type_id) || ''
      }))

      setHistoryItems(formattedData)
    } catch (error) {
      console.error('Error fetching history data:', error)
      toast.error('생성 이력을 불러오는 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async (outputPath: string | null, generationResponseId: number) => {
    if (!outputPath) {
      toast.error('파일 경로가 없습니다.')
      return
    }

    try {
      console.log('Starting download for path:', outputPath)

      const { data: sessionData } = await supabase.auth.getSession()
      const accessToken = sessionData?.session?.access_token

      const { data, error } = await supabase.functions.invoke('secure-download', {
        body: { 
          filePath: outputPath, 
          fileType: 'generation',
          generationId: generationResponseId
        },
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      })

      console.log('Download response:', data, error)

      if (error) {
        console.error('Supabase function error:', error)
        throw error
      }

      if (data?.success && data?.downloadUrl) {
        const link = document.createElement('a')
        link.href = data.downloadUrl
        link.download = data.filename || 'generated-file'
        link.target = '_blank'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        toast.success('파일이 성공적으로 다운로드되었습니다.')
      } else {
        throw new Error(data?.error || '다운로드에 실패했습니다.')
      }
    } catch (error: any) {
      console.error('Download error:', error)
      const msg = String(error?.message || '')
      if (/401/.test(msg)) toast.error('인증이 필요합니다. 다시 로그인해 주세요.')
      else if (/403/.test(msg)) toast.error('접근 권한이 없습니다.')
      else if (/404/.test(msg)) toast.error('파일을 찾을 수 없습니다.')
      else toast.error(`파일 다운로드 중 오류가 발생했습니다: ${msg || '알 수 없는 오류'}`)
    }
  }

  const handleRegenerate = async (responseId: number) => {
    try {
      const { data, error } = await supabase.functions.invoke('regenerate-generation', {
        body: { response_id: responseId }
      });

      if (error) {
        console.error('Regeneration error:', error);
        toast.error('재생성 실패: ' + error.message);
        return;
      }

      if (data?.success) {
        toast.success(`V${data.data.version_no} 생성이 시작되었습니다. 남은 재생성: ${data.data.remaining_retries}/3`);
        // Refresh the history after a short delay
        setTimeout(fetchHistoryData, 2000);
      } else {
        toast.error('재생성 실패: ' + (data?.error || '알 수 없는 오류'));
      }
    } catch (error: any) {
      console.error('Network error:', error);
      toast.error('재생성 중 네트워크 오류가 발생했습니다');
    }
  }

  const filteredHistory = historyItems.filter(item => {
    const matchesSearch = (item.generation_name?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
                         item.course_material_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (item.generation_additional_message?.toLowerCase().includes(searchTerm.toLowerCase()) || false)
    const matchesSubject = selectedSubject === 'all' || item.course_type_name === selectedSubject
    return matchesSearch && matchesSubject
  })

  // 페이지네이션 로직
  const totalPages = Math.ceil(filteredHistory.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const paginatedHistory = filteredHistory.slice(startIndex, startIndex + ITEMS_PER_PAGE)

  // 검색이나 필터가 변경될 때 첫 페이지로 돌아가기
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, selectedSubject])

  if (loading) {
    return (
      <Layout>
        <div className="p-6 space-y-6">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">생성 이력을 불러오는 중...</p>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">생성 이력</h1>
              <p className="text-muted-foreground mt-1">생성한 교육 자료를 확인하고 관리하세요</p>
              <p className="text-xs text-muted-foreground mt-0.5">세부 내용 페이지에서 재생성 가능</p>
            </div>
          </div>

          {/* Search and Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-4 mf-card p-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="자료 제목으로 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 mf-input"
              />
            </div>
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="교과목" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 교과목</SelectItem>
                {courseTypes.map((courseType) => (
                  <SelectItem key={courseType.course_type_id} value={courseType.course_type_name}>
                    {courseType.course_type_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* History Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginatedHistory.map((item) => (
            <Card 
              key={item.generation_response_id} 
              className="mf-card group hover:scale-[1.02] transition-all duration-300 cursor-pointer"
              onClick={() => navigate(`/generation/${item.generation_response_id}`)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <Badge variant="secondary" className="text-xs">
                      {item.generation_status_type_id === 1 ? '대기중' : item.generation_status_type_id === 2 ? '진행중' : '완료'}
                    </Badge>
                    {item.is_final && (
                      <Badge variant="default" className="text-xs">최종</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {formatKoreanTime(item.created_at)}
                  </div>
                </div>
                <CardTitle className="text-lg line-clamp-2 group-hover:text-primary transition-colors">
                  {item.generation_name || item.course_material_name}
                </CardTitle>
                {item.generation_additional_message && (
                  <CardDescription className="text-sm text-muted-foreground line-clamp-2">
                    {item.generation_additional_message}
                  </CardDescription>
                )}
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="flex items-center gap-2 mb-4 flex-wrap">
                  {item.course_type_name && <Badge variant="outline">{item.course_type_name}</Badge>}
                  {item.teaching_style_names.map((styleName, index) => (
                    <Badge key={index} variant="outline">{styleName}</Badge>
                  ))}
                  {item.cowork_type_names.map((coworkName, index) => (
                    <Badge key={index} variant="secondary">{coworkName}</Badge>
                  ))}
                </div>
                
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDownload(item.output_path, item.generation_response_id)
                    }}
                    disabled={!item.output_path}
                    className="flex-1"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    다운로드
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Pagination */}
        {filteredHistory.length > 0 && totalPages > 1 && (
          <div className="flex justify-center mt-8">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    href="#" 
                    onClick={(e) => {
                      e.preventDefault()
                      if (currentPage > 1) setCurrentPage(currentPage - 1)
                    }}
                    className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                  />
                </PaginationItem>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <PaginationItem key={page}>
                    <PaginationLink
                      href="#"
                      onClick={(e) => {
                        e.preventDefault()
                        setCurrentPage(page)
                      }}
                      isActive={currentPage === page}
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                
                <PaginationItem>
                  <PaginationNext 
                    href="#" 
                    onClick={(e) => {
                      e.preventDefault()
                      if (currentPage < totalPages) setCurrentPage(currentPage + 1)
                    }}
                    className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}

        {filteredHistory.length === 0 && (
          <div className="text-center py-12">
            <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium text-foreground mb-2">생성된 자료가 없습니다</h3>
            <p className="text-muted-foreground mb-4">새로운 교육 자료를 생성해보세요!</p>
            <Button className="mf-button-primary" onClick={() => navigate('/generate')}>
              자료 생성하기
            </Button>
          </div>
        )}
      </div>
    </Layout>
  )
}