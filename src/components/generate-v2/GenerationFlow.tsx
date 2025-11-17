import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Sparkles, FileText, Layout, Palette, Code, CheckCircle2, ArrowRight } from "lucide-react"
import { useNavigate, useLocation } from "react-router-dom"

type GenerationStep = {
  id: string
  label: string
  icon: React.ReactNode
  status: "pending" | "processing" | "complete"
}

export function GenerationFlow() {
  const navigate = useNavigate()
  const location = useLocation()
  const uploadedFiles = location.state?.uploadedFiles || []

  const [currentStep, setCurrentStep] = useState(0)
  const [progress, setProgress] = useState(0)
  const [isComplete, setIsComplete] = useState(false)

  const steps: GenerationStep[] = [
    {
      id: "analyze",
      label: "교육 자료 분석 중",
      icon: <FileText className="h-5 w-5" />,
      status: "processing",
    },
    {
      id: "structure",
      label: "학습 구조 생성",
      icon: <Layout className="h-5 w-5" />,
      status: "pending",
    },
    {
      id: "design",
      label: "교육 형식 적용",
      icon: <Palette className="h-5 w-5" />,
      status: "pending",
    },
    {
      id: "content",
      label: "콘텐츠 생성",
      icon: <Code className="h-5 w-5" />,
      status: "pending",
    },
  ]

  const [generationSteps, setGenerationSteps] = useState(steps)

  useEffect(() => {
    // AI 생성 프로세스 시뮬레이션
    const totalSteps = steps.length
    const stepDuration = 3000 // 각 단계마다 3초

    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        const next = prev + 1
        if (next >= totalSteps) {
          clearInterval(interval)
          setIsComplete(true)
          return prev
        }
        return next
      })
    }, stepDuration)

    // 진행률 업데이트
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        const increment = 100 / (totalSteps * (stepDuration / 100))
        const next = prev + increment
        if (next >= 100) {
          clearInterval(progressInterval)
          return 100
        }
        return next
      })
    }, 100)

    return () => {
      clearInterval(interval)
      clearInterval(progressInterval)
    }
  }, [])

  useEffect(() => {
    setGenerationSteps((prev) =>
      prev.map((step, index) => ({
        ...step,
        status: index < currentStep ? "complete" : index === currentStep ? "processing" : "pending",
      }))
    )
  }, [currentStep])

  if (isComplete) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 mb-4">
            <CheckCircle2 className="h-8 w-8 text-green-500" />
          </div>
          <h1 className="text-4xl font-bold mb-2">학습 콘텐츠 생성 완료!</h1>
          <p className="text-lg text-muted-foreground">
            AI가 교육 자료를 분석하여 맞춤형 학습 콘텐츠를 생성했습니다
          </p>
        </div>

        <Card className="p-8 mb-6">
          <div className="aspect-video bg-muted rounded-lg mb-4 flex items-center justify-center">
            <div className="text-center">
              <Layout className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">학습 콘텐츠 미리보기</p>
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold">생성된 콘텐츠</h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>• 학습 목표 및 개요</li>
              <li>• 핵심 개념 설명</li>
              <li>• 실습 활동지</li>
              <li>• 평가 문제</li>
            </ul>
          </div>
        </Card>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" onClick={() => navigate("/generate-v2/materials")}>
            자료 목록으로 이동
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4 animate-pulse">
          <Sparkles className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-4xl font-bold mb-2">AI가 학습 콘텐츠를 생성하고 있습니다</h1>
        <p className="text-lg text-muted-foreground">잠시만 기다려주세요. 곧 완성됩니다!</p>
      </div>

      <Card className="p-8 mb-8">
        <div className="space-y-6">
          {generationSteps.map((step, index) => (
            <div key={step.id} className="flex items-center gap-4">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full ${
                  step.status === "complete"
                    ? "bg-green-500/10 text-green-500"
                    : step.status === "processing"
                      ? "bg-primary/10 text-primary animate-pulse"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {step.status === "complete" ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  step.icon
                )}
              </div>
              <div className="flex-1">
                <p
                  className={`font-medium ${
                    step.status === "processing" ? "text-primary" : ""
                  }`}
                >
                  {step.label}
                </p>
                {step.status === "processing" && (
                  <div className="mt-2">
                    <Progress value={(currentStep / steps.length) * 100} className="h-2" />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="text-center">
        <div className="mb-4">
          <Progress value={progress} className="h-3" />
        </div>
        <p className="text-sm text-muted-foreground">전체 진행률: {Math.round(progress)}%</p>
      </div>

      {uploadedFiles.length > 0 && (
        <div className="mt-8 p-4 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">
            {uploadedFiles.length}개의 파일을 분석 중입니다...
          </p>
        </div>
      )}
    </div>
  )
}
