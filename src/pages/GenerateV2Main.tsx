// GenerateV2Main - 교과서 선택 → 교안 선택 플로우
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Layout } from "@/components/layout/Layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, ArrowLeft, Sparkles } from "lucide-react"
import { CourseSelector } from "@/components/generate-v2/CourseSelector"
import { TeachingPlanSelectorV2 } from "@/components/generate-v2/TeachingPlanSelectorV2"
import { GenerationProgressV2 } from "@/components/generate-v2/GenerationProgressV2"
import { useAuth } from "@/hooks/use-auth"
import { supabase } from "@/integrations/supabase/client"
import { toast } from "sonner"

type Step = 'course' | 'plan' | 'generating' | 'result'

export interface CourseData {
  course_id: number
  course_type_id: number
  course_type_name: string
  teaching_style_ids: number[]
  cowork_type_ids: number[]
  course_material_scope: {
    course_sections_index: number
    course_weeks_indices: number[]
  } | null
  difficulty_id: number
  expected_duration_min: number
  additional_message: string
  description: string | null
  grade_level_id: number
  grade_level_name: string
}

export interface TeachingPlanData {
  plan_id: number
  plan_name: string
  plan_format: any
}

export default function GenerateV2Main() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('course')
  const [courseData, setCourseData] = useState<CourseData | null>(null)
  const [planData, setPlanData] = useState<TeachingPlanData | null>(null)
  const [generationResponseId, setGenerationResponseId] = useState<number | null>(null)

  const getStepNumber = () => {
    switch (step) {
      case 'course': return 1
      case 'plan': return 2
      case 'generating': return 3
      case 'result': return 3
      default: return 1
    }
  }

  const handleCourseSubmit = (data: CourseData) => {
    setCourseData(data)
    setStep('plan')
  }

  const handlePlanSelect = (data: TeachingPlanData) => {
    setPlanData(data)
    handleGenerate(data)
  }

  const handleGenerate = async (planData: TeachingPlanData) => {
    if (!courseData) {
      toast.error("교과서 정보가 없습니다")
      return
    }

    setStep('generating')

    try {
      // 백엔드에 AI 생성 요청
      const { data, error } = await supabase.functions.invoke('request-generation-v2', {
        body: {
          user_id: user?.id,
          course_data: courseData,
          teaching_plan_data: planData
        }
      })

      if (error) {
        throw error
      }

      if (data?.generation_response_id) {
        setGenerationResponseId(data.generation_response_id)
        toast.success("AI 생성이 시작되었습니다!")
      } else {
        throw new Error("생성 응답이 올바르지 않습니다")
      }

    } catch (error) {
      console.error('Generation error:', error)
      toast.error("생성 중 오류가 발생했습니다")
      setStep('plan')
    }
  }

  const handleGenerationComplete = (responseId: number) => {
    setGenerationResponseId(responseId)
    setTimeout(() => {
      navigate(`/generation/${responseId}`)
    }, 1000)
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-primary-light/10 via-background to-secondary/20">
        <div className="container mx-auto max-w-5xl px-6 py-8">
          {/* Progress Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-3xl font-bold">AI 기반 교안 자료 생성</h1>
              <Badge variant="outline">
                단계 {getStepNumber()}/3
              </Badge>
            </div>
            <div className="flex items-center gap-4">
              {['교과서 선택', '교안 선택', 'AI 생성'].map((stepName, index) => (
                <div key={stepName} className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-base font-medium transition-colors ${
                    index < getStepNumber() ? 'bg-primary text-primary-foreground' :
                    index === getStepNumber() - 1 ? 'bg-primary text-primary-foreground' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {index + 1}
                  </div>
                  <span className={`text-base ${index < getStepNumber() ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                    {stepName}
                  </span>
                  {index < 2 && (
                    <ArrowRight className="w-4 h-4 text-muted-foreground mx-2" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Step Content */}
          {step === 'course' && (
            <div className="animate-in slide-in-from-right-10 fade-in duration-500">
              <CourseSelector onSubmit={handleCourseSubmit} />
            </div>
          )}

          {step === 'plan' && courseData && (
            <div className="animate-in slide-in-from-right-10 fade-in duration-500">
              <TeachingPlanSelectorV2
                onSelect={handlePlanSelect}
                courseData={courseData}
              />

              <div className="mt-6 flex justify-between">
                <Button variant="outline" onClick={() => setStep('course')}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  이전
                </Button>
              </div>
            </div>
          )}

          {step === 'generating' && generationResponseId && (
            <div className="animate-in slide-in-from-right-10 fade-in duration-500">
              <GenerationProgressV2
                responseId={generationResponseId}
                onComplete={handleGenerationComplete}
              />
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
