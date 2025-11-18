// SlidePreview - 슬라이드 미리보기 컴포넌트
import { useState } from "react"

interface TextStyle {
  fontSize?: string
  fontFamily?: string
  fontWeight?: string
  color?: string
}

interface TextStyles {
  [shapeKey: string]: TextStyle
}

interface SlideData {
  [shapeKey: string]: any
}

interface SlidePreviewProps {
  data: SlideData
  textStyles?: TextStyles
  selectedShape?: string
  onShapeSelect?: (shapeKey: string) => void
  onTextChange?: (shapeKey: string, newText: string) => void
}

export function SlidePreview({
  data,
  textStyles,
  selectedShape,
  onShapeSelect,
  onTextChange
}: SlidePreviewProps) {
  const [editingShape, setEditingShape] = useState<string | null>(null)
  const [editText, setEditText] = useState<string>("")

  const handleShapeClick = (shapeKey: string) => {
    onShapeSelect?.(shapeKey)
  }

  const handleDoubleClick = (shapeKey: string, currentText: string) => {
    setEditingShape(shapeKey)
    setEditText(currentText)
  }

  const handleTextBlur = () => {
    if (editingShape && onTextChange) {
      onTextChange(editingShape, editText)
    }
    setEditingShape(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleTextBlur()
    } else if (e.key === 'Escape') {
      setEditingShape(null)
    }
  }

  const renderEditableElement = (shapeKey: string, defaultStyle: TextStyle, Component: 'h1' | 'p' | 'span', className: string) => {
    const isSelected = selectedShape === shapeKey
    const isEditing = editingShape === shapeKey
    const text = data[shapeKey]

    const style = {
      fontSize: textStyles?.[shapeKey]?.fontSize || defaultStyle.fontSize,
      fontFamily: textStyles?.[shapeKey]?.fontFamily || defaultStyle.fontFamily,
      fontWeight: textStyles?.[shapeKey]?.fontWeight || defaultStyle.fontWeight,
      color: textStyles?.[shapeKey]?.color || defaultStyle.color
    }

    const combinedClassName = `${className} ${isSelected ? 'ring-2 ring-orange-400 ring-offset-2' : ''} cursor-pointer hover:ring-2 hover:ring-orange-300 transition-all`

    if (isEditing) {
      return (
        <div className={combinedClassName} style={style}>
          <textarea
            autoFocus
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onBlur={handleTextBlur}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent border-none outline-none resize-none"
            style={{
              fontSize: style.fontSize,
              fontFamily: style.fontFamily,
              fontWeight: style.fontWeight,
              color: style.color,
              minHeight: '1.5em'
            }}
          />
        </div>
      )
    }

    const ElementComponent = Component
    return (
      <ElementComponent
        className={combinedClassName}
        style={style}
        onClick={() => handleShapeClick(shapeKey)}
        onDoubleClick={() => handleDoubleClick(shapeKey, text)}
      >
        {text}
      </ElementComponent>
    )
  }

  // 요소별 기본 스타일 및 위치 계산
  const getElementLayout = (index: number, total: number) => {
    const layouts = [
      { top: '50px', left: '100px', Component: 'h1' as const, defaultStyle: { fontSize: "48px", fontWeight: "bold", color: "#2563eb" } },
      { top: '150px', left: '100px', Component: 'p' as const, defaultStyle: { fontSize: "24px", fontWeight: "normal", color: "#374151" } },
      { top: '220px', left: '100px', Component: 'p' as const, defaultStyle: { fontSize: "18px", fontWeight: "normal", color: "#6b7280" } },
      { top: '290px', left: '100px', Component: 'p' as const, defaultStyle: { fontSize: "18px", fontWeight: "normal", color: "#6b7280" } },
      { top: '360px', left: '100px', Component: 'p' as const, defaultStyle: { fontSize: "18px", fontWeight: "normal", color: "#6b7280" } },
      { top: '430px', left: '100px', Component: 'p' as const, defaultStyle: { fontSize: "16px", fontWeight: "semibold", color: "#ffffff" } },
    ]

    return layouts[index] || {
      top: `${50 + index * 70}px`,
      left: '100px',
      Component: 'p' as const,
      defaultStyle: { fontSize: "18px", fontWeight: "normal", color: "#6b7280" }
    }
  }

  const shapeKeys = Object.keys(data).sort()
  const totalShapes = shapeKeys.length

  return (
    <div className="relative w-[1280px] h-[720px] bg-white shadow-2xl rounded-lg overflow-hidden">
      {shapeKeys.map((shapeKey, index) => {
        const layout = getElementLayout(index, totalShapes)
        const isLastElement = index === totalShapes - 1

        return (
          <div
            key={shapeKey}
            className="absolute max-w-[1000px]"
            style={{
              top: layout.top,
              left: layout.left
            }}
          >
            {isLastElement ? (
              // 마지막 요소는 버튼 스타일로 렌더링
              <div
                className={`px-[24px] py-[12px] bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors inline-block ${
                  selectedShape === shapeKey ? 'ring-2 ring-orange-400 ring-offset-2' : ''
                } cursor-pointer`}
                onClick={() => handleShapeClick(shapeKey)}
                onDoubleClick={() => handleDoubleClick(shapeKey, data[shapeKey])}
              >
                {editingShape === shapeKey ? (
                  <input
                    autoFocus
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onBlur={handleTextBlur}
                    onKeyDown={handleKeyDown}
                    className="bg-transparent border-none outline-none text-white min-w-[100px]"
                    style={{
                      fontSize: textStyles?.[shapeKey]?.fontSize || layout.defaultStyle.fontSize,
                      fontFamily: textStyles?.[shapeKey]?.fontFamily || "sans-serif",
                      fontWeight: textStyles?.[shapeKey]?.fontWeight || layout.defaultStyle.fontWeight,
                    }}
                  />
                ) : (
                  <span
                    style={{
                      fontSize: textStyles?.[shapeKey]?.fontSize || layout.defaultStyle.fontSize,
                      fontFamily: textStyles?.[shapeKey]?.fontFamily || "sans-serif",
                      fontWeight: textStyles?.[shapeKey]?.fontWeight || layout.defaultStyle.fontWeight,
                      color: textStyles?.[shapeKey]?.color || layout.defaultStyle.color
                    }}
                  >
                    {data[shapeKey]}
                  </span>
                )}
              </div>
            ) : (
              // 일반 텍스트 요소
              renderEditableElement(
                shapeKey,
                {
                  fontSize: layout.defaultStyle.fontSize,
                  fontFamily: "sans-serif",
                  fontWeight: layout.defaultStyle.fontWeight,
                  color: layout.defaultStyle.color
                },
                layout.Component,
                ''
              )
            )}
          </div>
        )
      })}
    </div>
  )
}
