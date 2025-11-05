// TemplateUpload - PPTX 파일 업로드
import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Upload, FileText, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface TemplateUploadProps {
  onSuccess: (data: any) => void
}

export function TemplateUpload({ onSuccess }: TemplateUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]

      // PPTX 파일만 허용
      const validExtensions = ['.pptx']
      const fileExtension = selectedFile.name.toLowerCase().match(/\.(pptx)$/)?.[0]

      if (!fileExtension || !validExtensions.includes(fileExtension)) {
        toast.error("PPTX 파일만 업로드 가능합니다", {
          duration: 2000,
          position: 'top-right'
        })
        return
      }

      setFile(selectedFile)
    }
  }

  const handleUpload = async () => {
    if (!file) {
      toast.error("파일을 선택해주세요", {
        duration: 2000,
        position: 'top-right'
      })
      return
    }

    setUploading(true)
    setProgress(0)

    try {
      // 진행률 시뮬레이션 (30초 기준)
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) return prev
          return prev + 3 // 30초 동안 90%까지 도달 (3% * 30 = 90%)
        })
      }, 1000) // 1초마다 3%씩 증가

      // PPTX 파일 업로드
      const formData = new FormData()
      formData.append('file', file)
      formData.append('file_type', 'pptx')
      formData.append('component_name', 'GeneratedComponent')
      formData.append('framework', 'react')
      formData.append('styling', 'tailwind')
      formData.append('typescript', 'true')

      const apiUrl = import.meta.env.VITE_BACKEND_API_URL || 'http://127.0.0.1:8000'
      const response = await fetch(`${apiUrl}/document-convert-react/convert`, {
        method: 'POST',
        body: formData,
      })

      clearInterval(progressInterval)

      if (!response.ok) {
        throw new Error('파일 변환에 실패했습니다')
      }

      const data = await response.json()

      console.log('=== API Response Data ===')
      console.log('Full response:', data)

      setProgress(100)

      // 성공 메시지 (2초 후 자동 사라짐, 오른쪽 상단 표시)
      toast.success('업로드 요청이 완료되었습니다.', {
        duration: 2000,
        position: 'top-right'
      })

      // 부모 컴포넌트로 데이터 전달
      setTimeout(() => {
        onSuccess(data)
      }, 500)

    } catch (error) {
      console.error('Upload error:', error)
      toast.error('파일 업로드 중 오류가 발생했습니다', {
        duration: 2000,
        position: 'top-right'
      })
      setProgress(0)
    } finally {
      setUploading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>PPTX 파일 업로드</CardTitle>
        <CardDescription>
          PPTX 파일을 업로드하여 교안으로 변환합니다
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 파일 선택 */}
        <div className="space-y-2">
          <Label htmlFor="file-upload">파일 선택</Label>
          <div className="flex gap-2">
            <Input
              id="file-upload"
              type="file"
              accept=".pptx"
              onChange={handleFileChange}
              disabled={uploading}
            />
            {file && (
              <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-md">
                <FileText className="w-4 h-4" />
                <span className="text-sm">{file.name}</span>
              </div>
            )}
          </div>
        </div>

        {/* 진행률 */}
        {uploading && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>변환 진행중...</Label>
              <span className="text-sm text-muted-foreground">{progress}%</span>
            </div>
            <Progress value={progress} />
          </div>
        )}

        {/* 업로드 버튼 */}
        <Button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="w-full gap-2"
          size="lg"
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              변환 중...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              파일 업로드
            </>
          )}
        </Button>

        {/* 안내 메시지 */}
        <div className="text-sm text-muted-foreground space-y-1">
          <p>• PPTX 파일만 업로드할 수 있습니다</p>
          <p>• 파일 변환에는 1-2분 정도 소요될 수 있습니다</p>
        </div>
      </CardContent>
    </Card>
  )
}
