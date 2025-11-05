// GenerateV2Upload - PPTX 파일 업로드 페이지
import { Layout } from "@/components/layout/Layout"
import { TemplateUpload } from "@/components/generate-v2/TemplateUpload"

export default function GenerateV2Upload() {
  const handleUploadSuccess = (data: any) => {
    console.log("Upload success:", data)
    // 업로드 성공 처리 (필요시 추가)
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-primary-light/10 via-background to-secondary/20">
        <div className="container mx-auto max-w-7xl px-6 py-8">
          {/* 헤더 */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">PPTX 파일 업로드</h1>
            <p className="text-muted-foreground">
              PPTX 파일을 업로드하여 교안으로 변환합니다
            </p>
          </div>

          <div className="max-w-2xl mx-auto">
            <TemplateUpload onSuccess={handleUploadSuccess} />
          </div>
        </div>
      </div>
    </Layout>
  )
}
