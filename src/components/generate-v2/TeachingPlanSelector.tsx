import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { FileText, Search } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { toast } from "sonner"

interface TeachingPlan {
  plan_id: number
  plan_name: string
  plan_description: string
  plan_format: any
  subject: string
  grade: string
}

interface TeachingPlanSelectorProps {
  onSelect: (plan: any) => void
}

export function TeachingPlanSelector({ onSelect }: TeachingPlanSelectorProps) {
  const [plans, setPlans] = useState<TeachingPlan[]>([])
  const [filteredPlans, setFilteredPlans] = useState<TeachingPlan[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null)

  useEffect(() => {
    loadTeachingPlans()
  }, [])

  useEffect(() => {
    if (searchQuery) {
      const filtered = plans.filter(plan =>
        plan.plan_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        plan.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        plan.grade.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredPlans(filtered)
    } else {
      setFilteredPlans(plans)
    }
  }, [searchQuery, plans])

  const loadTeachingPlans = async () => {
    try {
      setLoading(true)

      // TODO: 실제 교안 테이블에서 조회
      // 임시 데이터로 시뮬레이션
      const mockPlans: TeachingPlan[] = [
        {
          plan_id: 1,
          plan_name: "문제 해결 중심 수업 교안",
          plan_description: "학생들의 문제 해결 능력을 기르는 교안 양식입니다",
          plan_format: { type: "problem_solving", sections: ["도입", "문제제시", "해결과정", "정리"] },
          subject: "수학",
          grade: "중학교 1학년"
        },
        {
          plan_id: 2,
          plan_name: "프로젝트 기반 학습 교안",
          plan_description: "프로젝트를 통한 협력 학습 교안 양식입니다",
          plan_format: { type: "project_based", sections: ["주제소개", "계획수립", "실행", "발표", "평가"] },
          subject: "과학",
          grade: "중학교 2학년"
        },
        {
          plan_id: 3,
          plan_name: "토론 중심 수업 교안",
          plan_description: "학생 주도 토론을 위한 교안 양식입니다",
          plan_format: { type: "discussion", sections: ["주제제시", "자료조사", "토론준비", "토론진행", "정리"] },
          subject: "사회",
          grade: "중학교 3학년"
        },
        {
          plan_id: 4,
          plan_name: "실험 중심 과학 교안",
          plan_description: "실험 및 관찰 활동을 위한 교안 양식입니다",
          plan_format: { type: "experiment", sections: ["이론학습", "실험설계", "실험수행", "결과분석", "결론도출"] },
          subject: "과학",
          grade: "중학교 1학년"
        },
        {
          plan_id: 5,
          plan_name: "독서 토론 교안",
          plan_description: "문학 작품 독서 후 토론을 위한 교안 양식입니다",
          plan_format: { type: "reading_discussion", sections: ["작품소개", "독서활동", "토론주제", "토론", "감상문작성"] },
          subject: "국어",
          grade: "중학교 2학년"
        }
      ]

      setPlans(mockPlans)
      setFilteredPlans(mockPlans)

    } catch (error) {
      console.error('교안 목록 로딩 실패:', error)
      toast.error("교안 목록을 불러오는데 실패했습니다")
    } finally {
      setLoading(false)
    }
  }

  const handleSelect = (plan: TeachingPlan) => {
    setSelectedPlanId(plan.plan_id)
    onSelect({
      plan_id: plan.plan_id,
      plan_name: plan.plan_name,
      plan_format: plan.plan_format
    })
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">교안 목록을 불러오는 중...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>교안 양식 선택</CardTitle>
          <CardDescription>
            사용할 교안 양식을 선택해주세요. 선택한 양식에 맞춰 자료가 생성됩니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="교안 검색 (과목, 학년, 이름)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {filteredPlans.map((plan) => (
              <Card
                key={plan.plan_id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedPlanId === plan.plan_id
                    ? "border-primary ring-2 ring-primary/20"
                    : "border-border"
                }`}
                onClick={() => handleSelect(plan)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <FileText className="h-5 w-5 text-primary" />
                    {selectedPlanId === plan.plan_id && (
                      <Badge variant="default">선택됨</Badge>
                    )}
                  </div>
                  <CardTitle className="text-lg">{plan.plan_name}</CardTitle>
                  <CardDescription>{plan.plan_description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Badge variant="outline">{plan.subject}</Badge>
                    <Badge variant="outline">{plan.grade}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredPlans.length === 0 && (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">검색 결과가 없습니다</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
