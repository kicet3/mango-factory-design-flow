// MaterialEditor - React 컴포넌트 렌더링 및 편집 에디터
import { useState, useEffect, useRef } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Layout } from "@/components/layout/Layout"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Save, RotateCcw } from "lucide-react"
import { toast } from "sonner"
import { fetchMaterialDetail, updateMaterial } from "@/services/conversions"
import { supabase } from "@/integrations/supabase/client"

interface EditableElement {
  id: string
  tagName: string
  textContent: string
  styles: {
    position: string
    left: string
    top: string
    width: string
    height: string
    backgroundColor: string
    color: string
    fontSize: string
    fontWeight: string
    textAlign: string
  }
}

export default function MaterialEditor() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Component code and data
  const [reactCode, setReactCode] = useState('')
  const [jsonData, setJsonData] = useState('{}')
  const [originalJsonData, setOriginalJsonData] = useState('{}')

  // Material info
  const [materialName, setMaterialName] = useState('')
  const [componentId, setComponentId] = useState<number | null>(null)

  // Iframe reference
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Selected element
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null)
  const [renderedElements, setRenderedElements] = useState<Map<string, EditableElement>>(new Map())

  // Editing styles
  const [editingStyles, setEditingStyles] = useState<{
    textContent: string
    fontSize: string
    fontWeight: string
    color: string
    backgroundColor: string
  } | null>(null)

  useEffect(() => {
    loadMaterialData()
  }, [id])

  const loadMaterialData = async () => {
    if (!id) return

    try {
      setLoading(true)

      // Get auth token
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token

      // Fetch material detail from API
      const materialDetail = await fetchMaterialDetail(parseInt(id), accessToken)

      console.log("Material Detail:", materialDetail)

      setMaterialName(materialDetail.material_name || '')

      // Get component code from conversion.components
      let componentCode = ''
      let componentImports = null
      let layoutComponentName = ''

      // First, get the layout_component name from slides
      if (materialDetail.generated_slides && materialDetail.generated_slides.length > 0) {
        layoutComponentName = materialDetail.generated_slides[0].layout_component
      } else if (materialDetail.slides && materialDetail.slides.length > 0) {
        layoutComponentName = materialDetail.slides[0].layout_component
      }

      console.log('Layout component name:', layoutComponentName)

      // Find the component in conversion.components
      if (materialDetail.conversion && materialDetail.conversion.components) {
        const component = materialDetail.conversion.components.find(
          (c) => c.component_name === layoutComponentName
        )

        if (component) {
          componentCode = component.code
          componentImports = component.imports
          setComponentId(component.id)
          console.log('Found component:', component.component_name)
        }
      }

      // Combine imports and code
      if (componentCode) {
        const fullCode = componentImports && Array.isArray(componentImports) && componentImports.length > 0
          ? `${componentImports.join('\n')}\n\n${componentCode}`
          : componentCode

        setReactCode(fullCode)
      }

      // Get slide data (first slide) - data is an array
      if (materialDetail.generated_slides && materialDetail.generated_slides.length > 0) {
        const firstSlide = materialDetail.generated_slides[0]
        const slideData = firstSlide.data || [] // data is an array of objects

        console.log('First slide data:', slideData)

        // The component expects data as an object with data array
        // But we need to pass the first item from the data array
        const jsonData = Array.isArray(slideData) && slideData.length > 0
          ? slideData[0]  // Pass first data item
          : slideData

        const jsonString = JSON.stringify(jsonData, null, 2)
        setJsonData(jsonString)
        setOriginalJsonData(jsonString)
      } else if (materialDetail.slides && materialDetail.slides.length > 0) {
        const firstSlide = materialDetail.slides[0]
        const slideData = firstSlide.data || []

        console.log('First slide data (slides):', slideData)

        const jsonData = Array.isArray(slideData) && slideData.length > 0
          ? slideData[0]
          : slideData

        const jsonString = JSON.stringify(jsonData, null, 2)
        setJsonData(jsonString)
        setOriginalJsonData(jsonString)
      }

    } catch (error) {
      console.error("Failed to load material:", error)
      toast.error("자료를 불러오는데 실패했습니다")
    } finally {
      setLoading(false)
    }
  }

  // Render component in iframe
  useEffect(() => {
    if (!reactCode || !jsonData) return

    renderComponentInIframe()
  }, [reactCode, jsonData])

  const renderComponentInIframe = () => {
    if (!iframeRef.current) return

    try {
      const parsedData = JSON.parse(jsonData)

      // Extract component name from code
      const componentMatch = reactCode.match(/(?:export\s+default\s+function|function)\s+(\w+)/)
      const componentName = componentMatch ? componentMatch[1] : 'Component'

      // Process code to remove export statements
      const processedCode = reactCode
        .replace(/export\s+default\s+/g, '')
        .replace(/export\s+/g, '')

      const iframeDoc = iframeRef.current.contentDocument
      if (!iframeDoc) return

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <script src="https://cdn.tailwindcss.com"></script>
          <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
          <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
          <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              width: 1280px;
              height: 720px;
              overflow: hidden;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            .editable-element {
              cursor: pointer;
              transition: outline 0.2s;
            }
            .editable-element:hover {
              outline: 2px dashed #FFA500;
              outline-offset: 2px;
            }
            .editable-element.selected {
              outline: 3px solid #FF6B35 !important;
              outline-offset: 2px;
              z-index: 1000;
              position: relative;
            }
          </style>
        </head>
        <body>
          <div id="root"></div>
          <div id="error-display" style="display: none; padding: 20px; background: #ffeeee; color: #cc0000; font-family: monospace; white-space: pre-wrap; border: 2px solid #cc0000; margin: 20px;"></div>

          <script>
            window.onerror = function(msg, url, lineNo, columnNo, error) {
              const errorDiv = document.getElementById('error-display');
              errorDiv.style.display = 'block';
              errorDiv.textContent = 'Error: ' + msg + '\\nLine: ' + lineNo + '\\n\\n' + (error ? error.stack : '');
              console.error('Global error:', msg, error);
              return false;
            };
          </script>

          <script type="text/babel">
            const { useState, useEffect } = React;

            (function() {
              try {
                console.log('Starting render...');
                const propsData = ${JSON.stringify(parsedData)};
                console.log('Props data loaded:', propsData);

                ${processedCode}

                console.log('Component loaded:', typeof ${componentName});

                // Render component
                const rootElement = document.getElementById('root');
                console.log('Root element:', rootElement);

                const root = ReactDOM.createRoot(rootElement);
                root.render(React.createElement(${componentName}, propsData));

                console.log('Render initiated with props:', propsData);

                // Add editable element IDs and click handlers
                setTimeout(() => {
                  console.log('Adding element IDs...');

                  const editableSelectors = 'div, img, p, span, button, h1, h2, h3, h4, h5, h6';
                  const allElements = document.querySelectorAll(editableSelectors);
                  let elementIndex = 0;

                  allElements.forEach((element) => {
                    if (element.id === 'root' || element.id === 'error-display') return;
                    if (element.hasAttribute('data-element-id')) return;

                    element.setAttribute('data-element-id', 'element-' + elementIndex);
                    element.classList.add('editable-element');
                    elementIndex++;

                    element.addEventListener('click', (e) => {
                      e.stopPropagation();

                      // Remove previous selection
                      document.querySelectorAll('.selected').forEach(el => {
                        el.classList.remove('selected');
                      });

                      element.classList.add('selected');

                      // Notify parent window
                      const elementId = element.getAttribute('data-element-id');
                      const computedStyle = window.getComputedStyle(element);

                      window.parent.postMessage({
                        type: 'elementSelected',
                        elementId: elementId,
                        tagName: element.tagName,
                        textContent: element.textContent,
                        styles: {
                          position: computedStyle.position,
                          left: computedStyle.left,
                          top: computedStyle.top,
                          width: computedStyle.width,
                          height: computedStyle.height,
                          backgroundColor: computedStyle.backgroundColor,
                          color: computedStyle.color,
                          fontSize: computedStyle.fontSize,
                          fontWeight: computedStyle.fontWeight,
                          textAlign: computedStyle.textAlign
                        }
                      }, '*');
                    });
                  });

                  console.log('Added IDs to', elementIndex, 'elements');

                  // Send element map to parent
                  const elementsMap = {};
                  allElements.forEach((element) => {
                    const elementId = element.getAttribute('data-element-id');
                    if (!elementId) return;

                    const computedStyle = window.getComputedStyle(element);
                    elementsMap[elementId] = {
                      id: elementId,
                      tagName: element.tagName,
                      textContent: element.textContent,
                      styles: {
                        position: computedStyle.position,
                        left: computedStyle.left,
                        top: computedStyle.top,
                        width: computedStyle.width,
                        height: computedStyle.height,
                        backgroundColor: computedStyle.backgroundColor,
                        color: computedStyle.color,
                        fontSize: computedStyle.fontSize,
                        fontWeight: computedStyle.fontWeight,
                        textAlign: computedStyle.textAlign
                      }
                    };
                  });

                  window.parent.postMessage({
                    type: 'elementsLoaded',
                    elements: elementsMap
                  }, '*');
                }, 500);

              } catch (error) {
                console.error('Render error:', error);
                document.getElementById('error-display').style.display = 'block';
                document.getElementById('error-display').textContent = error.toString() + '\\n\\n' + error.stack;
              }
            })();
          </script>
        </body>
        </html>
      `

      iframeDoc.open()
      iframeDoc.write(htmlContent)
      iframeDoc.close()

    } catch (error) {
      console.error("Failed to render component:", error)
      toast.error("컴포넌트 렌더링 실패")
    }
  }

  // Listen to messages from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'elementSelected') {
        setSelectedElementId(event.data.elementId)
        setEditingStyles({
          textContent: event.data.textContent,
          fontSize: event.data.styles.fontSize,
          fontWeight: event.data.styles.fontWeight,
          color: event.data.styles.color,
          backgroundColor: event.data.styles.backgroundColor
        })
      } else if (event.data.type === 'elementsLoaded') {
        const elementsMap = new Map(Object.entries(event.data.elements))
        setRenderedElements(elementsMap)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  const handleSave = async () => {
    if (!id) return

    try {
      setSaving(true)

      // Get auth token
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token

      // Parse and update slide data
      const slideData = JSON.parse(jsonData)

      // Update material
      await updateMaterial(
        parseInt(id),
        {
          slide_data: slideData,
          material_name: materialName
        },
        accessToken
      )

      toast.success("저장되었습니다!")
      setOriginalJsonData(jsonData)
    } catch (error) {
      console.error("Save failed:", error)
      toast.error("저장에 실패했습니다")
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setJsonData(originalJsonData)
    toast.info("초기 상태로 복원되었습니다")
  }

  const handleBack = () => {
    navigate("/gallery/materials")
  }

  const handleTextChange = (newText: string) => {
    if (!selectedElementId) return

    try {
      const parsedData = JSON.parse(jsonData)

      // Find which field corresponds to this element's text
      const element = renderedElements.get(selectedElementId)
      if (!element) return

      const originalText = element.textContent.trim()

      // Search for matching field in parsedData
      for (const [key, value] of Object.entries(parsedData)) {
        if (typeof value === 'string' && value.trim() === originalText) {
          parsedData[key] = newText
          break
        }
      }

      setJsonData(JSON.stringify(parsedData, null, 2))
      toast.success("텍스트가 변경되었습니다")
    } catch (error) {
      console.error("Failed to update text:", error)
      toast.error("텍스트 변경 실패")
    }
  }

  const applyStyleToIframe = (elementId: string, styles: any) => {
    if (!iframeRef.current) return

    const iframeDoc = iframeRef.current.contentDocument
    if (!iframeDoc) return

    const element = iframeDoc.querySelector(`[data-element-id="${elementId}"]`) as HTMLElement
    if (!element) return

    // Apply styles directly to the element
    if (styles.fontSize) element.style.fontSize = styles.fontSize
    if (styles.fontWeight) element.style.fontWeight = styles.fontWeight
    if (styles.color) element.style.color = styles.color
    if (styles.backgroundColor) element.style.backgroundColor = styles.backgroundColor
  }

  if (loading) {
    return (
      <Layout hideSidebar>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground">자료를 불러오는 중...</p>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout hideSidebar>
      <div className="flex h-screen w-full bg-gray-50">
        {/* Center Panel: Preview */}
        <div className="flex-1 flex flex-col">
          {/* Top Header Bar */}
          <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
            <Button variant="ghost" onClick={handleBack} className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              돌아가기
            </Button>
            <Button variant="outline" onClick={handleReset} className="gap-2">
              <RotateCcw className="w-4 h-4" />
              초기화
            </Button>
          </div>

          {/* Preview Area */}
          <div className="flex-1 flex items-center justify-center p-8 bg-gray-100">
            <div className="bg-white shadow-2xl rounded-lg overflow-hidden">
              <iframe
                ref={iframeRef}
                style={{
                  width: '1280px',
                  height: '720px',
                  border: 'none'
                }}
                title="Component Preview"
              />
            </div>
          </div>
        </div>

        {/* Right Sidebar: Style Editor */}
        <div className="w-[500px] bg-white border-l border-gray-200 overflow-y-auto">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold">스타일 편집</h2>
            {selectedElementId && (
              <p className="text-sm text-gray-500 mt-1">
                {renderedElements.get(selectedElementId)?.tagName} 요소
              </p>
            )}
          </div>

          {editingStyles && selectedElementId ? (
            <div className="p-6 space-y-6">
              {/* Text Content */}
              <div>
                <label className="block text-base font-semibold mb-3">텍스트 내용</label>
                <textarea
                  value={editingStyles.textContent}
                  onChange={(e) => {
                    setEditingStyles({ ...editingStyles, textContent: e.target.value })
                  }}
                  onBlur={(e) => handleTextChange(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-base"
                  rows={4}
                />
              </div>

              {/* Font Size */}
              <div>
                <label className="block text-base font-semibold mb-3">글자 크기</label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={editingStyles.fontSize}
                    onChange={(e) => {
                      const newStyles = { ...editingStyles, fontSize: e.target.value }
                      setEditingStyles(newStyles)
                      applyStyleToIframe(selectedElementId, newStyles)
                    }}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-base"
                    placeholder="예: 24px, 1.5rem"
                  />
                  <Button
                    onClick={() => {
                      const newStyles = { ...editingStyles, fontSize: '16px' }
                      setEditingStyles(newStyles)
                      applyStyleToIframe(selectedElementId, newStyles)
                    }}
                    variant="outline"
                    size="sm"
                  >
                    기본값
                  </Button>
                </div>
              </div>

              {/* Font Weight */}
              <div>
                <label className="block text-base font-semibold mb-3">글자 굵기</label>
                <select
                  value={editingStyles.fontWeight}
                  onChange={(e) => {
                    const newStyles = { ...editingStyles, fontWeight: e.target.value }
                    setEditingStyles(newStyles)
                    applyStyleToIframe(selectedElementId, newStyles)
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base"
                >
                  <option value="100">Thin (100)</option>
                  <option value="200">Extra Light (200)</option>
                  <option value="300">Light (300)</option>
                  <option value="400">Normal (400)</option>
                  <option value="500">Medium (500)</option>
                  <option value="600">Semi Bold (600)</option>
                  <option value="700">Bold (700)</option>
                  <option value="800">Extra Bold (800)</option>
                  <option value="900">Black (900)</option>
                </select>
              </div>

              {/* Text Color */}
              <div>
                <label className="block text-base font-semibold mb-3">텍스트 색상</label>
                <div className="flex gap-3 items-center">
                  <input
                    type="color"
                    value={editingStyles.color}
                    onChange={(e) => {
                      const newStyles = { ...editingStyles, color: e.target.value }
                      setEditingStyles(newStyles)
                      applyStyleToIframe(selectedElementId, newStyles)
                    }}
                    className="w-20 h-12 rounded-lg cursor-pointer"
                  />
                  <input
                    type="text"
                    value={editingStyles.color}
                    onChange={(e) => {
                      const newStyles = { ...editingStyles, color: e.target.value }
                      setEditingStyles(newStyles)
                      applyStyleToIframe(selectedElementId, newStyles)
                    }}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-base"
                    placeholder="#000000"
                  />
                </div>
              </div>

              {/* Background Color */}
              <div>
                <label className="block text-base font-semibold mb-3">배경 색상</label>
                <div className="flex gap-3 items-center">
                  <input
                    type="color"
                    value={editingStyles.backgroundColor}
                    onChange={(e) => {
                      const newStyles = { ...editingStyles, backgroundColor: e.target.value }
                      setEditingStyles(newStyles)
                      applyStyleToIframe(selectedElementId, newStyles)
                    }}
                    className="w-20 h-12 rounded-lg cursor-pointer"
                  />
                  <input
                    type="text"
                    value={editingStyles.backgroundColor}
                    onChange={(e) => {
                      const newStyles = { ...editingStyles, backgroundColor: e.target.value }
                      setEditingStyles(newStyles)
                      applyStyleToIframe(selectedElementId, newStyles)
                    }}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-base"
                    placeholder="transparent"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-500 mb-4">
                  💡 스타일 변경은 실시간으로 미리보기에 반영됩니다. 저장 버튼을 눌러 변경사항을 저장하세요.
                </p>
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full gap-2 bg-orange-500 hover:bg-orange-600 text-white h-12 text-base"
                >
                  <Save className="w-5 h-5" />
                  {saving ? "저장 중..." : "변경사항 저장"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-gray-500">
              <p className="text-lg">미리보기에서 요소를 클릭하여 선택하세요</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
