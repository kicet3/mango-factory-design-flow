import { Type, Square, Image as ImageIcon, MousePointer, Save, Eye, EyeOff, Home } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import type { BlockType } from "./WebsiteEditor"
import { useNavigate } from "react-router-dom"

interface EditorToolbarProps {
  onAddBlock: (type: BlockType) => void
  onSave: () => void
  onPreview: () => void
  isPreviewMode: boolean
}

export function EditorToolbar({ onAddBlock, onSave, onPreview, isPreviewMode }: EditorToolbarProps) {
  const navigate = useNavigate()

  return (
    <div className="border-b border-border bg-card px-4 py-2 flex items-center gap-2">
      <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
        <Home className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="h-6" />

      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" onClick={() => onAddBlock("heading")} disabled={isPreviewMode}>
          <Type className="h-4 w-4 mr-2" />
          제목
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onAddBlock("text")} disabled={isPreviewMode}>
          <Type className="h-4 w-4 mr-2" />
          텍스트
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onAddBlock("button")} disabled={isPreviewMode}>
          <Square className="h-4 w-4 mr-2" />
          버튼
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onAddBlock("image")} disabled={isPreviewMode}>
          <ImageIcon className="h-4 w-4 mr-2" />
          이미지
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6" />

      <div className="flex items-center gap-1 ml-auto">
        <Button variant="ghost" size="sm" onClick={onPreview}>
          {isPreviewMode ? (
            <>
              <EyeOff className="h-4 w-4 mr-2" />
              편집 모드
            </>
          ) : (
            <>
              <Eye className="h-4 w-4 mr-2" />
              미리보기
            </>
          )}
        </Button>
        <Button variant="default" size="sm" onClick={onSave}>
          <Save className="h-4 w-4 mr-2" />
          저장
        </Button>
      </div>
    </div>
  )
}
