// TextStyleEditor - 텍스트 스타일 편집 사이드바
import React from "react"
import { Label } from "@/components/ui/label"

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

interface TextStyleEditorProps {
  data: SlideData
  textStyles: TextStyles
  setTextStyles: React.Dispatch<React.SetStateAction<TextStyles>>
}

interface FontStyleEditorProps {
  shapeKey: string
  label: string
  textStyles: TextStyles
  setTextStyles: React.Dispatch<React.SetStateAction<TextStyles>>
}

function FontStyleEditor({ shapeKey, label, textStyles, setTextStyles }: FontStyleEditorProps) {
  const currentStyle = textStyles[shapeKey] || {}

  const updateStyle = (property: keyof TextStyle, value: string) => {
    setTextStyles(prev => ({
      ...prev,
      [shapeKey]: {
        ...prev[shapeKey],
        [property]: value
      }
    }))
  }

  return (
    <div className="border rounded-lg p-4 mb-4 bg-gray-50">
      <h3 className="font-semibold mb-3">{label}</h3>

      <div className="space-y-3">
        {/* Font Size */}
        <div>
          <Label className="block text-sm font-medium mb-1">
            폰트 크기 (Font Size)
          </Label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="8"
              max="96"
              value={parseInt(currentStyle.fontSize || "16")}
              onChange={(e) => updateStyle("fontSize", `${e.target.value}px`)}
              className="flex-1"
            />
            <input
              type="number"
              min="8"
              max="96"
              value={parseInt(currentStyle.fontSize || "16")}
              onChange={(e) => updateStyle("fontSize", `${e.target.value}px`)}
              className="w-16 px-2 py-1 border rounded"
            />
            <span className="text-sm text-gray-600">px</span>
          </div>
        </div>

        {/* Font Color */}
        <div>
          <Label className="block text-sm font-medium mb-1">
            폰트 색상 (Font Color)
          </Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={currentStyle.color || "#000000"}
              onChange={(e) => updateStyle("color", e.target.value)}
              className="w-12 h-10 border rounded cursor-pointer"
            />
            <input
              type="text"
              value={currentStyle.color || "#000000"}
              onChange={(e) => updateStyle("color", e.target.value)}
              className="flex-1 px-3 py-2 border rounded"
              placeholder="#000000"
            />
          </div>
        </div>

        {/* Font Family */}
        <div>
          <Label className="block text-sm font-medium mb-1">
            폰트 종류 (Font Family)
          </Label>
          <select
            value={currentStyle.fontFamily || "sans-serif"}
            onChange={(e) => updateStyle("fontFamily", e.target.value)}
            className="w-full px-3 py-2 border rounded"
          >
            <option value="sans-serif">Sans Serif</option>
            <option value="serif">Serif</option>
            <option value="monospace">Monospace</option>
            <option value="Arial, sans-serif">Arial</option>
            <option value="'Times New Roman', serif">Times New Roman</option>
            <option value="Georgia, serif">Georgia</option>
            <option value="'Courier New', monospace">Courier New</option>
            <option value="Verdana, sans-serif">Verdana</option>
            <option value="Tahoma, sans-serif">Tahoma</option>
          </select>
        </div>

        {/* Font Weight */}
        <div>
          <Label className="block text-sm font-medium mb-1">
            폰트 굵기 (Font Weight)
          </Label>
          <select
            value={currentStyle.fontWeight || "normal"}
            onChange={(e) => updateStyle("fontWeight", e.target.value)}
            className="w-full px-3 py-2 border rounded"
          >
            <option value="100">Thin (100)</option>
            <option value="200">Extra Light (200)</option>
            <option value="300">Light (300)</option>
            <option value="normal">Normal (400)</option>
            <option value="500">Medium (500)</option>
            <option value="semibold">Semibold (600)</option>
            <option value="bold">Bold (700)</option>
            <option value="800">Extra Bold (800)</option>
            <option value="900">Black (900)</option>
          </select>
        </div>
      </div>
    </div>
  )
}

export function TextStyleEditor({ data, textStyles, setTextStyles }: TextStyleEditorProps) {
  // Get all shape keys from data
  const shapeKeys = Object.keys(data)

  // Generate labels for each shape
  const getShapeLabel = (shapeKey: string, index: number) => {
    if (index === 0) return "제목 (Title)"
    if (index === 1) return "부제목 (Subtitle)"
    if (index === 2) return "버튼 텍스트 (Button)"
    return `텍스트 ${index + 1}`
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold">텍스트 스타일 편집</h2>
        <p className="text-sm text-muted-foreground mt-1">
          슬라이드의 텍스트 스타일을 수정할 수 있습니다
        </p>
      </div>

      {shapeKeys.map((shapeKey, index) => (
        <FontStyleEditor
          key={shapeKey}
          shapeKey={shapeKey}
          label={getShapeLabel(shapeKey, index)}
          textStyles={textStyles}
          setTextStyles={setTextStyles}
        />
      ))}

      {/* Current Styles JSON (for debugging) */}
      <details className="mt-6">
        <summary className="cursor-pointer font-semibold text-sm text-gray-600">
          현재 스타일 데이터 (JSON)
        </summary>
        <pre className="mt-2 p-4 bg-gray-900 text-green-400 rounded text-xs overflow-x-auto">
          {JSON.stringify(textStyles, null, 2)}
        </pre>
      </details>
    </div>
  )
}
