import { useState } from "react"
import { Trash2, Plus, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"

interface ShapeStyle {
  style?: React.CSSProperties
  className?: string
}

interface StyleEditorPanelProps {
  selectedShapeId: string | null
  selectedStyle: ShapeStyle | undefined
  onStyleUpdate: (shapeId: string, updates: ShapeStyle) => void
}

export function StyleEditorPanel({
  selectedShapeId,
  selectedStyle,
  onStyleUpdate
}: StyleEditorPanelProps) {
  const [newStyleKey, setNewStyleKey] = useState("")
  const [newStyleValue, setNewStyleValue] = useState("")

  if (!selectedShapeId || !selectedStyle) {
    return (
      <div className="w-80 border-r border-border bg-card p-4">
        <div className="text-center text-muted-foreground py-8">
          <p>편집할 요소를 선택하세요</p>
        </div>
      </div>
    )
  }

  const handleClassNameChange = (newClassName: string) => {
    onStyleUpdate(selectedShapeId, {
      ...selectedStyle,
      className: newClassName
    })
  }

  const handleStylePropertyChange = (key: string, value: string) => {
    const updatedStyle = {
      ...selectedStyle.style,
      [key]: value
    }
    onStyleUpdate(selectedShapeId, {
      ...selectedStyle,
      style: updatedStyle
    })
  }

  const handleStylePropertyDelete = (key: string) => {
    const updatedStyle = { ...selectedStyle.style }
    delete updatedStyle[key as keyof React.CSSProperties]
    onStyleUpdate(selectedShapeId, {
      ...selectedStyle,
      style: updatedStyle
    })
  }

  const handleAddStyleProperty = () => {
    if (newStyleKey && newStyleValue) {
      handleStylePropertyChange(newStyleKey, newStyleValue)
      setNewStyleKey("")
      setNewStyleValue("")
    }
  }

  const handleCopyJson = () => {
    const json = JSON.stringify({ [selectedShapeId]: selectedStyle }, null, 2)
    navigator.clipboard.writeText(json)
  }

  const styleEntries = selectedStyle.style ? Object.entries(selectedStyle.style) : []

  return (
    <div className="w-96 border-r border-border bg-card">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">스타일 편집</h2>
          <Button variant="ghost" size="icon" onClick={handleCopyJson}>
            <Copy className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground font-mono">{selectedShapeId}</p>
      </div>

      <ScrollArea className="h-[calc(100vh-120px)]">
        <div className="p-4 space-y-4">
          {/* ClassName 편집 */}
          <Card className="p-4 space-y-2">
            <Label className="text-sm font-semibold">className</Label>
            <Textarea
              value={selectedStyle.className || ""}
              onChange={(e) => handleClassNameChange(e.target.value)}
              placeholder="예: flex items-center justify-center"
              rows={3}
              className="font-mono text-xs"
            />
          </Card>

          {/* Style 속성들 */}
          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">style 속성</Label>
              <span className="text-xs text-muted-foreground">
                {styleEntries.length}개
              </span>
            </div>

            <div className="space-y-2">
              {styleEntries.map(([key, value]) => (
                <div key={key} className="flex gap-2 items-start">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs font-mono text-muted-foreground">
                      {key}
                    </Label>
                    <Input
                      value={String(value)}
                      onChange={(e) => handleStylePropertyChange(key, e.target.value)}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 mt-5"
                    onClick={() => handleStylePropertyDelete(key)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>

            {/* 새 속성 추가 */}
            <div className="pt-3 border-t border-border">
              <Label className="text-xs font-semibold mb-2 block">
                새 속성 추가
              </Label>
              <div className="space-y-2">
                <Input
                  placeholder="속성 이름 (예: fontSize)"
                  value={newStyleKey}
                  onChange={(e) => setNewStyleKey(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
                <Input
                  placeholder="값 (예: 1.5rem)"
                  value={newStyleValue}
                  onChange={(e) => setNewStyleValue(e.target.value)}
                  className="h-8 text-xs font-mono"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleAddStyleProperty()
                    }
                  }}
                />
                <Button
                  size="sm"
                  className="w-full h-8"
                  onClick={handleAddStyleProperty}
                  disabled={!newStyleKey || !newStyleValue}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  추가
                </Button>
              </div>
            </div>
          </Card>

          {/* 일반 스타일 속성 퀵 편집 */}
          <Card className="p-4 space-y-3">
            <Label className="text-sm font-semibold">빠른 편집</Label>

            {/* 색상 */}
            <div className="space-y-2">
              <Label className="text-xs">색상 (color)</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={String(selectedStyle.style?.color || "#000000")}
                  onChange={(e) => handleStylePropertyChange("color", e.target.value)}
                  className="w-16 h-8 cursor-pointer"
                />
                <Input
                  value={String(selectedStyle.style?.color || "")}
                  onChange={(e) => handleStylePropertyChange("color", e.target.value)}
                  placeholder="색상"
                  className="flex-1 h-8 text-xs font-mono"
                />
              </div>
            </div>

            {/* 배경색 */}
            <div className="space-y-2">
              <Label className="text-xs">배경 (background)</Label>
              <Textarea
                value={String(selectedStyle.style?.background || "")}
                onChange={(e) => handleStylePropertyChange("background", e.target.value)}
                placeholder="예: linear-gradient(...)"
                rows={2}
                className="text-xs font-mono"
              />
            </div>

            {/* 글자 크기 */}
            <div className="space-y-2">
              <Label className="text-xs">글자 크기 (fontSize)</Label>
              <Input
                value={String(selectedStyle.style?.fontSize || "")}
                onChange={(e) => handleStylePropertyChange("fontSize", e.target.value)}
                placeholder="예: 1.5rem, 24px"
                className="h-8 text-xs font-mono"
              />
            </div>

            {/* Padding */}
            <div className="space-y-2">
              <Label className="text-xs">여백 (padding)</Label>
              <Input
                value={String(selectedStyle.style?.padding || "")}
                onChange={(e) => handleStylePropertyChange("padding", e.target.value)}
                placeholder="예: 1rem, 16px"
                className="h-8 text-xs font-mono"
              />
            </div>

            {/* Margin */}
            <div className="space-y-2">
              <Label className="text-xs">마진 (margin)</Label>
              <Input
                value={String(selectedStyle.style?.margin || "")}
                onChange={(e) => handleStylePropertyChange("margin", e.target.value)}
                placeholder="예: 1rem auto"
                className="h-8 text-xs font-mono"
              />
            </div>
          </Card>

          {/* JSON 미리보기 */}
          <Card className="p-4 space-y-2">
            <Label className="text-xs font-semibold">JSON 미리보기</Label>
            <pre className="text-xs font-mono bg-muted p-2 rounded overflow-x-auto">
              {JSON.stringify({ [selectedShapeId]: selectedStyle }, null, 2)}
            </pre>
          </Card>
        </div>
      </ScrollArea>
    </div>
  )
}
