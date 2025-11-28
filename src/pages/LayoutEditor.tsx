// LayoutEditor - 레이아웃 수정 페이지
import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  Save,
  Undo,
  Redo,
  Eye,
  ChevronLeft,
  ChevronRight,
  Layers,
  Trash2,
  Loader2
} from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { fetchConversionDetail, type ConversionDetail } from '@/services/conversions'

interface ElementStyleData {
  className?: string
  style?: Record<string, string | number>
}

interface Page {
  id: number
  name: string
  reactCode: string
  jsonData: string
  componentId?: number
  slideId?: number
  elementStyles?: Record<string, ElementStyleData>
}

interface HistoryState {
  elementStyles: Record<string, ElementStyleData>
  timestamp: number
}

export default function LayoutEditor() {
  const { id } = useParams()
  const navigate = useNavigate()

  // 페이지 관리
  const [pages, setPages] = useState<Page[]>([])
  const [currentPageId, setCurrentPageId] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // 현재 편집 중인 데이터
  const [reactCode, setReactCode] = useState('')
  const [jsonData, setJsonData] = useState('{}')
  const [elementStyles, setElementStyles] = useState<Record<string, ElementStyleData>>({})
  const [selectedShape, setSelectedShape] = useState<string | null>(null)

  // 새 스타일 속성 추가용
  const [newStyleKey, setNewStyleKey] = useState('')
  const [newStyleValue, setNewStyleValue] = useState('')

  // 히스토리
  const [history, setHistory] = useState<HistoryState[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const isUndoRedoAction = useRef(false)

  // iframe
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [editMode, setEditMode] = useState(true)

  // Conversion 데이터
  const [conversionData, setConversionData] = useState<ConversionDetail | null>(null)

  // 왼쪽 패널 토글
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true)

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'

  // JWT 토큰을 포함한 헤더 생성
  const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`
    }
    return headers
  }

  // Conversion 데이터 로드
  useEffect(() => {
    const loadConversionData = async () => {
      if (!id) {
        toast.error('잘못된 접근입니다')
        navigate('/history')
        return
      }

      try {
        setLoading(true)
        const { data: { session } } = await supabase.auth.getSession()
        const data = await fetchConversionDetail(id, session?.access_token)

        setConversionData(data)

        // 컴포넌트 맵 생성
        const componentMap = new Map<string, { code: string; id: number; styles: string | null }>()
        if (data.components && data.components.length > 0) {
          data.components.forEach((comp: any) => {
            const fullCode = comp.imports && Array.isArray(comp.imports) && comp.imports.length > 0
              ? `${comp.imports.join('\n')}\n\n${comp.code}`
              : comp.code
            componentMap.set(comp.component_name, {
              code: fullCode,
              id: comp.id,
              styles: comp.styles || null
            })
          })
        }

        // 슬라이드 데이터로 pages 배열 생성
        if (data.slides && data.slides.length > 0) {
          const newPages: Page[] = data.slides.map((slide: any, index: number) => {
            const layoutComponent = slide.layout_component
            const matched = componentMap.get(layoutComponent)
            const slideData = slide.data || {}

            let slideElementStyles: Record<string, ElementStyleData> = {}
            if (matched?.styles) {
              try {
                const parsedStyles = typeof matched.styles === 'string'
                  ? JSON.parse(matched.styles)
                  : matched.styles

                // position: fixed를 absolute로 변환
                const modifiedStyles = { ...parsedStyles }
                Object.keys(modifiedStyles).forEach(key => {
                  if (modifiedStyles[key]?.className) {
                    modifiedStyles[key].className = modifiedStyles[key].className
                      .replace(/\bfixed\b/g, 'absolute')
                  }
                })
                slideElementStyles = modifiedStyles
              } catch (e) {
                console.error('스타일 파싱 오류:', e)
              }
            }

            return {
              id: index + 1,
              name: slide.slide_title || `슬라이드 ${slide.slide_number}`,
              reactCode: matched?.code || '',
              jsonData: JSON.stringify(slideData, null, 2),
              componentId: matched?.id,
              slideId: slide.id,
              elementStyles: slideElementStyles
            }
          })

          setPages(newPages)
          if (newPages.length > 0) {
            setCurrentPageId(1)
            setReactCode(newPages[0].reactCode)
            setJsonData(newPages[0].jsonData)
            setElementStyles(newPages[0].elementStyles || {})
          }
        }
      } catch (error) {
        console.error('데이터 로드 실패:', error)
        toast.error('데이터를 불러오는데 실패했습니다')
      } finally {
        setLoading(false)
      }
    }

    loadConversionData()
  }, [id, navigate])

  // 페이지 변경 시 데이터 업데이트
  useEffect(() => {
    if (currentPageId > 0) {
      const currentPage = pages.find(p => p.id === currentPageId)
      if (currentPage) {
        setReactCode(currentPage.reactCode)
        setJsonData(currentPage.jsonData)
        setElementStyles(currentPage.elementStyles || {})
        setSelectedShape(null)
      }
    }
  }, [currentPageId, pages])

  // JSON 파싱
  const parsedData = React.useMemo(() => {
    try {
      return JSON.parse(jsonData)
    } catch {
      return {}
    }
  }, [jsonData])

  // iframe 렌더링
  useEffect(() => {
    if (!iframeRef.current || !reactCode) return

    const iframeDoc = iframeRef.current.contentDocument
    if (!iframeDoc) return

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: system-ui, -apple-system, sans-serif; }
            .edit-mode [data-key] {
              cursor: pointer;
              transition: outline 0.15s ease;
            }
            .edit-mode [data-key]:hover {
              outline: 2px dashed #3b82f6;
              outline-offset: 2px;
            }
            .edit-mode [data-key].selected {
              outline: 2px solid #3b82f6 !important;
              outline-offset: 2px;
            }
          </style>
        </head>
        <body class="${editMode ? 'edit-mode' : ''}">
          <div id="root"></div>
          <div id="error-display" style="display:none; position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(255,0,0,0.9); color:white; padding:20px; overflow:auto; white-space:pre-wrap; font-family:monospace;"></div>
          <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
          <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
          <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
          <script type="text/babel">
            const data = ${JSON.stringify(parsedData)};
            const elementStyles = ${JSON.stringify(elementStyles)};

            const applyElementStyles = (props, shapeName) => {
              const styleData = elementStyles[shapeName];
              if (!styleData) return props;

              let newClassName = props.className || '';
              if (styleData.className) {
                newClassName = styleData.className;
              }

              let newStyle = { ...(props.style || {}) };
              if (styleData.style) {
                newStyle = { ...newStyle, ...styleData.style };
              }

              return {
                ...props,
                className: newClassName,
                style: newStyle,
                'data-key': shapeName
              };
            };

            try {
              const codeToExecute = \`${reactCode.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`;

              const transformedCode = Babel.transform(codeToExecute, {
                presets: ['react'],
                filename: 'component.jsx'
              }).code;

              const ComponentModule = {};
              const componentFunc = new Function('React', 'data', 'elementStyles', 'applyElementStyles', 'exports', transformedCode + '; return typeof Component !== "undefined" ? Component : null;');
              const Component = componentFunc(React, data, elementStyles, applyElementStyles, ComponentModule);

              if (Component) {
                const root = ReactDOM.createRoot(document.getElementById('root'));
                root.render(React.createElement(Component, { data, elementStyles, applyElementStyles }));

                // 클릭 핸들러 추가
                const addClickHandlers = () => {
                  const elementsWithDataKey = document.querySelectorAll('[data-key]');
                  elementsWithDataKey.forEach((element) => {
                    const dataKey = element.getAttribute('data-key');
                    if (dataKey && elementStyles[dataKey]) {
                      element.addEventListener('click', (e) => {
                        e.stopPropagation();
                        document.querySelectorAll('.selected').forEach(el => {
                          el.classList.remove('selected');
                        });
                        element.classList.add('selected');
                        window.parent.postMessage({
                          type: 'shapeSelected',
                          shapeName: dataKey
                        }, '*');
                      });
                    }
                  });
                };
                setTimeout(addClickHandlers, 500);
              }
            } catch (error) {
              console.error('Rendering error:', error);
              const errorDiv = document.getElementById('error-display');
              errorDiv.style.display = 'block';
              errorDiv.textContent = 'Rendering Error:\\n\\n' + error.message;
            }
          </script>
        </body>
      </html>
    `

    iframeDoc.open()
    iframeDoc.write(html)
    iframeDoc.close()
  }, [reactCode, parsedData, editMode])

  // iframe 메시지 수신
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'shapeSelected') {
        setSelectedShape(event.data.shapeName)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  // 히스토리에 추가
  const addToHistory = (newStyles: Record<string, ElementStyleData>) => {
    if (isUndoRedoAction.current) {
      isUndoRedoAction.current = false
      return
    }

    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push({
      elementStyles: JSON.parse(JSON.stringify(newStyles)),
      timestamp: Date.now()
    })

    if (newHistory.length > 50) {
      newHistory.shift()
    }

    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }

  // 되돌리기
  const handleUndo = () => {
    if (historyIndex > 0) {
      isUndoRedoAction.current = true
      const prevState = history[historyIndex - 1]
      setElementStyles(JSON.parse(JSON.stringify(prevState.elementStyles)))
      setHistoryIndex(historyIndex - 1)
    }
  }

  // 다시 실행
  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      isUndoRedoAction.current = true
      const nextState = history[historyIndex + 1]
      setElementStyles(JSON.parse(JSON.stringify(nextState.elementStyles)))
      setHistoryIndex(historyIndex + 1)
    }
  }

  // 스타일 업데이트
  const updateShapeStyle = (shapeName: string, styleKey: string, value: string | number) => {
    const newStyles = {
      ...elementStyles,
      [shapeName]: {
        ...elementStyles[shapeName],
        style: {
          ...(elementStyles[shapeName]?.style || {}),
          [styleKey]: value
        }
      }
    }
    setElementStyles(newStyles)
    addToHistory(newStyles)

    // iframe DOM 직접 업데이트
    if (iframeRef.current) {
      const iframeDoc = iframeRef.current.contentDocument
      if (iframeDoc) {
        const elements = iframeDoc.querySelectorAll(`[data-key="${shapeName}"]`)
        elements.forEach((element: Element) => {
          (element as HTMLElement).style[styleKey as any] = String(value)
        })
      }
    }
  }

  // 스타일 속성 삭제
  const deleteShapeStyleProperty = (shapeName: string, styleKey: string) => {
    const newStyles = { ...elementStyles }
    if (newStyles[shapeName]?.style) {
      const updatedStyle = { ...newStyles[shapeName].style }
      delete updatedStyle[styleKey]
      newStyles[shapeName] = {
        ...newStyles[shapeName],
        style: updatedStyle
      }
    }
    setElementStyles(newStyles)
    addToHistory(newStyles)

    if (iframeRef.current) {
      const iframeDoc = iframeRef.current.contentDocument
      if (iframeDoc) {
        const elements = iframeDoc.querySelectorAll(`[data-key="${shapeName}"]`)
        elements.forEach((element: Element) => {
          (element as HTMLElement).style[styleKey as any] = ''
        })
      }
    }
  }

  // 새 스타일 속성 추가
  const addNewStyleProperty = () => {
    if (!selectedShape || !newStyleKey.trim()) return

    updateShapeStyle(selectedShape, newStyleKey.trim(), newStyleValue.trim())
    setNewStyleKey('')
    setNewStyleValue('')
  }

  // 저장
  const handleSave = async () => {
    if (!id) return

    try {
      setSaving(true)

      const headers = await getAuthHeaders()
      const currentPage = pages.find(p => p.id === currentPageId)

      if (!currentPage?.slideId) {
        toast.error('슬라이드 정보를 찾을 수 없습니다')
        return
      }

      // absolute를 fixed로 변환 (저장용)
      const storedStyles: Record<string, ElementStyleData> = {}
      Object.keys(elementStyles).forEach(key => {
        storedStyles[key] = { ...elementStyles[key] }
        if (storedStyles[key]?.className) {
          storedStyles[key].className = storedStyles[key].className!
            .replace(/\babsolute\b/g, 'fixed')
        }
      })

      const response = await fetch(
        `${API_BASE_URL}/conversions/${id}/slides/${currentPage.slideId}/styles`,
        {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            styles: storedStyles,
            component_id: currentPage.componentId
          }),
        }
      )

      if (!response.ok) {
        throw new Error(`서버 오류: ${response.status}`)
      }

      toast.success('저장되었습니다!')
    } catch (error: any) {
      console.error('저장 실패:', error)
      toast.error(error.message || '저장 중 오류가 발생했습니다')
    } finally {
      setSaving(false)
    }
  }

  const selectedShapeData = selectedShape ? elementStyles[selectedShape] : null

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">데이터를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* 상단 툴바 */}
      <div className="border-b border-border bg-card px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/conversions/detail/${id}`)}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              뒤로가기
            </Button>

            <Separator orientation="vertical" className="h-6" />

            {/* 되돌리기/다시실행 */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleUndo}
                disabled={historyIndex <= 0}
                title="되돌리기"
                className="h-8 px-2"
              >
                <Undo className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRedo}
                disabled={historyIndex >= history.length - 1}
                title="다시실행"
                className="h-8 px-2"
              >
                <Redo className="w-4 h-4" />
              </Button>
            </div>

            <Separator orientation="vertical" className="h-6" />

            {/* 편집/보기 모드 토글 */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg">
              <span className={`text-sm font-medium ${editMode ? 'text-foreground' : 'text-muted-foreground'}`}>
                {editMode ? '편집 모드' : '보기 모드'}
              </span>
              <button
                onClick={() => setEditMode(!editMode)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  editMode ? 'bg-green-500' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    editMode ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <Separator orientation="vertical" className="h-6" />

            <div className="text-sm font-medium">
              {conversionData?.content_name || '제목 없음'}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving}
              className="bg-green-500 hover:bg-green-600 text-white"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              저장
            </Button>
          </div>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 왼쪽 패널 - 페이지 목록 */}
        <div className={`${isLeftPanelOpen ? 'w-64' : 'w-0'} border-r border-border bg-card transition-all duration-300 overflow-hidden`}>
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Layers className="w-4 h-4" />
                슬라이드
              </h3>
            </div>
            <ScrollArea className="h-[calc(100vh-200px)]">
              <div className="space-y-2">
                {pages.map((page) => (
                  <div
                    key={page.id}
                    onClick={() => setCurrentPageId(page.id)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      currentPageId === page.id
                        ? 'bg-primary/10 border border-primary'
                        : 'bg-muted hover:bg-muted/80'
                    }`}
                  >
                    <p className="text-sm font-medium truncate">{page.name}</p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* 왼쪽 패널 토글 */}
        <button
          onClick={() => setIsLeftPanelOpen(!isLeftPanelOpen)}
          className="w-6 bg-muted hover:bg-muted/80 flex items-center justify-center"
        >
          {isLeftPanelOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>

        {/* 중앙 - 미리보기 */}
        <div className="flex-1 bg-gray-100 overflow-hidden flex items-center justify-center p-4">
          <div className="bg-white shadow-lg rounded-lg overflow-hidden" style={{ width: '960px', height: '540px' }}>
            <iframe
              ref={iframeRef}
              className="w-full h-full border-0"
              title="Preview"
            />
          </div>
        </div>

        {/* 오른쪽 패널 - 스타일 편집 */}
        <div className="w-80 border-l border-border bg-card overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold">스타일 편집</h3>
            {selectedShape && (
              <Badge variant="secondary" className="mt-2">
                {selectedShape}
              </Badge>
            )}
          </div>

          <ScrollArea className="h-[calc(100vh-200px)]">
            <div className="p-4 space-y-4">
              {selectedShape && selectedShapeData ? (
                <>
                  {/* className 편집 */}
                  <div>
                    <Label className="text-xs text-muted-foreground">className</Label>
                    <Input
                      value={selectedShapeData.className || ''}
                      onChange={(e) => {
                        const newStyles = {
                          ...elementStyles,
                          [selectedShape]: {
                            ...elementStyles[selectedShape],
                            className: e.target.value
                          }
                        }
                        setElementStyles(newStyles)
                        addToHistory(newStyles)
                      }}
                      className="mt-1 text-sm"
                    />
                  </div>

                  <Separator />

                  {/* 인라인 스타일 편집 */}
                  <div>
                    <Label className="text-xs text-muted-foreground mb-2 block">인라인 스타일</Label>
                    <div className="space-y-2">
                      {selectedShapeData.style && Object.entries(selectedShapeData.style).map(([key, value]) => (
                        <div key={key} className="flex items-center gap-2">
                          <Label className="text-xs w-24 truncate">{key}</Label>
                          <Input
                            value={String(value)}
                            onChange={(e) => updateShapeStyle(selectedShape, key, e.target.value)}
                            className="flex-1 h-8 text-sm"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteShapeStyleProperty(selectedShape, key)}
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* 새 스타일 추가 */}
                  <div>
                    <Label className="text-xs text-muted-foreground mb-2 block">새 스타일 추가</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="속성명"
                        value={newStyleKey}
                        onChange={(e) => setNewStyleKey(e.target.value)}
                        className="flex-1 h-8 text-sm"
                      />
                      <Input
                        placeholder="값"
                        value={newStyleValue}
                        onChange={(e) => setNewStyleValue(e.target.value)}
                        className="flex-1 h-8 text-sm"
                      />
                    </div>
                    <Button
                      onClick={addNewStyleProperty}
                      disabled={!newStyleKey.trim()}
                      size="sm"
                      className="w-full mt-2"
                    >
                      추가
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <p className="text-sm">요소를 선택하세요</p>
                  <p className="text-xs mt-1">미리보기에서 요소를 클릭하면<br />스타일을 편집할 수 있습니다</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  )
}
