import { useState, useCallback } from "react"
import { Upload, FileText, X, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { useNavigate } from "react-router-dom"
import { useFileUpload } from "@/hooks/useFileUpload"
import { toast } from "sonner"

interface UploadedFile {
  id: string
  file: File
  progress: number
  status: "uploading" | "processing" | "complete" | "error"
  url?: string
}

export function UploadInterface() {
  const navigate = useNavigate()
  const { uploadFile, uploading } = useFileUpload()
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [isDragging, setIsDragging] = useState(false)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const droppedFiles = Array.from(e.dataTransfer.files)
    handleFiles(droppedFiles)
  }, [])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files)
      handleFiles(selectedFiles)
    }
  }, [])

  const handleFiles = async (newFiles: File[]) => {
    const uploadedFiles: UploadedFile[] = newFiles.map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      progress: 0,
      status: "uploading" as const,
    }))

    setFiles((prev) => [...prev, ...uploadedFiles])

    // 실제 업로드 처리
    for (const uploadedFile of uploadedFiles) {
      try {
        // 진행률 시뮬레이션
        const progressInterval = setInterval(() => {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === uploadedFile.id && f.progress < 90
                ? { ...f, progress: f.progress + 10 }
                : f
            )
          )
        }, 200)

        const result = await uploadFile(uploadedFile.file, "course-materials")

        clearInterval(progressInterval)

        if (result.success) {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === uploadedFile.id
                ? { ...f, progress: 100, status: "complete", url: result.url }
                : f
            )
          )
        } else {
          throw new Error(result.error)
        }
      } catch (error) {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadedFile.id ? { ...f, status: "error" } : f
          )
        )
        toast.error("파일 업로드 실패")
      }
    }
  }

  const removeFile = (fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId))
  }

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase()
    return <FileText className="h-5 w-5 text-primary" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
  }

  const hasCompleteFiles = files.some((f) => f.status === "complete")

  const handleGenerate = () => {
    const uploadedUrls = files
      .filter((f) => f.status === "complete" && f.url)
      .map((f) => f.url!)

    // 업로드된 파일 정보를 state로 전달
    navigate("/generate-v2/flow", {
      state: { uploadedFiles: uploadedUrls }
    })
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">교육 자료 업로드</h1>
        <p className="text-lg text-muted-foreground">
          수업 자료를 업로드하면 AI가 맞춤형 학습 콘텐츠를 생성합니다
        </p>
      </div>

      {/* Upload Area */}
      <Card
        className={`border-2 border-dashed transition-colors ${
          isDragging ? "border-primary bg-primary/5" : "border-border"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="p-12 text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-primary/10 p-4">
              <Upload className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h3 className="text-xl font-semibold mb-2">파일을 드래그하거나 클릭하여 업로드</h3>
          <p className="text-muted-foreground mb-6">
            지원 형식: PDF, PPT, DOCX, HWP, TXT (최대 10MB)
          </p>
          <input
            type="file"
            id="file-upload"
            className="hidden"
            multiple
            accept=".pdf,.ppt,.pptx,.doc,.docx,.hwp,.hwpx,.txt"
            onChange={handleFileInput}
          />
          <label htmlFor="file-upload">
            <Button asChild size="lg" disabled={uploading}>
              <span>{uploading ? "업로드 중..." : "파일 선택"}</span>
            </Button>
          </label>
        </div>
      </Card>

      {/* Uploaded Files List */}
      {files.length > 0 && (
        <div className="mt-8 space-y-4">
          <h3 className="text-lg font-semibold">업로드된 파일</h3>
          {files.map((uploadedFile) => (
            <Card key={uploadedFile.id} className="p-4">
              <div className="flex items-start gap-4">
                <div className="mt-1">{getFileIcon(uploadedFile.file.name)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{uploadedFile.file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatFileSize(uploadedFile.file.size)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => removeFile(uploadedFile.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  {uploadedFile.status === "uploading" && (
                    <div className="space-y-1">
                      <Progress value={uploadedFile.progress} />
                      <p className="text-xs text-muted-foreground">
                        업로드 중... {uploadedFile.progress}%
                      </p>
                    </div>
                  )}
                  {uploadedFile.status === "complete" && (
                    <p className="text-sm text-green-500 font-medium">✓ 업로드 완료</p>
                  )}
                  {uploadedFile.status === "error" && (
                    <p className="text-sm text-red-500 font-medium">✗ 업로드 실패</p>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Generate Button */}
      {hasCompleteFiles && (
        <div className="mt-8 flex justify-center">
          <Button size="lg" className="gap-2" onClick={handleGenerate}>
            <Sparkles className="h-5 w-5" />
            AI로 학습 콘텐츠 생성하기
          </Button>
        </div>
      )}
    </div>
  )
}
