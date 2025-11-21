import { useState, useEffect } from "react"
import { StyleEditorPanel } from "./StyleEditorPanel"
import { Button } from "@/components/ui/button"
import { Download, Eye, EyeOff } from "lucide-react"

interface ShapeStyle {
  style?: React.CSSProperties
  className?: string
}

interface StylesData {
  [key: string]: ShapeStyle
}

interface GeneratedContentEditorProps {
  initialStyles?: StylesData
  onStylesChange?: (styles: StylesData) => void
}

export function GeneratedContentEditor({
  initialStyles = {},
  onStylesChange
}: GeneratedContentEditorProps) {
  const [styles, setStyles] = useState<StylesData>(initialStyles)
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null)
  const [isPreviewMode, setIsPreviewMode] = useState(false)

  useEffect(() => {
    if (initialStyles && Object.keys(initialStyles).length > 0) {
      setStyles(initialStyles)
    }
  }, [initialStyles])

  const handleStyleUpdate = (shapeId: string, updates: ShapeStyle) => {
    const updatedStyles = {
      ...styles,
      [shapeId]: {
        ...styles[shapeId],
        ...updates,
        style: {
          ...styles[shapeId]?.style,
          ...updates.style
        }
      }
    }
    setStyles(updatedStyles)
    onStylesChange?.(updatedStyles)
  }

  const handleShapeClick = (e: React.MouseEvent, shapeId: string) => {
    if (isPreviewMode) return
    e.stopPropagation()
    setSelectedShapeId(shapeId)
  }

  const handleExportJson = () => {
    const dataStr = JSON.stringify({ styles }, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr)
    const exportFileDefaultName = 'styles.json'

    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()
  }

  const selectedStyle = selectedShapeId ? styles[selectedShapeId] : undefined

  // 데모용 샘플 요소들 (실제로는 생성된 컴포넌트가 렌더링됨)
  const renderDemoContent = () => {
    const shapeIds = Object.keys(styles)

    if (shapeIds.length === 0) {
      return (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          <p>스타일 데이터를 로드해주세요</p>
        </div>
      )
    }

    // 샘플 렌더링 (실제로는 생성된 컴포넌트의 각 요소에 매핑)
    return (
      <div className="p-8 space-y-4">
        {shapeIds.slice(0, 10).map((shapeId) => {
          const shapeStyle = styles[shapeId]
          const isSelected = shapeId === selectedShapeId

          return (
            <div
              key={shapeId}
              data-shape-id={shapeId}
              onClick={(e) => handleShapeClick(e, shapeId)}
              style={shapeStyle?.style}
              className={`
                ${shapeStyle?.className || ''}
                ${!isPreviewMode && isSelected ? 'ring-2 ring-primary ring-offset-2' : ''}
                ${!isPreviewMode ? 'cursor-pointer hover:ring-2 hover:ring-primary/50' : ''}
                transition-all
              `}
            >
              <div className="p-4 border border-dashed border-gray-300 rounded">
                <div className="text-sm font-mono text-muted-foreground mb-2">
                  {shapeId}
                </div>
                <div className="text-sm">
                  클릭하여 스타일 편집
                </div>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Toolbar */}
      <div className="border-b border-border bg-card px-4 py-3 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">스타일 편집기</h2>
          <p className="text-sm text-muted-foreground">
            {selectedShapeId ? `${selectedShapeId} 편집 중` : '요소를 선택하세요'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPreviewMode(!isPreviewMode)}
          >
            {isPreviewMode ? (
              <>
                <EyeOff className="w-4 h-4 mr-2" />
                미리보기 종료
              </>
            ) : (
              <>
                <Eye className="w-4 h-4 mr-2" />
                미리보기
              </>
            )}
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleExportJson}
          >
            <Download className="w-4 h-4 mr-2" />
            JSON 내보내기
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {!isPreviewMode && (
          <StyleEditorPanel
            selectedShapeId={selectedShapeId}
            selectedStyle={selectedStyle}
            onStyleUpdate={handleStyleUpdate}
          />
        )}

        {/* Canvas */}
        <div
          className="flex-1 overflow-auto bg-muted/20 p-4"
          onClick={() => !isPreviewMode && setSelectedShapeId(null)}
        >
          <div className="w-full h-full bg-background rounded-lg shadow-lg">
            {renderDemoContent()}
          </div>
        </div>
      </div>
    </div>
  )
}
