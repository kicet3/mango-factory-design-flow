import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { EditorBlock } from "./WebsiteEditor"

interface EditorSidebarProps {
  selectedBlock: EditorBlock | undefined
  onUpdateBlock: (id: string, updates: Partial<EditorBlock>) => void
  onDeleteBlock: (id: string) => void
}

export function EditorSidebar({ selectedBlock, onUpdateBlock, onDeleteBlock }: EditorSidebarProps) {
  return (
    <div className="w-80 border-r border-border bg-card p-4 overflow-y-auto">
      {selectedBlock ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">속성 편집</h2>
            <Button variant="ghost" size="icon" onClick={() => onDeleteBlock(selectedBlock.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          <Card className="p-4 space-y-4">
            <div className="space-y-2">
              <Label>내용</Label>
              {selectedBlock.type === "text" || selectedBlock.type === "heading" ? (
                <Textarea
                  value={selectedBlock.content}
                  onChange={(e) => onUpdateBlock(selectedBlock.id, { content: e.target.value })}
                  rows={3}
                />
              ) : (
                <Input
                  value={selectedBlock.content}
                  onChange={(e) => onUpdateBlock(selectedBlock.id, { content: e.target.value })}
                />
              )}
            </div>

            <div className="space-y-2">
              <Label>글자 크기 (px)</Label>
              <Input
                type="number"
                value={selectedBlock.styles.fontSize || ""}
                onChange={(e) =>
                  onUpdateBlock(selectedBlock.id, {
                    styles: { ...selectedBlock.styles, fontSize: Number(e.target.value) },
                  })
                }
                placeholder="예: 16"
              />
            </div>

            <div className="space-y-2">
              <Label>글자 굵기</Label>
              <select
                className="w-full h-10 px-3 rounded-md border border-input bg-background"
                value={selectedBlock.styles.fontWeight || "normal"}
                onChange={(e) =>
                  onUpdateBlock(selectedBlock.id, {
                    styles: { ...selectedBlock.styles, fontWeight: e.target.value },
                  })
                }
              >
                <option value="normal">보통</option>
                <option value="600">세미볼드</option>
                <option value="bold">볼드</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label>정렬</Label>
              <select
                className="w-full h-10 px-3 rounded-md border border-input bg-background"
                value={selectedBlock.styles.textAlign || "left"}
                onChange={(e) =>
                  onUpdateBlock(selectedBlock.id, {
                    styles: { ...selectedBlock.styles, textAlign: e.target.value },
                  })
                }
              >
                <option value="left">왼쪽</option>
                <option value="center">가운데</option>
                <option value="right">오른쪽</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label>글자 색상</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={selectedBlock.styles.color || "#000000"}
                  onChange={(e) =>
                    onUpdateBlock(selectedBlock.id, {
                      styles: { ...selectedBlock.styles, color: e.target.value },
                    })
                  }
                  className="w-20 h-10 cursor-pointer"
                />
                <Input
                  value={selectedBlock.styles.color || "#000000"}
                  onChange={(e) =>
                    onUpdateBlock(selectedBlock.id, {
                      styles: { ...selectedBlock.styles, color: e.target.value },
                    })
                  }
                  className="flex-1"
                />
              </div>
            </div>

            {selectedBlock.type === "button" && (
              <div className="space-y-2">
                <Label>배경 색상</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={selectedBlock.styles.backgroundColor || "#3b82f6"}
                    onChange={(e) =>
                      onUpdateBlock(selectedBlock.id, {
                        styles: { ...selectedBlock.styles, backgroundColor: e.target.value },
                      })
                    }
                    className="w-20 h-10 cursor-pointer"
                  />
                  <Input
                    value={selectedBlock.styles.backgroundColor || "#3b82f6"}
                    onChange={(e) =>
                      onUpdateBlock(selectedBlock.id, {
                        styles: { ...selectedBlock.styles, backgroundColor: e.target.value },
                      })
                    }
                    className="flex-1"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>X 좌표</Label>
                <Input
                  type="number"
                  value={selectedBlock.x}
                  onChange={(e) => onUpdateBlock(selectedBlock.id, { x: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Y 좌표</Label>
                <Input
                  type="number"
                  value={selectedBlock.y}
                  onChange={(e) => onUpdateBlock(selectedBlock.id, { y: Number(e.target.value) })}
                />
              </div>
            </div>
          </Card>
        </div>
      ) : (
        <div className="text-center text-muted-foreground py-8">
          <p>편집할 요소를 선택하세요</p>
        </div>
      )}
    </div>
  )
}
