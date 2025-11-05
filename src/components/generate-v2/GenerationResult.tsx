import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Download, Eye, RotateCcw, Share2 } from "lucide-react"
import { toast } from "sonner"

interface GenerationResultProps {
  result: any
  plan: any
  content: any
  onReset: () => void
}

export function GenerationResult({ result, plan, content, onReset }: GenerationResultProps) {
  const handleDownload = () => {
    // TODO: 실제 다운로드 로직 구현
    toast.success("자료가 다운로드됩니다")
  }

  const handlePreview = () => {
    // TODO: 미리보기 모달 또는 새 창 열기
    toast.info("미리보기 기능은 준비 중입니다")
  }

  const handleShare = () => {
    // TODO: 공유 기능 구현
    toast.info("공유 기능은 준비 중입니다")
  }

  return (
    <div className="space-y-6">
      {/* Success Header */}
      <Card className="border-green-200 bg-green-50/50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-green-500 p-2">
              <CheckCircle className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl">AI 생성이 완료되었습니다!</CardTitle>
              <CardDescription className="text-green-700">
                교안 양식과 교과서 내용을 결합한 맞춤형 자료가 생성되었습니다
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Generation Info */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">사용된 교안</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-medium">{plan?.plan_name}</p>
            <Badge variant="outline" className="mt-2">교안 양식</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">사용된 교과서 내용</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-medium">{content?.content_title}</p>
            <Badge variant="outline" className="mt-2">교과서 내용</Badge>
          </CardContent>
        </Card>
      </div>

      {/* Generated Content Preview */}
      <Card>
        <CardHeader>
          <CardTitle>생성된 자료 미리보기</CardTitle>
          <CardDescription>
            AI가 교안 양식에 맞춰 교과서 내용을 재구성했습니다
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/30 rounded-lg p-6 space-y-4">
            {/* TODO: 실제 생성된 내용 표시 */}
            <div>
              <h3 className="font-semibold mb-2 text-lg">📋 수업 개요</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {result?.overview || "AI가 생성한 수업 개요가 여기에 표시됩니다. 교안 양식의 구조에 따라 교과서 내용이 재구성되어 표시됩니다."}
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2 text-lg">🎯 학습 목표</h3>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>{result?.objectives?.[0] || "생성된 학습 목표 1"}</li>
                <li>{result?.objectives?.[1] || "생성된 학습 목표 2"}</li>
                <li>{result?.objectives?.[2] || "생성된 학습 목표 3"}</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2 text-lg">📖 수업 내용</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {result?.content || "교과서 내용을 기반으로 AI가 생성한 상세 수업 내용이 여기에 표시됩니다. 교안 양식의 각 섹션에 맞춰 내용이 구성됩니다."}
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2 text-lg">✏️ 활동 및 평가</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {result?.activities || "학습 활동과 평가 방법이 여기에 표시됩니다."}
              </p>
            </div>
          </div>

          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              💡 <strong>참고:</strong> 생성된 자료는 다운로드하여 워드나 PDF 형식으로 편집할 수 있습니다.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={handleDownload} size="lg" className="gap-2">
          <Download className="h-4 w-4" />
          자료 다운로드
        </Button>
        <Button onClick={handlePreview} variant="outline" size="lg" className="gap-2">
          <Eye className="h-4 w-4" />
          전체 미리보기
        </Button>
        <Button onClick={handleShare} variant="outline" size="lg" className="gap-2">
          <Share2 className="h-4 w-4" />
          공유하기
        </Button>
        <Button onClick={onReset} variant="ghost" size="lg" className="gap-2 ml-auto">
          <RotateCcw className="h-4 w-4" />
          새로 만들기
        </Button>
      </div>
    </div>
  )
}
