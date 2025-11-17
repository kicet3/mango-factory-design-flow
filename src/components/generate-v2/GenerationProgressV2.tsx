// GenerationProgressV2 - AI 생성 진행 상황 표시
import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { CheckCircle, Sparkles } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { toast } from "sonner"

interface GenerationProgressV2Props {
  responseId: number
  onComplete: (responseId: number) => void
}

export function GenerationProgressV2({ responseId, onComplete }: GenerationProgressV2Props) {
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<string>("pending")
  const [completed, setCompleted] = useState(false)

  useEffect(() => {
    // Start progress animation (90초 기준: 95% / 90초 = 약 1.055%/초)
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) return 95
        return prev + 1.055
      })
    }, 1000)

    // Poll for generation status
    const statusInterval = setInterval(async () => {
      await checkGenerationStatus()
    }, 3000)

    // Cleanup
    return () => {
      clearInterval(progressInterval)
      clearInterval(statusInterval)
    }
  }, [responseId])

  const checkGenerationStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('generation_responses')
        .select('generation_status')
        .eq('generation_response_id', responseId)
        .maybeSingle()

      if (error) {
        console.error('상태 확인 실패:', error)
        return
      }

      if (data) {
        setStatus(data.generation_status)

        if (data.generation_status === 'completed') {
          setProgress(100)
          setCompleted(true)
          toast.success("생성이 완료되었습니다!")

          // Wait a moment before navigating
          setTimeout(() => {
            onComplete(responseId)
          }, 1000)
        } else if (data.generation_status === 'failed') {
          toast.error("생성에 실패했습니다. 다시 시도해주세요.")
          setProgress(0)
        }
      }
    } catch (error) {
      console.error('상태 확인 실패:', error)
    }
  }

  return (
    <Card className="animate-scale-in">
      <CardContent className="pt-8">
        <div className="text-center space-y-6">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-primary animate-spin" />
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-semibold">AI가 교안 자료를 생성하고 있습니다</h3>
            <p className="text-muted-foreground">
              잠시만 기다려주세요. 선택하신 교안 양식에 맞춰 교과서 내용을 재구성하고 있습니다.
            </p>
          </div>

          <div className="w-full max-w-md mx-auto space-y-2">
            <Progress value={progress} className="w-full" />
            <p className="text-base text-muted-foreground">{Math.round(progress)}% 완료</p>
          </div>

          {completed && (
            <div className="flex items-center justify-center gap-2 text-green-600">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">생성이 완료되었습니다!</span>
            </div>
          )}

          <p className="text-base text-muted-foreground max-w-lg mx-auto">
            *AI 생성자료는 때때로 완벽하지 않아 결과가 기대와 다를 수 있습니다
          </p>

          {status === 'processing' && (
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                <span>교과서 내용 분석 중...</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                <span>교안 양식 적용 중...</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                <span>최종 자료 생성 중...</span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
