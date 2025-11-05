import { useRef, useState } from "react"
import type { EditorBlock } from "./WebsiteEditor"

interface EditorCanvasProps {
  blocks: EditorBlock[]
  selectedBlockId: string | null
  onSelectBlock: (id: string) => void
  onUpdateBlock: (id: string, updates: Partial<EditorBlock>) => void
  onMoveBlock: (id: string, x: number, y: number) => void
  isPreviewMode?: boolean
}

export function EditorCanvas({
  blocks,
  selectedBlockId,
  onSelectBlock,
  onUpdateBlock,
  onMoveBlock,
  isPreviewMode = false,
}: EditorCanvasProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const canvasRef = useRef<HTMLDivElement>(null)

  const handleMouseDown = (e: React.MouseEvent, block: EditorBlock) => {
    if (isPreviewMode) return
    e.stopPropagation()

    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top

      setDragOffset({
        x: mouseX - block.x,
        y: mouseY - block.y,
      })
    }

    setDraggingId(block.id)
    onSelectBlock(block.id)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggingId && canvasRef.current && !isPreviewMode) {
      const rect = canvasRef.current.getBoundingClientRect()

      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top

      const x = mouseX - dragOffset.x
      const y = mouseY - dragOffset.y

      // 캔버스 경계 내에서만 이동
      const boundedX = Math.max(0, Math.min(x, rect.width - 100))
      const boundedY = Math.max(0, Math.min(y, rect.height - 50))

      onMoveBlock(draggingId, boundedX, boundedY)
    }
  }

  const handleMouseUp = () => {
    setDraggingId(null)
  }

  const renderBlock = (block: EditorBlock) => {
    const isSelected = block.id === selectedBlockId

    const commonStyles = {
      ...block.styles,
      fontSize: block.styles.fontSize ? `${block.styles.fontSize}px` : undefined,
      cursor: isPreviewMode ? "default" : draggingId === block.id ? "grabbing" : "grab",
      transition: draggingId === block.id ? "none" : "all 0.2s",
      userSelect: "none" as const,
    }

    switch (block.type) {
      case "heading":
        return (
          <h1 style={commonStyles} className="outline-none whitespace-nowrap">
            {block.content}
          </h1>
        )
      case "text":
        return (
          <p style={commonStyles} className="outline-none whitespace-nowrap">
            {block.content}
          </p>
        )
      case "button":
        return (
          <button style={commonStyles} className="rounded-lg outline-none px-6 py-3">
            {block.content}
          </button>
        )
      case "image":
        return (
          <img
            src={block.content || "/placeholder.svg"}
            alt="Content"
            style={{ ...commonStyles, maxWidth: "400px" }}
            className="outline-none"
          />
        )
      default:
        return <div style={commonStyles}>{block.content}</div>
    }
  }

  return (
    <div className="flex-1 overflow-hidden bg-muted/20 p-8">
      <div
        ref={canvasRef}
        className="w-full h-full bg-background rounded-lg shadow-lg relative overflow-hidden"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={() => !isPreviewMode && onSelectBlock("")}
      >
        {blocks.map((block) => (
          <div
            key={block.id}
            onMouseDown={(e) => handleMouseDown(e, block)}
            onClick={(e) => {
              if (!isPreviewMode) {
                e.stopPropagation()
                onSelectBlock(block.id)
              }
            }}
            style={{
              position: "absolute",
              left: `${block.x}px`,
              top: `${block.y}px`,
            }}
            className={`${
              !isPreviewMode && block.id === selectedBlockId
                ? "ring-2 ring-primary rounded-lg"
                : ""
            }`}
          >
            {renderBlock(block)}
          </div>
        ))}
      </div>
    </div>
  )
}
