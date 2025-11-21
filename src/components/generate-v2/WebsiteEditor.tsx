import { useState } from "react"
import { EditorSidebar } from "./EditorSidebar"
import { EditorCanvas } from "./EditorCanvas"
import { EditorToolbar } from "./EditorToolbar"
import { GeneratedContentEditor } from "./GeneratedContentEditor"

export type BlockType = "text" | "image" | "button" | "heading" | "container"

export interface EditorBlock {
  id: string
  type: BlockType
  content: string
  x: number
  y: number
  styles: {
    fontSize?: number
    fontWeight?: string
    color?: string
    backgroundColor?: string
    textAlign?: string
    width?: string
    height?: string
  }
}

interface StylesData {
  [key: string]: {
    style?: React.CSSProperties
    className?: string
  }
}

interface WebsiteEditorProps {
  mode?: 'blocks' | 'json-styles'
  initialStylesData?: StylesData
  onStylesChange?: (styles: StylesData) => void
}

export function WebsiteEditor({
  mode = 'blocks',
  initialStylesData,
  onStylesChange
}: WebsiteEditorProps = {}) {
  const [blocks, setBlocks] = useState<EditorBlock[]>([
    {
      id: "1",
      type: "heading",
      content: "학습 콘텐츠 제목",
      x: 100,
      y: 50,
      styles: {
        fontSize: 48,
        fontWeight: "bold",
        textAlign: "center",
      },
    },
    {
      id: "2",
      type: "text",
      content: "이 부분을 클릭하여 수정하거나 드래그하여 이동할 수 있습니다.",
      x: 100,
      y: 150,
      styles: {
        fontSize: 18,
        textAlign: "center",
      },
    },
    {
      id: "3",
      type: "button",
      content: "학습 시작하기",
      x: 100,
      y: 250,
      styles: {
        backgroundColor: "#3b82f6",
        color: "#ffffff",
        textAlign: "center",
        fontWeight: "600",
        fontSize: 16,
      },
    },
  ])

  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)
  const [isPreviewMode, setIsPreviewMode] = useState(false)

  const updateBlock = (id: string, updates: Partial<EditorBlock>) => {
    setBlocks(blocks.map((block) => (block.id === id ? { ...block, ...updates } : block)))
  }

  const deleteBlock = (id: string) => {
    setBlocks(blocks.filter((block) => block.id !== id))
    if (selectedBlockId === id) {
      setSelectedBlockId(null)
    }
  }

  const moveBlock = (id: string, x: number, y: number) => {
    updateBlock(id, { x, y })
  }

  const addBlock = (type: BlockType) => {
    const newBlock: EditorBlock = {
      id: Date.now().toString(),
      type,
      content: type === "heading" ? "새 제목" : type === "button" ? "버튼" : "새 텍스트",
      x: 50,
      y: 50,
      styles: {
        fontSize: type === "heading" ? 32 : 16,
        fontWeight: type === "heading" ? "bold" : "normal",
      },
    }
    setBlocks([...blocks, newBlock])
    setSelectedBlockId(newBlock.id)
  }

  const selectedBlock = blocks.find((b) => b.id === selectedBlockId)

  // JSON 스타일 모드인 경우 GeneratedContentEditor 사용
  if (mode === 'json-styles') {
    return (
      <GeneratedContentEditor
        initialStyles={initialStylesData}
        onStylesChange={onStylesChange}
      />
    )
  }

  // 기본 블록 편집 모드
  return (
    <div className="h-screen flex flex-col bg-background">
      <EditorToolbar
        onAddBlock={addBlock}
        onSave={() => {
          console.log("Saving...", blocks)
        }}
        onPreview={() => setIsPreviewMode(!isPreviewMode)}
        isPreviewMode={isPreviewMode}
      />

      <div className="flex-1 flex overflow-hidden">
        {!isPreviewMode && (
          <EditorSidebar
            selectedBlock={selectedBlock}
            onUpdateBlock={updateBlock}
            onDeleteBlock={deleteBlock}
          />
        )}

        <EditorCanvas
          blocks={blocks}
          selectedBlockId={selectedBlockId}
          onSelectBlock={setSelectedBlockId}
          onUpdateBlock={updateBlock}
          onMoveBlock={moveBlock}
          isPreviewMode={isPreviewMode}
        />
      </div>
    </div>
  )
}
