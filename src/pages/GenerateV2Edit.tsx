// GenerateV2Edit - 교안 수정 페이지 (교안 선택만 제공)
import { Layout } from "@/components/layout/Layout"
import { TeachingPlanList } from "@/components/generate-v2/TeachingPlanList"
import { useNavigate } from "react-router-dom"

export default function GenerateV2Edit() {
  const navigate = useNavigate()

  const handleEditPlan = (data: any) => {
    // 교안 수정 - 에디터 페이지로 이동
    console.log("Edit teaching plan:", data)
    const planId = data.id || 'new'
    navigate(`/teaching-plan-editor/${planId}`, { state: { planData: data } })
  }

  const handleViewPlan = (data: any) => {
    // 교안 수업하기 - 뷰어 페이지로 이동
    console.log("View teaching plan:", data)
    navigate('/teaching-plan-viewer', { state: { planData: data } })
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-primary-light/10 via-background to-secondary/20">
        <div className="container mx-auto max-w-7xl px-6 py-8">
          {/* 헤더 */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">교안 관리</h1>
            <p className="text-muted-foreground">
              교안을 선택하여 수정하거나 수업을 진행할 수 있습니다
            </p>
          </div>

          <TeachingPlanList onEdit={handleEditPlan} onView={handleViewPlan} />
        </div>
      </div>
    </Layout>
  )
}
