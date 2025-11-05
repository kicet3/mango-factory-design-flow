// TeachingPlanList - 수정할 교안 선택
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, FileText, Calendar, Loader2, Edit, Play } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "sonner"

interface TeachingPlanListProps {
  onEdit?: (planData: any) => void
  onView?: (planData: any) => void
  onSelect?: (planData: any) => void  // 호환성 유지
}

interface TeachingPlan {
  id: string
  title: string
  description: string | null
  created_at: string
  template_data: any
  total_pages: number
}

export function TeachingPlanList({ onEdit, onView, onSelect }: TeachingPlanListProps) {
  const { user } = useAuth()
  const [plans, setPlans] = useState<TeachingPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    if (user) {
      loadTeachingPlans()
    }
  }, [user])

  const loadTeachingPlans = async () => {
    try {
      setLoading(true)

      console.log('교안 목록 로딩 중... (임시 테스트 데이터)')

      // 임시 테스트 데이터
      const mockPlans: TeachingPlan[] = [
        {
          id: '1',
          title: '초등 수학 1학년 - 덧셈과 뺄셈',
          description: '기본적인 덧셈과 뺄셈 개념을 학습합니다',
          created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          total_pages: 3,
          template_data: {
            metadata: {
              material_name: '초등 수학 1학년 - 덧셈과 뺄셈',
              material_description: '기본적인 덧셈과 뺄셈 개념을 학습합니다',
              total_pages: 3
            },
            components: [
              {
                code: `function Component({ data }) {
  return (
    <div style={{ width: '100%', height: '100%', backgroundColor: '#f0f9ff', padding: '40px', position: 'relative' }}>
      <div id="title_1" style={{ position: 'absolute', left: '50px', top: '50px', width: '700px', height: '100px', fontSize: '48px', fontWeight: 'bold', color: '#1e40af', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {data.title_1}
      </div>
      <div id="subtitle_1" style={{ position: 'absolute', left: '50px', top: '180px', width: '700px', height: '60px', fontSize: '24px', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {data.subtitle_1}
      </div>
    </div>
  );
}`,
                jsonData: {
                  title_1: '덧셈과 뺄셈',
                  subtitle_1: '1학년 수학 첫 번째 시간'
                }
              },
              {
                code: `function Component({ data }) {
  return (
    <div style={{ width: '100%', height: '100%', backgroundColor: '#ffffff', padding: '40px', position: 'relative' }}>
      <div id="title_2" style={{ position: 'absolute', left: '50px', top: '30px', width: '700px', height: '80px', fontSize: '36px', fontWeight: 'bold', color: '#1e40af' }}>
        {data.title_2}
      </div>
      <div id="content_1" style={{ position: 'absolute', left: '50px', top: '130px', width: '700px', height: '300px', fontSize: '20px', color: '#374151', lineHeight: '1.8' }}>
        {data.content_1}
      </div>
    </div>
  );
}`,
                jsonData: {
                  title_2: '덧셈 배우기',
                  content_1: '1 + 1 = 2\n2 + 2 = 4\n3 + 3 = 6'
                }
              },
              {
                code: `function Component({ data }) {
  return (
    <div style={{ width: '100%', height: '100%', backgroundColor: '#fef3c7', padding: '40px', position: 'relative' }}>
      <div id="title_3" style={{ position: 'absolute', left: '50px', top: '30px', width: '700px', height: '80px', fontSize: '36px', fontWeight: 'bold', color: '#92400e' }}>
        {data.title_3}
      </div>
      <div id="content_2" style={{ position: 'absolute', left: '50px', top: '130px', width: '700px', height: '300px', fontSize: '20px', color: '#78350f', lineHeight: '1.8' }}>
        {data.content_2}
      </div>
    </div>
  );
}`,
                jsonData: {
                  title_3: '뺄셈 배우기',
                  content_2: '5 - 1 = 4\n4 - 2 = 2\n6 - 3 = 3'
                }
              }
            ]
          }
        },
        {
          id: '2',
          title: '중학 영어 - 현재진행형',
          description: '현재진행형 문법과 활용을 학습합니다',
          created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          total_pages: 2,
          template_data: {
            metadata: {
              material_name: '중학 영어 - 현재진행형',
              material_description: '현재진행형 문법과 활용을 학습합니다',
              total_pages: 2
            },
            components: [
              {
                code: `function Component({ data }) {
  return (
    <div style={{ width: '100%', height: '100%', backgroundColor: '#f0fdf4', padding: '40px', position: 'relative' }}>
      <div id="main_title" style={{ position: 'absolute', left: '50px', top: '50px', width: '700px', height: '100px', fontSize: '48px', fontWeight: 'bold', color: '#065f46', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {data.main_title}
      </div>
      <div id="description" style={{ position: 'absolute', left: '50px', top: '180px', width: '700px', height: '200px', fontSize: '24px', color: '#047857', padding: '20px' }}>
        {data.description}
      </div>
    </div>
  );
}`,
                jsonData: {
                  main_title: 'Present Continuous Tense',
                  description: 'I am studying English.\nYou are reading a book.\nHe is playing soccer.'
                }
              },
              {
                code: `function Component({ data }) {
  return (
    <div style={{ width: '100%', height: '100%', backgroundColor: '#ffffff', padding: '40px', position: 'relative' }}>
      <div id="section_title" style={{ position: 'absolute', left: '50px', top: '30px', width: '700px', height: '80px', fontSize: '36px', fontWeight: 'bold', color: '#065f46' }}>
        {data.section_title}
      </div>
      <div id="examples" style={{ position: 'absolute', left: '50px', top: '130px', width: '700px', height: '300px', fontSize: '20px', color: '#374151', lineHeight: '2' }}>
        {data.examples}
      </div>
    </div>
  );
}`,
                jsonData: {
                  section_title: 'Examples',
                  examples: '✓ She is eating lunch.\n✓ They are watching TV.\n✓ We are learning grammar.'
                }
              }
            ]
          }
        },
        {
          id: '3',
          title: '고등 과학 - 광합성',
          description: '식물의 광합성 과정을 상세히 학습합니다',
          created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          total_pages: 4,
          template_data: {
            metadata: {
              material_name: '고등 과학 - 광합성',
              material_description: '식물의 광합성 과정을 상세히 학습합니다',
              total_pages: 4
            },
            components: [
              {
                code: `function Component({ data }) {
  return (
    <div style={{ width: '100%', height: '100%', backgroundColor: '#ecfdf5', padding: '40px', position: 'relative' }}>
      <div id="header" style={{ position: 'absolute', left: '50px', top: '50px', width: '700px', height: '100px', fontSize: '48px', fontWeight: 'bold', color: '#065f46', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {data.header}
      </div>
    </div>
  );
}`,
                jsonData: {
                  header: '광합성 (Photosynthesis)'
                }
              },
              {
                code: `function Component({ data }) {
  return (
    <div style={{ width: '100%', height: '100%', backgroundColor: '#ffffff', padding: '40px', position: 'relative' }}>
      <div id="topic" style={{ position: 'absolute', left: '50px', top: '30px', width: '700px', height: '80px', fontSize: '36px', fontWeight: 'bold', color: '#065f46' }}>
        {data.topic}
      </div>
      <div id="definition" style={{ position: 'absolute', left: '50px', top: '130px', width: '700px', height: '250px', fontSize: '22px', color: '#374151', lineHeight: '1.8' }}>
        {data.definition}
      </div>
    </div>
  );
}`,
                jsonData: {
                  topic: '광합성이란?',
                  definition: '식물이 빛 에너지를 이용하여\n이산화탄소와 물로부터\n포도당을 합성하는 과정'
                }
              },
              {
                code: `function Component({ data }) {
  return (
    <div style={{ width: '100%', height: '100%', backgroundColor: '#f0fdf4', padding: '40px', position: 'relative' }}>
      <div id="equation_title" style={{ position: 'absolute', left: '50px', top: '30px', width: '700px', height: '80px', fontSize: '36px', fontWeight: 'bold', color: '#065f46' }}>
        {data.equation_title}
      </div>
      <div id="equation" style={{ position: 'absolute', left: '50px', top: '150px', width: '700px', height: '100px', fontSize: '28px', color: '#047857', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
        {data.equation}
      </div>
    </div>
  );
}`,
                jsonData: {
                  equation_title: '화학 반응식',
                  equation: '6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂'
                }
              },
              {
                code: `function Component({ data }) {
  return (
    <div style={{ width: '100%', height: '100%', backgroundColor: '#ffffff', padding: '40px', position: 'relative' }}>
      <div id="factors_title" style={{ position: 'absolute', left: '50px', top: '30px', width: '700px', height: '80px', fontSize: '36px', fontWeight: 'bold', color: '#065f46' }}>
        {data.factors_title}
      </div>
      <div id="factors_list" style={{ position: 'absolute', left: '50px', top: '130px', width: '700px', height: '300px', fontSize: '24px', color: '#374151', lineHeight: '2' }}>
        {data.factors_list}
      </div>
    </div>
  );
}`,
                jsonData: {
                  factors_title: '광합성 영향 요인',
                  factors_list: '• 빛의 세기\n• 이산화탄소 농도\n• 온도\n• 물의 공급'
                }
              }
            ]
          }
        }
      ]

      // 0.5초 대기 (실제 API 호출 시뮬레이션)
      await new Promise(resolve => setTimeout(resolve, 500))

      setPlans(mockPlans)

      // TODO: 실제 구현 (테이블 생성 후):
      // const { data, error } = await supabase
      //   .from('teaching_plans')
      //   .select('*')
      //   .eq('user_id', user?.id)
      //   .order('created_at', { ascending: false })
      //
      // if (error) throw error
      //
      // const formattedPlans: TeachingPlan[] = (data || []).map(item => ({
      //   id: item.id,
      //   title: item.title || '제목 없음',
      //   description: item.description,
      //   created_at: item.created_at,
      //   template_data: item.template_data,
      //   total_pages: item.template_data?.metadata?.total_pages || 0
      // }))
      //
      // setPlans(formattedPlans)

    } catch (error) {
      console.error('Failed to load teaching plans:', error)
      setPlans([])
      toast.error('교안 목록을 불러오는데 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const filteredPlans = plans.filter(plan => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      plan.title.toLowerCase().includes(query) ||
      plan.description?.toLowerCase().includes(query)
    )
  })

  const handleEditPlan = (plan: TeachingPlan) => {
    if (!plan.template_data) {
      toast.error("교안 데이터를 불러올 수 없습니다")
      return
    }
    if (onEdit) {
      onEdit(plan.template_data)
    } else if (onSelect) {
      // 호환성 유지
      onSelect(plan.template_data)
    }
  }

  const handleViewPlan = (plan: TeachingPlan) => {
    if (!plan.template_data) {
      toast.error("교안 데이터를 불러올 수 없습니다")
      return
    }
    if (onView) {
      onView(plan.template_data)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <Loader2 className="w-8 h-8 border-b-2 border-primary mx-auto mb-4 animate-spin" />
            <p className="text-muted-foreground">교안 목록을 불러오는 중...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* 검색 */}
      <Card>
        <CardHeader>
          <CardTitle>교안 목록</CardTitle>
          <CardDescription>
            교안을 선택하여 수정하거나 수업을 진행할 수 있습니다
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="교안 제목이나 설명으로 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* 교안 목록 */}
      {filteredPlans.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              {searchQuery ? (
                <p>검색 결과가 없습니다</p>
              ) : (
                <div className="space-y-2">
                  <p>아직 생성된 교안이 없습니다</p>
                  <p className="text-sm">교안 생성 V2 메뉴에서 새로운 교안을 만들어보세요</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPlans.map((plan) => (
            <Card key={plan.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base line-clamp-2">{plan.title}</CardTitle>
                  <Badge variant="outline" className="shrink-0">
                    {plan.total_pages}장
                  </Badge>
                </div>
                {plan.description && (
                  <CardDescription className="line-clamp-2">
                    {plan.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>{new Date(plan.created_at).toLocaleDateString('ko-KR')}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={() => handleEditPlan(plan)}
                    variant="outline"
                    size="sm"
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    수정하기
                  </Button>
                  <Button
                    onClick={() => handleViewPlan(plan)}
                    variant="default"
                    size="sm"
                    className="bg-primary hover:bg-primary/90"
                  >
                    <Play className="w-4 h-4 mr-1" />
                    수업하기
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
