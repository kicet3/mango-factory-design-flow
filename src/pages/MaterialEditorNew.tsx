// MaterialEditor - elementStyles 기반 스타일 편집 (iframe + Babel 버전)
import { useState, useEffect, useRef } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Layout } from "@/components/layout/Layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card } from "@/components/ui/card"
import { ArrowLeft, Save, RotateCcw, Trash2, Plus, Copy } from "lucide-react"
import { toast } from "sonner"
import { fetchMaterialDetail, updateMaterial } from "@/services/conversions"
import { supabase } from "@/integrations/supabase/client"

export default function MaterialEditorNew() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Component code and data
  const [componentCode, setComponentCode] = useState('')
  const [componentData, setComponentData] = useState<any>(null)
  const [elementStyles, setElementStyles] = useState<any>({})
  const [selectedShape, setSelectedShape] = useState<string | null>(null)

  // Edit mode toggle
  const [editMode, setEditMode] = useState(true) // true = 편집 모드, false = 보기 모드

  // Iframe reference
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // New style property input
  const [newStyleKey, setNewStyleKey] = useState("")
  const [newStyleValue, setNewStyleValue] = useState("")

  useEffect(() => {
    loadMaterialData()
  }, [id])

  // Send editMode to iframe when it changes
  useEffect(() => {
    const sendEditMode = () => {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        console.log('📤 Sending editMode to iframe:', editMode)
        try {
          iframeRef.current.contentWindow.postMessage({
            type: 'setEditMode',
            editMode: editMode
          }, '*')
          console.log('✅ EditMode message sent successfully')
        } catch (error) {
          console.error('❌ Failed to send editMode:', error)
        }
      } else {
        console.warn('⚠️ Iframe not ready, retrying...')
        // Retry after a short delay
        setTimeout(sendEditMode, 100)
      }
    }

    sendEditMode()

    // Clear selection when switching to view mode
    if (!editMode) {
      setSelectedShape(null)
    }
  }, [editMode])

  const loadMaterialData = async () => {
    if (!id) return

    try {
      setLoading(true)

      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token

      const materialDetail = await fetchMaterialDetail(parseInt(id), accessToken)

      console.log("Material Detail:", materialDetail)

      // Get component code from conversion.components
      let layoutComponentName = ''
      if (materialDetail.generated_slides && materialDetail.generated_slides.length > 0) {
        layoutComponentName = materialDetail.generated_slides[0].layout_component
      }

      console.log("Layout Component Name:", layoutComponentName)

      // Find matching component code
      if (materialDetail.conversion && materialDetail.conversion.components) {
        const matchingComponent = materialDetail.conversion.components.find(
          (c: any) => c.component_name === layoutComponentName
        )

        if (matchingComponent) {
          setComponentCode(matchingComponent.code)
          console.log("Found matching component:", matchingComponent.component_name)
        }
      }

      // Get slide data
      let slideData: any = null
      let slideElementStyles: any = null

      if (materialDetail.generated_slides && materialDetail.generated_slides.length > 0) {
        const firstSlide: any = materialDetail.generated_slides[0]

        // Use generated_slides.data directly
        slideData = firstSlide.data || null

        // Get styles from firstSlide.styles
        console.log("First Slide Styles:", firstSlide.styles)
        slideElementStyles = firstSlide.styles || null
      }

      console.log("Slide Data (generated_slides.data):", slideData)
      console.log("Element Styles:", slideElementStyles)

      // Set component data - slideData is already an array, use first element
      if (slideData && Array.isArray(slideData) && slideData.length > 0) {
        setComponentData(slideData[0])
      } else {
        setComponentData(slideData)
      }

      if (slideElementStyles) {
        const modifiedStyles = { ...slideElementStyles }

        // Replace 'fixed' with 'absolute' for container rendering
        Object.keys(modifiedStyles).forEach(key => {
          if (modifiedStyles[key]?.className) {
            modifiedStyles[key].className = modifiedStyles[key].className
              .replace(/\bfixed\b/g, 'absolute')
          }
        })

        console.log("Modified Element Styles:", modifiedStyles)
        setElementStyles(modifiedStyles)
      } else {
        console.warn("No elementStyles found in slide data")
        setElementStyles({})
      }

    } catch (error) {
      console.error("Failed to load material:", error)
      toast.error("자료를 불러오는데 실패했습니다")
    } finally {
      setLoading(false)
    }
  }

  // Render component in iframe whenever data changes
  useEffect(() => {
    console.log("=== useEffect triggered ===")
    console.log("componentCode exists:", !!componentCode)
    console.log("componentData exists:", !!componentData)
    console.log("elementStyles exists:", !!elementStyles)

    if (!componentCode || !componentData) {
      console.log("Skipping render - waiting for data")
      return
    }

    console.log("All ready, rendering...")
    // Add small delay to ensure iframe DOM is ready
    setTimeout(() => {
      renderComponentInIframe()

      // Send current editMode after iframe is rendered
      setTimeout(() => {
        if (iframeRef.current && iframeRef.current.contentWindow) {
          console.log('🔄 Re-sending editMode after iframe render:', editMode)
          iframeRef.current.contentWindow.postMessage({
            type: 'setEditMode',
            editMode: editMode
          }, '*')
        }
      }, 500)
    }, 100)
  }, [componentCode, componentData, elementStyles, editMode])

  const renderComponentInIframe = () => {
    if (!iframeRef.current) return

    try {
      console.log("=== renderComponentInIframe called ===")
      console.log("componentCode length:", componentCode.length)
      console.log("componentData:", componentData)
      console.log("elementStyles keys:", Object.keys(elementStyles))

      const iframeDoc = iframeRef.current.contentDocument
      if (!iframeDoc) return

      // Extract component name - support both function and arrow function
      let componentName = 'Component'

      // Try function declaration: function ComponentName
      let match = componentCode.match(/function\s+(\w+)\s*\(/)
      if (match) {
        componentName = match[1]
      } else {
        // Try arrow function: const ComponentName =
        match = componentCode.match(/const\s+(\w+)\s*=/)
        if (match) {
          componentName = match[1]
        }
      }

      console.log("Component name extracted:", componentName)

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <script src="https://cdn.tailwindcss.com"></script>
          <script crossorigin="anonymous" src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
          <script crossorigin="anonymous" src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
          <script crossorigin="anonymous" src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
          <script>
            console.log('Scripts loading...');
          </script>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              width: 1280px;
              height: 720px;
              overflow: hidden;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            #root {
              width: 100%;
              height: 100%;
            }
            body.edit-mode .editable-shape {
              cursor: pointer;
              transition: outline 0.2s;
            }
            body.edit-mode .editable-shape:hover {
              outline: 2px dashed #3B82F6;
              outline-offset: 2px;
            }
            body.edit-mode .editable-shape.selected {
              outline: 3px solid #2563EB !important;
              outline-offset: 2px;
            }
            body.view-mode .editable-shape {
              cursor: auto;
            }
            #error-display {
              padding: 20px;
              background: #fee;
              color: #c00;
              font-family: monospace;
              white-space: pre-wrap;
              border: 2px solid #c00;
              margin: 20px;
            }
          </style>
        </head>
        <body>
          <div id="root"></div>
          <div id="error-display" style="display: none;"></div>

          <script>
            // Edit mode state - 초기값을 부모로부터 받음
            let currentEditMode = ${editMode};
            console.log('🎬 iframe initialized with editMode:', currentEditMode);

            // Function to update edit mode UI
            function updateEditModeUI(isEditMode) {
              console.log('🎨 Updating UI for editMode:', isEditMode);

              // Update body class
              if (isEditMode) {
                document.body.classList.add('edit-mode');
                document.body.classList.remove('view-mode');
                console.log('  ✓ Applied edit-mode class');
              } else {
                document.body.classList.add('view-mode');
                document.body.classList.remove('edit-mode');
                console.log('  ✓ Applied view-mode class');

                // Remove selection in view mode
                const selectedElements = document.querySelectorAll('.selected');
                console.log(\`  ✓ Removing selection from \${selectedElements.length} elements\`);
                selectedElements.forEach((el) => {
                  el.classList.remove('selected');
                });
              }
            }

            // Set initial UI
            updateEditModeUI(currentEditMode);

            // Listen for editMode changes from parent
            window.addEventListener('message', (event) => {
              console.log('📨 Message received:', event.data);

              if (event.data.type === 'setEditMode') {
                const newEditMode = event.data.editMode;
                console.log(\`🔄 EditMode change request: \${currentEditMode} → \${newEditMode}\`);

                if (currentEditMode !== newEditMode) {
                  currentEditMode = newEditMode;
                  updateEditModeUI(currentEditMode);
                  console.log('✅ EditMode updated successfully');
                } else {
                  console.log('ℹ️ EditMode unchanged, skipping UI update');
                }
              }
            });

            // Send logs to parent window
            const originalLog = console.log;
            const originalError = console.error;
            console.log = function(...args) {
              originalLog.apply(console, args);
              window.parent.postMessage({ type: 'iframe-log', level: 'log', args: args.map(String) }, '*');
            };
            console.error = function(...args) {
              originalError.apply(console, args);
              window.parent.postMessage({ type: 'iframe-log', level: 'error', args: args.map(String) }, '*');
            };

            console.log('=== iframe script executing ===');

            // Wait for all scripts to load
            function checkLibraries() {
              console.log('Checking libraries...');
              console.log('React:', typeof window.React);
              console.log('ReactDOM:', typeof window.ReactDOM);
              console.log('Babel:', typeof window.Babel);

              if (typeof window.React === 'undefined') {
                console.error('React not loaded!');
              }
              if (typeof window.ReactDOM === 'undefined') {
                console.error('ReactDOM not loaded!');
              }
              if (typeof window.Babel === 'undefined') {
                console.error('Babel not loaded!');
              }

              return typeof window.React !== 'undefined' &&
                     typeof window.ReactDOM !== 'undefined' &&
                     typeof window.Babel !== 'undefined';
            }

            // Check immediately
            if (!checkLibraries()) {
              console.log('Waiting for libraries to load...');
              // Check again after a delay
              setTimeout(checkLibraries, 1000);
            }

            window.onerror = function(msg, url, lineNo, columnNo, error) {
              const errorDiv = document.getElementById('error-display');
              if (errorDiv) {
                errorDiv.style.display = 'block';
                errorDiv.textContent = 'Error: ' + msg + '\\nLine: ' + lineNo + '\\n\\n' + (error ? error.stack : '');
              }
              console.error('Global error:', msg, error);
              return false;
            };
          </script>

          <script type="text/babel" data-type="module">
            (function() {
              console.log('Babel script starting...');

              // Wait for React to be available
              function waitForReact() {
                return new Promise((resolve) => {
                  if (typeof React !== 'undefined' && typeof ReactDOM !== 'undefined') {
                    resolve();
                  } else {
                    setTimeout(() => waitForReact().then(resolve), 100);
                  }
                });
              }

              waitForReact().then(() => {
                try {
                  console.log('React available, executing component code...');
                  const { useState, useEffect, useMemo } = React;

                  ${componentCode}

                  console.log('Component code executed');
                  console.log('Component name:', '${componentName}');
                  console.log('Component exists:', typeof ${componentName});

                  const propsData = {
                    data: ${JSON.stringify(componentData)},
                    elementStyles: ${JSON.stringify(elementStyles)}
                  };

                  console.log('Props data prepared');

                  const rootElement = document.getElementById('root');
                  console.log('Root element:', rootElement);

                  if (!rootElement) {
                    throw new Error('Root element not found');
                  }

                  const root = ReactDOM.createRoot(rootElement);
                  console.log('React root created');

                  root.render(React.createElement(${componentName}, propsData));
                  console.log('Render complete!');

                  // Add click handlers after render with retry mechanism
                  const addClickHandlers = () => {
                    console.log('=== Adding click handlers ===');

                    // Set initial edit mode class
                    if (currentEditMode) {
                      document.body.classList.add('edit-mode');
                    } else {
                      document.body.classList.add('view-mode');
                    }

                    const elementStylesObject = ${JSON.stringify(elementStyles)};
                    console.log('📦 Received elementStyles:', elementStylesObject);
                    console.log('📊 Total shapes:', Object.keys(elementStylesObject).length);

                    // ===== data-key 기반 클릭 핸들러 등록 =====
                    // 모든 요소의 data-key 속성을 읽어서 직접 매핑합니다.
                    let totalHandlers = 0;
                    const allElementsWithDataKey = document.querySelectorAll('[data-key]');
                    console.log(\`🔍 Found \${allElementsWithDataKey.length} elements with data-key attribute\`);

                    allElementsWithDataKey.forEach((element, index) => {
                      const dataKey = element.getAttribute('data-key');

                      if (dataKey && elementStylesObject[dataKey]) {
                        // 편집 가능하게 설정
                        element.classList.add('editable-shape');

                        console.log(\`  ✓ Element #\${index}: data-key="\${dataKey}"\`);

                        // 클릭 이벤트 리스너 추가
                        element.addEventListener('click', (e) => {
                          // 편집 모드일 때만 동작
                          if (!currentEditMode) {
                            console.log('⏸️ View mode: click ignored');
                            return;
                          }

                          e.preventDefault();
                          e.stopPropagation();

                          console.log('🖱️ Element clicked!');
                          console.log('  data-key:', dataKey);
                          console.log('  Shape data:', elementStylesObject[dataKey]);

                          // 기존 선택 제거
                          document.querySelectorAll('.selected').forEach(el => {
                            el.classList.remove('selected');
                          });

                          // 현재 요소 선택
                          element.classList.add('selected');

                          // 부모 윈도우에 선택 알림
                          window.parent.postMessage({
                            type: 'shapeSelected',
                            shapeName: dataKey
                          }, '*');
                        });

                        totalHandlers++;
                      } else if (dataKey) {
                        console.warn(\`  ⚠️ Element has data-key="\${dataKey}" but not found in elementStyles\`);
                      }
                    });

                    console.log(\`=== Total click handlers added: \${totalHandlers} ===\`);

                    if (totalHandlers === 0) {
                      console.warn('⚠️ No click handlers were added! Retrying in 1 second...');
                      setTimeout(addClickHandlers, 1000);
                    } else {
                      console.log(\`✅ Click handlers setup complete! \${totalHandlers} elements are now clickable.\`);
                    }
                  };

                  // Try adding handlers after render
                  setTimeout(addClickHandlers, 500);

                } catch (error) {
                  console.error('Component render error:', error);
                  const errorDiv = document.getElementById('error-display');
                  if (errorDiv) {
                    errorDiv.style.display = 'block';
                    errorDiv.textContent = 'Render Error: ' + error.toString() + '\\n\\n' + (error.stack || '');
                  }
                }
              }).catch((error) => {
                console.error('React wait error:', error);
              });
            })();
          </script>
        </body>
        </html>
      `

      // Write to iframe document
      iframeDoc.open()
      iframeDoc.write(htmlContent)
      iframeDoc.close()

      console.log("iframe content written successfully")

    } catch (error) {
      console.error("Failed to render component:", error)
      toast.error("컴포넌트 렌더링 실패")
    }
  }

  // Listen to messages from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      console.log('Message received from iframe:', event.data)

      if (event.data.type === 'shapeSelected') {
        console.log('=== Shape Selection ===')
        console.log('Shape name:', event.data.shapeName)
        console.log('Current elementStyles:', elementStyles)
        console.log('Shape data:', elementStyles[event.data.shapeName])

        setSelectedShape(event.data.shapeName)

        console.log('✅ Selected shape updated!')
      } else if (event.data.type === 'iframe-log') {
        const prefix = `[iframe ${event.data.level}]`
        if (event.data.level === 'error') {
          console.error(prefix, ...event.data.args)
        } else {
          console.log(prefix, ...event.data.args)
        }
      }
    }

    console.log('Message listener attached')
    window.addEventListener('message', handleMessage)
    return () => {
      console.log('Message listener removed')
      window.removeEventListener('message', handleMessage)
    }
  }, [elementStyles])

  const handleSave = async () => {
    if (!id) return

    try {
      setSaving(true)

      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token

      await updateMaterial(
        parseInt(id),
        {
          text_styles: elementStyles
        },
        accessToken
      )

      toast.success("저장되었습니다!")
    } catch (error) {
      console.error("Failed to save:", error)
      toast.error("저장에 실패했습니다")
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    loadMaterialData()
    setSelectedShape(null)
    toast.info("초기 상태로 복원되었습니다")
  }

  const handleBack = () => {
    navigate("/generate-v2/materials")
  }

  const updateShapeStyle = (shapeName: string, styleKey: string, value: any) => {
    console.log(`Updating ${shapeName}.${styleKey} to:`, value)

    // Update state
    setElementStyles((prev: any) => ({
      ...prev,
      [shapeName]: {
        ...prev[shapeName],
        style: {
          ...(prev[shapeName]?.style || {}),
          [styleKey]: value
        }
      }
    }))

    // Update iframe element directly for instant preview
    if (iframeRef.current) {
      const iframeDoc = iframeRef.current.contentDocument
      if (iframeDoc) {
        const elements = iframeDoc.querySelectorAll(`.${shapeName}`)
        elements.forEach((element: any) => {
          element.style[styleKey] = value
        })
      }
    }
  }

  const deleteShapeStyleProperty = (shapeName: string, styleKey: string) => {
    console.log(`Deleting ${shapeName}.${styleKey}`)

    setElementStyles((prev: any) => {
      const newStyles = { ...prev }
      if (newStyles[shapeName]?.style) {
        const updatedStyle = { ...newStyles[shapeName].style }
        delete updatedStyle[styleKey]
        newStyles[shapeName] = {
          ...newStyles[shapeName],
          style: updatedStyle
        }
      }
      return newStyles
    })

    // Remove from iframe element
    if (iframeRef.current) {
      const iframeDoc = iframeRef.current.contentDocument
      if (iframeDoc) {
        const elements = iframeDoc.querySelectorAll(`.${shapeName}`)
        elements.forEach((element: any) => {
          element.style[styleKey] = ''
        })
      }
    }
  }

  const updateShapeClassName = (shapeName: string, newClassName: string) => {
    console.log(`Updating ${shapeName} className to:`, newClassName)

    setElementStyles((prev: any) => ({
      ...prev,
      [shapeName]: {
        ...prev[shapeName],
        className: newClassName
      }
    }))
  }

  const selectedShapeData = selectedShape ? elementStyles[selectedShape] : null

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

            <div className="flex items-center gap-3">
              {/* Edit Mode Toggle */}
              <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg">
                <span className="text-sm font-medium text-gray-700">
                  {editMode ? '편집 모드' : '보기 모드'}
                </span>
                <button
                  onClick={() => setEditMode(!editMode)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    editMode ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      editMode ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <Button variant="outline" onClick={handleReset} className="gap-2">
                <RotateCcw className="w-4 h-4" />
                초기화
              </Button>
            </div>
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
            <p className="text-sm text-gray-500 mt-1">
              {selectedShape ? `편집 중: ${selectedShape}` : '요소를 클릭하여 선택하세요'}
            </p>

            {/* View Mode Warning */}
            {!editMode && (
              <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                <div className="font-semibold mb-1">⚠️ 보기 모드</div>
                <div>현재 보기 모드입니다. 스타일을 편집하려면 상단의 토글을 눌러 <strong>편집 모드</strong>로 전환하세요.</div>
              </div>
            )}
          </div>

          {/* Selected Shape Editor */}
          {selectedShape && selectedShapeData ? (
            <ScrollArea className="h-[calc(100vh-200px)]">
              <div className={`p-6 space-y-4 ${!editMode ? 'opacity-50 pointer-events-none' : ''}`}>
                {/* Success Message */}
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
                  ✓ 요소가 선택되었습니다. 스타일 변경사항이 즉시 반영됩니다.
                </div>

                {/* className Editor */}
                <Card className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold">className</Label>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => {
                        navigator.clipboard.writeText(selectedShapeData.className || '')
                        toast.success('className이 복사되었습니다')
                      }}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <Textarea
                    value={selectedShapeData.className || ""}
                    onChange={(e) => updateShapeClassName(selectedShape, e.target.value)}
                    placeholder="예: flex items-center justify-center"
                    rows={3}
                    className="font-mono text-xs"
                  />
                </Card>

                {/* All Style Properties */}
                <Card className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold">style 속성</Label>
                    <span className="text-xs text-muted-foreground">
                      {Object.keys(selectedShapeData.style || {}).length}개
                    </span>
                  </div>

                  <div className="space-y-2">
                    {Object.entries(selectedShapeData.style || {}).map(([key, value]) => (
                      <div key={key} className="flex gap-2 items-start p-2 bg-muted/50 rounded">
                        <div className="flex-1 space-y-1">
                          <Label className="text-xs font-mono text-muted-foreground">
                            {key}
                          </Label>
                          <Input
                            value={String(value)}
                            onChange={(e) => updateShapeStyle(selectedShape, key, e.target.value)}
                            className="h-8 text-xs font-mono"
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 mt-5 flex-shrink-0"
                          onClick={() => deleteShapeStyleProperty(selectedShape, key)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  {/* Add New Property */}
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
                          if (e.key === 'Enter' && newStyleKey && newStyleValue) {
                            updateShapeStyle(selectedShape, newStyleKey, newStyleValue)
                            setNewStyleKey("")
                            setNewStyleValue("")
                          }
                        }}
                      />
                      <Button
                        size="sm"
                        className="w-full h-8"
                        onClick={() => {
                          if (newStyleKey && newStyleValue) {
                            updateShapeStyle(selectedShape, newStyleKey, newStyleValue)
                            setNewStyleKey("")
                            setNewStyleValue("")
                          }
                        }}
                        disabled={!newStyleKey || !newStyleValue}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        추가
                      </Button>
                    </div>
                  </div>
                </Card>

                {/* Quick Edit Shortcuts */}
                <Card className="p-4 space-y-3">
                  <Label className="text-sm font-semibold">빠른 편집</Label>

                  {/* Color */}
                  <div className="space-y-2">
                    <Label className="text-xs">색상 (color)</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={String(selectedShapeData.style?.color || "#000000")}
                        onChange={(e) => updateShapeStyle(selectedShape, "color", e.target.value)}
                        className="w-16 h-8 cursor-pointer"
                      />
                      <Input
                        value={String(selectedShapeData.style?.color || "")}
                        onChange={(e) => updateShapeStyle(selectedShape, "color", e.target.value)}
                        placeholder="색상"
                        className="flex-1 h-8 text-xs font-mono"
                      />
                    </div>
                  </div>

                  {/* Background */}
                  <div className="space-y-2">
                    <Label className="text-xs">배경 (background)</Label>
                    <Textarea
                      value={String(selectedShapeData.style?.background || "")}
                      onChange={(e) => updateShapeStyle(selectedShape, "background", e.target.value)}
                      placeholder="예: linear-gradient(...)"
                      rows={2}
                      className="text-xs font-mono"
                    />
                  </div>

                  {/* Font Size */}
                  <div className="space-y-2">
                    <Label className="text-xs">글자 크기 (fontSize)</Label>
                    <Input
                      value={String(selectedShapeData.style?.fontSize || "")}
                      onChange={(e) => updateShapeStyle(selectedShape, "fontSize", e.target.value)}
                      placeholder="예: 1.5rem, 24px"
                      className="h-8 text-xs font-mono"
                    />
                  </div>

                  {/* Padding */}
                  <div className="space-y-2">
                    <Label className="text-xs">여백 (padding)</Label>
                    <Input
                      value={String(selectedShapeData.style?.padding || "")}
                      onChange={(e) => updateShapeStyle(selectedShape, "padding", e.target.value)}
                      placeholder="예: 1rem, 16px"
                      className="h-8 text-xs font-mono"
                    />
                  </div>

                  {/* Margin */}
                  <div className="space-y-2">
                    <Label className="text-xs">마진 (margin)</Label>
                    <Input
                      value={String(selectedShapeData.style?.margin || "")}
                      onChange={(e) => updateShapeStyle(selectedShape, "margin", e.target.value)}
                      placeholder="예: 1rem auto"
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                </Card>

                {/* JSON Preview */}
                <Card className="p-4 space-y-2">
                  <Label className="text-xs font-semibold">JSON 미리보기</Label>
                  <pre className="text-xs font-mono bg-muted p-2 rounded overflow-x-auto max-h-40 overflow-y-auto">
                    {JSON.stringify({ [selectedShape]: selectedShapeData }, null, 2)}
                  </pre>
                </Card>

                {/* Save Button */}
                <div className="pt-4">
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full gap-2 h-12 text-base"
                  >
                    <Save className="w-4 h-4" />
                    {saving ? "저장 중..." : "저장하기"}
                  </Button>
                </div>
              </div>
            </ScrollArea>
          ) : (
            <div className="p-6">
              <div className="text-center py-12">
                <div className="text-6xl mb-4">👆</div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  요소를 선택하세요
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  왼쪽 미리보기에서 편집할 요소를 클릭하세요
                </p>
                <div className="bg-gray-50 rounded-lg p-4 text-left text-sm text-gray-600 space-y-2">
                  <div className="font-semibold mb-2">💡 사용 방법:</div>
                  <div>1. 미리보기 화면의 텍스트나 요소에 마우스를 올리면 파란색 테두리가 표시됩니다</div>
                  <div>2. 편집하고 싶은 요소를 클릭하세요</div>
                  <div>3. 선택된 요소는 진한 파란색 테두리로 표시됩니다</div>
                  <div>4. 오른쪽 편집 패널에서 스타일을 변경할 수 있습니다</div>
                  <div>5. 변경사항은 즉시 미리보기에 반영됩니다</div>
                </div>
                {!componentCode && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                    ⚠️ 컴포넌트 코드가 로드되지 않았습니다. 페이지를 새로고침해주세요.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
