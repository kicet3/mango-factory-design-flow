// TeachingPlanSelectorV2 - 교안 선택 (수업 활동 선택 스타일)
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { FileText, Search, CheckCircle, Sparkles } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { toast } from "sonner"
import type { CourseData, TeachingPlanData } from "@/pages/GenerateV2Main"

interface TeachingPlanSelectorV2Props {
  onSelect: (data: TeachingPlanData) => void
  courseData: CourseData
}

interface TeachingPlan {
  teaching_plan_id: number
  teaching_plan_name: string
  teaching_plan_description: string
  teaching_plan_format: any
  course_type_id?: number
  created_at?: string
}

export function TeachingPlanSelectorV2({ onSelect, courseData }: TeachingPlanSelectorV2Props) {
  const [teachingPlans, setTeachingPlans] = useState<TeachingPlan[]>([])
  const [filteredPlans, setFilteredPlans] = useState<TeachingPlan[]>([])
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTeachingPlans()
  }, [courseData.course_type_id])

  useEffect(() => {
    if (searchQuery) {
      const filtered = teachingPlans.filter(plan =>
        plan.teaching_plan_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (plan.teaching_plan_description && plan.teaching_plan_description.toLowerCase().includes(searchQuery.toLowerCase()))
      )
      setFilteredPlans(filtered)
    } else {
      setFilteredPlans(teachingPlans)
    }
  }, [searchQuery, teachingPlans])

  const loadTeachingPlans = async () => {
    try {
      setLoading(true)

      // Load teaching plans from database
      // Filter by course_type_id if available, or get all
      let query = supabase
        .from('teaching_plans')
        .select('*')
        .order('teaching_plan_id')

      // Optionally filter by course type
      // Uncomment if you want to filter by course type
      // if (courseData.course_type_id) {
      //   query = query.eq('course_type_id', courseData.course_type_id)
      // }

      const { data, error } = await query

      if (error) {
        console.error('교안 로딩 실패:', error)
        toast.error("교안 목록을 불러오는데 실패했습니다")
        setTeachingPlans([])
        setFilteredPlans([])
        return
      }

      setTeachingPlans(data || [])
      setFilteredPlans(data || [])

    } catch (error) {
      console.error('교안 로딩 실패:', error)
      toast.error("교안 목록을 불러오는데 실패했습니다")
      setTeachingPlans([])
      setFilteredPlans([])
    } finally {
      setLoading(false)
    }
  }

  const handlePlanSelect = (plan: TeachingPlan) => {
    setSelectedPlanId(plan.teaching_plan_id)

    // Immediately call onSelect with the plan data
    onSelect({
      plan_id: plan.teaching_plan_id,
      plan_name: plan.teaching_plan_name,
      plan_format: plan.teaching_plan_format
    })
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2">
              <Sparkles className="w-5 h-5 text-primary animate-spin" />
              <p className="text-muted-foreground">교안 목록을 불러오는 중...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="animate-scale-in">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          교안 선택
        </CardTitle>
        <CardDescription>
          생성할 교안의 형태를 선택해주세요.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Search Input */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="교안 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {filteredPlans.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-base text-muted-foreground">
                {selectedPlanId ? '1개 교안 선택됨' : '교안을 선택해주세요'}
              </p>
            </div>

            <div className="p-4 border border-border rounded-lg bg-muted/20">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPlans.map((plan) => {
                  const isSelected = selectedPlanId === plan.teaching_plan_id

                  return (
                    <Card
                      key={plan.teaching_plan_id}
                      className={`h-44 cursor-pointer transition-all hover:scale-[1.02] flex flex-col ${
                        isSelected
                          ? 'ring-2 ring-primary bg-primary/10'
                          : 'hover:shadow-md'
                      }`}
                      onClick={() => handlePlanSelect(plan)}
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
                            <CardTitle className="text-base leading-tight line-clamp-2" title={plan.teaching_plan_name}>
                              {plan.teaching_plan_name}
                            </CardTitle>
                            {plan.teaching_plan_description && (
                              <CardDescription className="text-sm mt-1 line-clamp-2">
                                {plan.teaching_plan_description}
                              </CardDescription>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <Badge variant="secondary" className="text-sm">
                          교안 양식
                        </Badge>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {searchQuery ? '검색 결과가 없습니다.' : '사용 가능한 교안이 없습니다.'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
